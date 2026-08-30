const DEFAULT_POLICY = [
  'Reorder only the supplied candidates. Never introduce another player.',
  'Respect deterministic eligibility and roster caps. The deterministic engine remains authoritative for who is eligible.',
  'QB1/QB2 prioritize reliable starter quality and consensus; QB3 may favor upside.',
  'RB1/RB2 prioritize starter quality; RB3/RB4 may favor ceiling and breakout paths; RB5+ requires exceptional value.',
  'WR1-WR3 prioritize starter quality; WR4+ may favor ceiling and breakout paths.',
  'TE2 is value/insurance, not a default priority.',
  'DST and K remain subject to deterministic round gates.',
  'Prefer the candidate that best improves this roster now when deterministic scores are close.',
];

function normalizePosition(position) {
  return position === 'D/ST' ? 'DST' : position;
}

function rosterCounts(draftedPicks, myTeamName) {
  const counts = {};
  for (const pick of draftedPicks || []) {
    if (pick.fantasyTeam !== myTeamName) continue;
    const position = normalizePosition(pick.position);
    counts[position] = (counts[position] || 0) + 1;
  }
  return counts;
}

function candidatePayload(player, deterministicRank) {
  return {
    playerId: player.id,
    playerName: player.name,
    position: player.position,
    deterministicRank,
    draftScore: player.draftScore,
    consensusRank: player.consensusRank,
    consensusValue: player.consensusValue,
    projectedPoints: player.projectedPoints,
    averageDraftPosition: player.averageDraftPosition,
    marketGap: player.marketGap,
    positionPriority: player.positionPriority,
    upside: player.components?.upside,
    upsideBase: player.components?.upsideBase,
    upsideMultiplier: player.components?.upsideMultiplier,
    vor: player.components?.vor,
    withinPositionValue: player.components?.withinPositionValue,
    tierDrop: player.components?.tierDrop,
    waitRisk: player.components?.waitRisk,
    byeWeek: player.byeWeek,
  };
}

export function buildAiRerankPayload({
  scoredPlayers,
  draftedPicks,
  myTeamName,
  config,
  candidateLimit = 8,
}) {
  const candidates = scoredPlayers.slice(0, candidateLimit);
  const counts = rosterCounts(draftedPicks, myTeamName);
  const myRoster = (draftedPicks || [])
    .filter((pick) => pick.fantasyTeam === myTeamName)
    .map((pick) => ({
      playerId: pick.playerId,
      playerName: pick.playerName,
      position: normalizePosition(pick.position),
      overallPick: pick.overallPick,
    }));

  return {
    task: 'Rerank these fantasy-football draft candidates for the current roster state.',
    rules: DEFAULT_POLICY,
    responseFormat: {
      rankings: [
        { playerId: 'candidate playerId', reason: 'short reason', confidence: 0.0 },
      ],
      summary: 'optional short explanation',
    },
    league: {
      teams: config.teams,
      draftType: config.draftType,
      roster: config.roster,
      scoring: config.scoring,
    },
    draftContext: {
      currentRound: scoredPlayers.currentRound ?? candidates[0]?.currentRound ?? null,
      nextPick: scoredPlayers.nextPick ?? candidates[0]?.nextPick ?? null,
      followingPick: scoredPlayers.followingPick ?? candidates[0]?.followingPick ?? null,
      picksUntilFollowing: scoredPlayers.picksUntilFollowing ?? candidates[0]?.picksUntilFollowing ?? null,
      rosterCounts: counts,
      myRoster,
    },
    candidates: candidates.map((player, index) => candidatePayload(player, index + 1)),
  };
}

function normalizeRankingItems(response) {
  if (Array.isArray(response)) {
    return response.map((item) => typeof item === 'object' ? item : { playerId: item });
  }
  if (Array.isArray(response?.rankings)) return response.rankings;
  return [];
}

export function applyAiRerank(scoredPlayers, response, candidateLimit = 8) {
  const candidateSlice = scoredPlayers.slice(0, candidateLimit);
  const tail = scoredPlayers.slice(candidateLimit);
  const candidateById = new Map(candidateSlice.map((player) => [String(player.id), player]));
  const used = new Set();
  const reranked = [];
  const decisions = [];

  for (const item of normalizeRankingItems(response)) {
    const key = String(item?.playerId ?? '');
    if (!candidateById.has(key) || used.has(key)) continue;
    const player = candidateById.get(key);
    used.add(key);
    reranked.push(player);
    decisions.push({
      playerId: player.id,
      playerName: player.name,
      reason: typeof item?.reason === 'string' ? item.reason : null,
      confidence: Number.isFinite(Number(item?.confidence)) ? Number(item.confidence) : null,
    });
  }

  for (const player of candidateSlice) {
    const key = String(player.id);
    if (used.has(key)) continue;
    reranked.push(player);
    decisions.push({ playerId: player.id, playerName: player.name, reason: null, confidence: null });
  }

  const combined = [...reranked, ...tail];
  for (const key of ['positionPriorities', 'currentRound', 'phaseWeights', 'nextPick', 'followingPick', 'picksUntilFollowing']) {
    combined[key] = scoredPlayers[key];
  }

  return {
    scoredPlayers: combined,
    decisions: decisions.map((decision, index) => ({ ...decision, aiRank: index + 1 })),
    summary: typeof response?.summary === 'string' ? response.summary : null,
  };
}

async function endpointProvider(endpoint, payload, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(`AI reranker timed out after ${timeoutMs}ms`)), timeoutMs);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const text = await response.text();
    let body = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = null;
      }
    }

    if (!response.ok) {
      const detail = body?.error || text || `HTTP ${response.status}`;
      throw new Error(`AI reranker endpoint returned ${response.status}: ${detail}`);
    }

    if (!body) throw new Error('AI reranker endpoint returned an empty or invalid JSON response.');
    return body;
  } finally {
    clearTimeout(timer);
  }
}

export async function rerankWithAi({
  scoredPlayers,
  draftedPicks,
  myTeamName,
  config,
  provider = null,
}) {
  const settings = config.strategy?.aiReranker || {};
  const candidateLimit = settings.candidateLimit ?? 8;
  if (settings.enabled === false) {
    return { status: 'disabled', scoredPlayers, payload: null, decisions: [], summary: null };
  }

  const payload = buildAiRerankPayload({
    scoredPlayers,
    draftedPicks,
    myTeamName,
    config,
    candidateLimit,
  });

  const effectiveProvider = typeof provider === 'function'
    ? provider
    : settings.endpoint
      ? (input) => endpointProvider(settings.endpoint, input, settings.timeoutMs ?? 10000)
      : null;

  if (!effectiveProvider) {
    return { status: 'unavailable', scoredPlayers, payload, decisions: [], summary: null };
  }

  try {
    const response = await effectiveProvider(payload);
    const applied = applyAiRerank(scoredPlayers, response, candidateLimit);
    return {
      status: 'applied',
      payload,
      rawResponse: response,
      ...applied,
    };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
      scoredPlayers,
      payload,
      decisions: [],
      summary: null,
    };
  }
}
