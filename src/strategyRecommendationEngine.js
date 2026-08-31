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
    if (violatesSkillPositionTeamDiversity(scored[index], occupied)) scored.splice(index, 1);
  }

  for (const player of scored) {
    const position = normalizePosition(player.position);
    const have = counts[position] || 0;
    const baseUpside = Number(player.components.upside || 0);
    const multiplier = depthUpsideMultiplier(position, have, config);
    const adjustedUpside = Math.max(0, Math.min(100, baseUpside * multiplier));
    const saturation = Number(player.saturationMultiplier ?? 1);
    const delta = (adjustedUpside - baseUpside) * upsideWeight * saturation;

    player.draftScore = Number((player.draftScore + delta).toFixed(2));
    player.components.upsideBase = baseUpside;
    player.components.upsideMultiplier = multiplier;
    player.components.upside = adjustedUpside;
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
