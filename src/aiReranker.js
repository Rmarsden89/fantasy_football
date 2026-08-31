const DEFAULT_POLICY = [
  'Reorder only the supplied candidates and turn plans. Never introduce another player or plan.',
  'Respect deterministic eligibility and roster caps. The deterministic engine remains authoritative for who is eligible.',
  'Treat this as a two-pick snake-turn decision when turn plans are supplied: recommend both picks together, not only the first player.',
  'QB1/QB2 prioritize reliable starter quality and consensus; QB3 may favor upside.',
  'RB1/RB2 prioritize starter quality; RB3/RB4 may favor ceiling and breakout paths; RB5+ requires exceptional value.',
  'WR1-WR3 prioritize starter quality; WR4+ may favor ceiling and breakout paths.',
  'TE2 is value/insurance, not a default priority.',
  'DST and K remain subject to deterministic round gates.',
  'Prefer the turn plan that best improves this roster now when deterministic scores are close.',
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

function latestDraftPick(draftedPicks) {
  let latest = null;
  for (const pick of draftedPicks || []) {
    const overallPick = Number(pick?.overallPick);
    if (!Number.isFinite(overallPick)) continue;
    if (!latest || overallPick > Number(latest.overallPick)) latest = pick;
  }
  return latest;
}

export function isSecondPickOfSnakeTurn({ scoredPlayers, draftedPicks, config }) {
  if (String(config?.draftType || '').toUpperCase() !== 'SNAKE') return false;
  const latest = latestDraftPick(draftedPicks);
  if (!latest || latest.fantasyTeam !== config?.myTeamName) return false;
  const nextPick = Number(scoredPlayers?.nextPick ?? scoredPlayers?.[0]?.nextPick);
  const latestOverallPick = Number(latest.overallPick);
  return Number.isFinite(nextPick) && Number.isFinite(latestOverallPick) && nextPick === latestOverallPick + 1;
}

export function shouldRunAiRerank({ scoredPlayers, draftedPicks, config }) {
  if (String(config?.draftType || '').toUpperCase() !== 'SNAKE') return false;
  const nextPick = Number(scoredPlayers?.nextPick ?? scoredPlayers?.[0]?.nextPick);
  if (!Number.isFinite(nextPick)) return false;
  const latest = latestDraftPick(draftedPicks);
  const latestOverallPick = Number(latest?.overallPick ?? 0);
  const onClock = nextPick === latestOverallPick + 1;
  if (!onClock) return false;
  return !isSecondPickOfSnakeTurn({ scoredPlayers, draftedPicks, config });
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

function pairPayload(pair, index) {
  return {
    pairId: `pair-${index + 1}`,
    deterministicPairRank: index + 1,
    firstPlayerId: pair.first.id,
    firstPlayerName: pair.first.name,
    firstPosition: pair.first.position,
    secondPlayerId: pair.second.id,
    secondPlayerName: pair.second.name,
    secondPosition: pair.second.position,
    firstScore: pair.first.draftScore,
    secondScoreAfterFirst: pair.secondScoreAfterFirst,
    pairScore: pair.pairScore,
  };
}

export function buildAiRerankPayload({
  scoredPlayers,
  pairs = [],
  draftedPicks,
  myTeamName,
  config,
  candidateLimit = 8,
  pairLimit = 5,
}) {
  const candidates = scoredPlayers.slice(0, candidateLimit);
  const turnPairs = pairs.slice(0, pairLimit).map(pairPayload);
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
    task: turnPairs.length
      ? 'Rerank these two-pick snake-turn plans. Return the best complete pair plan, plus a supporting player ranking.'
      : 'Rerank these fantasy-football draft candidates for the current roster state.',
    rules: DEFAULT_POLICY,
    responseFormat: {
      pairRankings: [{ pairId: 'supplied pairId', reason: 'short turn-level reason', confidence: 0.0 }],
      rankings: [{ playerId: 'candidate playerId', reason: 'short reason', confidence: 0.0 }],
      summary: 'state the recommended first AND second pick when turn plans are supplied',
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
    turnPairs,
  };
}

function normalizeRankingItems(response) {
  if (Array.isArray(response)) return response.map((item) => typeof item === 'object' ? item : { playerId: item });
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
  for (const key of ['positionPriorities', 'currentRound', 'phaseWeights', 'nextPick', 'followingPick', 'picksUntilFollowing']) combined[key] = scoredPlayers[key];

  return {
    scoredPlayers: combined,
    decisions: decisions.map((decision, index) => ({ ...decision, aiRank: index + 1 })),
    summary: typeof response?.summary === 'string' ? response.summary : null,
  };
}

function applyAiPairRerank(pairs, response, pairLimit = 5) {
  const supplied = pairs.slice(0, pairLimit).map((pair, index) => ({ pair, pairId: `pair-${index + 1}`, deterministicPairRank: index + 1 }));
  const byId = new Map(supplied.map((item) => [item.pairId, item]));
  const used = new Set();
  const pairDecisions = [];

  for (const item of response?.pairRankings || []) {
    const key = String(item?.pairId ?? '');
    if (!byId.has(key) || used.has(key)) continue;
    const entry = byId.get(key);
    used.add(key);
    pairDecisions.push({
      pairId: key,
      aiPairRank: pairDecisions.length + 1,
      deterministicPairRank: entry.deterministicPairRank,
      firstPlayerId: entry.pair.first.id,
      firstPlayerName: entry.pair.first.name,
      firstPosition: entry.pair.first.position,
      secondPlayerId: entry.pair.second.id,
      secondPlayerName: entry.pair.second.name,
      secondPosition: entry.pair.second.position,
      pairScore: entry.pair.pairScore,
      reason: typeof item?.reason === 'string' ? item.reason : null,
      confidence: Number.isFinite(Number(item?.confidence)) ? Number(item.confidence) : null,
    });
  }

  for (const entry of supplied) {
    if (used.has(entry.pairId)) continue;
    pairDecisions.push({
      pairId: entry.pairId,
      aiPairRank: pairDecisions.length + 1,
      deterministicPairRank: entry.deterministicPairRank,
      firstPlayerId: entry.pair.first.id,
      firstPlayerName: entry.pair.first.name,
      firstPosition: entry.pair.first.position,
      secondPlayerId: entry.pair.second.id,
      secondPlayerName: entry.pair.second.name,
      secondPosition: entry.pair.second.position,
      pairScore: entry.pair.pairScore,
      reason: null,
      confidence: null,
    });
  }
  return pairDecisions;
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
      try { body = JSON.parse(text); } catch { body = null; }
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

export async function rerankWithAi({ scoredPlayers, pairs = [], draftedPicks, myTeamName, config, provider = null }) {
  const settings = config.strategy?.aiReranker || {};
  const candidateLimit = settings.candidateLimit ?? 8;
  const pairLimit = settings.pairLimit ?? 5;
  if (settings.enabled === false) return { status: 'disabled', scoredPlayers, payload: null, decisions: [], pairDecisions: [], summary: null };

  if (isSecondPickOfSnakeTurn({ scoredPlayers, draftedPicks, config })) {
    return { status: 'skipped_pair_followup', scoredPlayers, payload: null, decisions: [], pairDecisions: [], summary: null };
  }
  if (!shouldRunAiRerank({ scoredPlayers, draftedPicks, config })) {
    return { status: 'skipped_not_on_clock', scoredPlayers, payload: null, decisions: [], pairDecisions: [], summary: null };
  }

  const payload = buildAiRerankPayload({ scoredPlayers, pairs, draftedPicks, myTeamName, config, candidateLimit, pairLimit });
  const effectiveProvider = typeof provider === 'function'
    ? provider
    : settings.endpoint
      ? (input) => endpointProvider(settings.endpoint, input, settings.timeoutMs ?? 10000)
      : null;
  if (!effectiveProvider) return { status: 'unavailable', scoredPlayers, payload, decisions: [], pairDecisions: [], summary: null };

  try {
    const response = await effectiveProvider(payload);
    const applied = applyAiRerank(scoredPlayers, response, candidateLimit);
    const pairDecisions = applyAiPairRerank(pairs, response, pairLimit);
    return { status: 'applied', payload, rawResponse: response, pairDecisions, ...applied };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
      scoredPlayers,
      payload,
      decisions: [],
      pairDecisions: [],
      summary: null,
    };
  }
}
