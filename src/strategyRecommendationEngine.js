import {
  buildDraftState,
  computePositionPriorities,
  getPicksUntilNextTurn,
  summarizeRoster,
  scoreAvailablePlayers as baseScoreAvailablePlayers,
} from './recommendationEngine.js';

const TEAM_DIVERSITY_POSITIONS = new Set(['RB', 'WR', 'TE']);

function normalizePosition(position) {
  return position === 'D/ST' ? 'DST' : position;
}

function normalizeNflTeam(team) {
  return typeof team === 'string' ? team.trim().toUpperCase() : '';
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function rosterCounts(draftedPicks, myTeamName) {
  return draftedPicks
    .filter((pick) => pick.fantasyTeam === myTeamName)
    .reduce((counts, pick) => {
      const position = normalizePosition(pick.position);
      counts[position] = (counts[position] || 0) + 1;
      return counts;
    }, {});
}

function occupiedSkillPositionTeams(draftedPicks, myTeamName) {
  const occupied = new Set();
  for (const pick of draftedPicks || []) {
    if (pick.fantasyTeam !== myTeamName) continue;
    const position = normalizePosition(pick.position);
    const nflTeam = normalizeNflTeam(pick.nflTeam);
    if (!TEAM_DIVERSITY_POSITIONS.has(position) || !nflTeam) continue;
    occupied.add(`${position}|${nflTeam}`);
  }
  return occupied;
}

function violatesSkillPositionTeamDiversity(player, occupied) {
  const position = normalizePosition(player.position);
  const nflTeam = normalizeNflTeam(player.nflTeam);
  if (!TEAM_DIVERSITY_POSITIONS.has(position) || !nflTeam) return false;
  return occupied.has(`${position}|${nflTeam}`);
}

function depthUpsideMultiplier(position, have, config) {
  const rules = config.strategy.depthUpside?.[position] || [];
  const match = rules.find((rule) => have >= (rule.minHave ?? 0) && have <= (rule.maxHave ?? Infinity));
  return match?.multiplier ?? 1;
}

function normalizedAvailabilityStatus(status) {
  const raw = String(status || '').trim().toLowerCase().replaceAll('-', '_').replaceAll(' ', '_');
  if (!raw || ['active', 'healthy', 'normal'].includes(raw)) return 'normal';
  if (raw.includes('questionable')) return 'questionable';
  if (raw.includes('doubtful')) return 'doubtful';
  if (raw === 'out' || raw.includes('inactive')) return 'out';
  if (raw.includes('injured_reserve') || raw === 'ir' || raw.includes('reserve_injured')) return 'ir';
  if (raw.includes('suspend')) return 'suspended';
  if (raw.includes('exempt') || raw.includes('pup') || raw.includes('nfi')) return 'high_risk';
  return 'normal';
}

function availabilityOverride(player, config) {
  const overrides = config.strategy.playerAvailability?.overrides || {};
  const byId = overrides[String(player.id)];
  const byExactName = overrides[player.name];
  const byLowerName = overrides[String(player.name || '').toLowerCase()];
  const override = byId ?? byExactName ?? byLowerName ?? null;
  if (typeof override === 'string') return { status: override };
  return override && typeof override === 'object' ? override : null;
}

function playerAvailability(player, config) {
  const settings = config.strategy.playerAvailability || {};
  const override = availabilityOverride(player, config);
  const status = normalizedAvailabilityStatus(override?.status ?? player.injuryStatus);
  const configured = settings.statusMultipliers?.[status];
  const multiplier = Number.isFinite(Number(override?.multiplier))
    ? Number(override.multiplier)
    : (Number.isFinite(Number(configured)) ? Number(configured) : 1);
  return {
    status,
    multiplier: Math.max(0, Math.min(multiplier, 1)),
    reason: override?.reason || (status !== 'normal' ? `ESPN status: ${player.injuryStatus || status}` : null),
    updatedAt: override?.updatedAt || player.lastNewsDate || null,
    excluded: (settings.excludeStatuses || []).map(normalizedAvailabilityStatus).includes(status),
  };
}

function qb2QualityAdjustment(player, counts, scored, config) {
  if (normalizePosition(player.position) !== 'QB') return { score: null, multiplier: 1, penalty: 0 };
  if ((counts.QB || 0) !== Math.max((config.roster.QB || 0) - 1, 0)) {
    return { score: null, multiplier: 1, penalty: 0 };
  }

  const gate = config.strategy.quarterbackStrategy?.qb2QualityGate;
  if (!gate) return { score: null, multiplier: 1, penalty: 0 };

  const quality = clamp(Number(player.components?.withinPositionValue ?? player.consensusValue ?? 50));
  const minimum = Number(gate.minimum ?? 48);
  const fullCredit = Math.max(Number(gate.fullCredit ?? 78), minimum + 1);
  const floor = Number(gate.minimumMultiplier ?? 0.45);
  const multiplier = quality >= fullCredit
    ? 1
    : quality <= minimum
      ? floor
      : floor + ((quality - minimum) / (fullCredit - minimum)) * (1 - floor);

  const positionWeight = Number(scored.phaseWeights?.positionPriority || 0);
  const positionContribution = Number(player.positionPriority || 0) * positionWeight;
  return {
    score: Number(quality.toFixed(2)),
    multiplier: Number(multiplier.toFixed(3)),
    penalty: Math.max(0, positionContribution * (1 - multiplier)),
  };
}

function resort(scored, config) {
  const waitRiskWindow = config.strategy.decisionContext?.waitRiskScoreWindow ?? 0.75;
  const byeWindow = config.strategy.byeTiebreaker?.scoreWindow ?? 0.75;
  const upsideTiebreakStartsRound = config.strategy.decisionContext?.upsideTiebreakStartsRound ?? 7;
  const currentRound = scored.currentRound ?? 1;

  scored.sort((a, b) => {
    const delta = b.draftScore - a.draftScore;
    if (Math.abs(delta) > waitRiskWindow) return delta;

    const waitDelta = b.components.waitRisk - a.components.waitRisk;
    if (waitDelta !== 0) return waitDelta;

    if (Math.abs(delta) <= byeWindow) {
      const byeDelta = b.components.byeTiebreak - a.components.byeTiebreak;
      if (byeDelta !== 0) return byeDelta;
    }

    if (currentRound >= upsideTiebreakStartsRound) {
      const upsideDelta = b.components.upside - a.components.upside;
      if (upsideDelta !== 0) return upsideDelta;
    }

    return delta;
  });
}

export function scoreAvailablePlayers(args) {
  const scored = baseScoreAvailablePlayers(args);
  const { draftedPicks, myTeamName, config } = args;
  const counts = rosterCounts(draftedPicks, myTeamName);
  const occupied = occupiedSkillPositionTeams(draftedPicks, myTeamName);
  const upsideWeight = Number(scored.phaseWeights?.upside || 0);

  for (let index = scored.length - 1; index >= 0; index -= 1) {
    const player = scored[index];
    const availability = playerAvailability(player, config);
    if (violatesSkillPositionTeamDiversity(player, occupied) || availability.excluded) {
      scored.splice(index, 1);
    }
  }

  for (const player of scored) {
    const position = normalizePosition(player.position);
    const have = counts[position] || 0;
    const baseUpside = Number(player.components.upside || 0);
    const multiplier = depthUpsideMultiplier(position, have, config);
    const adjustedUpside = Math.max(0, Math.min(100, baseUpside * multiplier));
    const saturation = Number(player.saturationMultiplier ?? 1);
    const upsideDelta = (adjustedUpside - baseUpside) * upsideWeight * saturation;
    const qb2 = qb2QualityAdjustment(player, counts, scored, config);
    const availability = playerAvailability(player, config);

    const preAvailabilityScore = player.draftScore + upsideDelta - qb2.penalty;
    player.draftScore = Number((preAvailabilityScore * availability.multiplier).toFixed(2));
    player.availabilityStatus = availability.status;
    player.availabilityMultiplier = availability.multiplier;
    player.availabilityReason = availability.reason;
    player.availabilityUpdatedAt = availability.updatedAt;
    player.components.upsideBase = baseUpside;
    player.components.upsideMultiplier = multiplier;
    player.components.upside = adjustedUpside;
    player.components.qb2QualityScore = qb2.score;
    player.components.qb2QualityMultiplier = qb2.multiplier;
    player.components.qb2QualityPenalty = Number(qb2.penalty.toFixed(2));
  }

  resort(scored, config);
  return scored;
}

function simulatedPick(player, overallPick, myTeamName, config) {
  const round = Math.floor((overallPick - 1) / config.teams) + 1;
  const roundPick = ((overallPick - 1) % config.teams) + 1;
  return {
    overallPick,
    round,
    roundPick,
    playerId: player.id,
    playerName: player.name,
    nflTeam: player.nflTeam,
    position: player.position,
    fantasyTeam: myTeamName,
    simulated: true,
  };
}

function blockSecondQbForStarterTurn({ first, second, countsBefore, secondBoard, currentRound, config }) {
  if (normalizePosition(first.position) !== 'QB' || normalizePosition(second.position) !== 'QB') return false;
  const requiredQbs = config.roster.QB || 0;
  if ((countsBefore.QB || 0) !== requiredQbs - 1) return false;

  const guard = config.strategy.quarterbackStrategy?.pairGuard || {};
  if (currentRound >= (guard.blockSecondQbBeforeRound ?? 11)) return false;

  const bestNonQb = secondBoard.find((player) => normalizePosition(player.position) !== 'QB');
  const exceptionalConsensus = Number(second.consensusValue || 0) >= (guard.exceptionalConsensusValue ?? 90);
  const exceptionalScore = bestNonQb && second.draftScore >= bestNonQb.draftScore + (guard.exceptionalDraftScoreGap ?? 4);
  return !(exceptionalConsensus || exceptionalScore);
}

export function recommendPairs({
  scoredPlayers,
  players,
  draftedPicks,
  myTeamName,
  config,
  myOverallPicks = [],
  limit = 14,
  secondCandidateLimit = 8,
}) {
  const nextPick = scoredPlayers.nextPick ?? scoredPlayers[0]?.nextPick ?? null;
  if (!Number.isFinite(nextPick)) return [];

  const followingPick = myOverallPicks.find((pick) => pick > nextPick) ?? null;
  if (followingPick !== nextPick + 1) return [];

  const firstCandidates = scoredPlayers.slice(0, limit);
  const pairs = [];
  const countsBefore = rosterCounts(draftedPicks, myTeamName);
  const currentRound = scoredPlayers.currentRound ?? Math.floor((nextPick - 1) / config.teams) + 1;

  for (const first of firstCandidates) {
    const simulatedDraft = [
      ...draftedPicks,
      simulatedPick(first, nextPick, myTeamName, config),
    ];
    const secondBoard = scoreAvailablePlayers({
      players,
      draftedPicks: simulatedDraft,
      myTeamName,
      config,
      myOverallPicks,
    });

    for (const second of secondBoard.slice(0, secondCandidateLimit)) {
      if (second.id === first.id) continue;
      if (blockSecondQbForStarterTurn({ first, second, countsBefore, secondBoard, currentRound, config })) continue;
      let synergy = 0;
      if (first.position !== second.position) synergy += 2;
      if (['DST', 'K'].includes(first.position) || ['DST', 'K'].includes(second.position)) synergy -= 15;
      const pairScore = first.draftScore + second.draftScore + synergy;
      pairs.push({
        first,
        second,
        pairScore: Number(pairScore.toFixed(2)),
        secondScoreAfterFirst: second.draftScore,
        simulatedAfterFirst: true,
      });
    }
  }

  return pairs.sort((a, b) => b.pairScore - a.pairScore);
}

export { buildDraftState, computePositionPriorities, getPicksUntilNextTurn, summarizeRoster };
