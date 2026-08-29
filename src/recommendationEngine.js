const STARTER_SLOTS = ['QB', 'QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX'];

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function sortByPosition(players) {
  return players.reduce((groups, player) => {
    (groups[player.position] ||= []).push(player);
    return groups;
  }, {});
}

function rosterCounts(picks) {
  return picks.reduce((counts, pick) => {
    const position = pick.position === 'D/ST' ? 'DST' : pick.position;
    counts[position] = (counts[position] || 0) + 1;
    return counts;
  }, {});
}

function baseValue(player, maxProjection) {
  if (Number.isFinite(player.projectedPoints) && maxProjection > 0) {
    return clamp((player.projectedPoints / maxProjection) * 100);
  }
  if (Number.isFinite(player.espnRank)) {
    return clamp(101 - player.espnRank);
  }
  return 0;
}

function valueOverReplacement(player, positionPlayers, replacementRank) {
  if (!Number.isFinite(player.projectedPoints)) return 50;

  const sorted = [...positionPlayers]
    .filter((p) => Number.isFinite(p.projectedPoints))
    .sort((a, b) => b.projectedPoints - a.projectedPoints);

  if (!sorted.length) return 50;

  const replacementIndex = Math.min(Math.max(replacementRank - 1, 0), sorted.length - 1);
  const replacement = sorted[replacementIndex]?.projectedPoints ?? 0;
  const best = sorted[0]?.projectedPoints ?? replacement;
  const range = Math.max(best - replacement, 1);
  return clamp(((player.projectedPoints - replacement) / range) * 100);
}

function scarcityScore(player, availableByPosition, config) {
  const startersNeeded = {
    QB: config.teams * config.roster.QB,
    RB: config.teams * config.roster.RB,
    WR: config.teams * config.roster.WR,
    TE: config.teams * config.roster.TE,
    DST: config.teams * config.roster.DST,
    K: config.teams * config.roster.K,
  };

  const remaining = availableByPosition[player.position]?.length || 1;
  const demand = startersNeeded[player.position] || config.teams;
  return clamp((demand / remaining) * 100);
}

function rosterNeedScore(player, myPicks, config) {
  const counts = rosterCounts(myPicks);
  const needs = {
    QB: config.roster.QB,
    RB: config.roster.RB,
    WR: config.roster.WR,
    TE: config.roster.TE,
    DST: config.roster.DST,
    K: config.roster.K,
  };

  const required = needs[player.position] || 0;
  const have = counts[player.position] || 0;

  if (have < required) return 100;

  if (['RB', 'WR', 'TE'].includes(player.position)) {
    const flexFilled = Math.max(
      0,
      (counts.RB || 0) - config.roster.RB +
        (counts.WR || 0) - config.roster.WR +
        (counts.TE || 0) - config.roster.TE,
    );
    if (flexFilled < config.roster.FLEX) return 75;
  }

  if (player.position === 'QB' && have < 3) return 60;
  if (['RB', 'WR'].includes(player.position)) return 50;
  if (player.position === 'TE' && have < 2) return 40;
  return 15;
}

function tierDropScore(player, availableByPosition) {
  const group = [...(availableByPosition[player.position] || [])]
    .filter((p) => Number.isFinite(p.projectedPoints))
    .sort((a, b) => b.projectedPoints - a.projectedPoints);

  const index = group.findIndex((p) => p.id === player.id);
  if (index < 0 || index === group.length - 1) return 50;

  const current = group[index].projectedPoints;
  const next = group[index + 1]?.projectedPoints ?? current;
  const leader = group[0]?.projectedPoints ?? current;
  const floor = group.at(-1)?.projectedPoints ?? next;
  const range = Math.max(leader - floor, 1);
  return clamp(((current - next) / range) * 500);
}

function estimateTurnRisk(player, picksUntilNextTurn, availableByPosition, opponentNeeds = {}) {
  if (!Number.isFinite(picksUntilNextTurn) || picksUntilNextTurn <= 0) return 100;

  const group = availableByPosition[player.position] || [];
  const rankWithinPosition = group.findIndex((p) => p.id === player.id) + 1;
  const needPressure = opponentNeeds[player.position] ?? 0.5;
  const expectedPositionPicks = Math.max(1, picksUntilNextTurn * needPressure);

  if (rankWithinPosition <= expectedPositionPicks) return 95;

  const distance = rankWithinPosition - expectedPositionPicks;
  return clamp(95 - distance * 12, 5, 95);
}

export function buildDraftState({ players, draftedPicks, myTeamName }) {
  const draftedIds = new Set(draftedPicks.filter((pick) => pick.playerId).map((pick) => pick.playerId));
  const draftedNames = new Set(draftedPicks.map((pick) => pick.playerName.toLowerCase()));

  const available = players.filter(
    (player) => !draftedIds.has(player.id) && !draftedNames.has(player.name?.toLowerCase()),
  );

  const myPicks = draftedPicks.filter((pick) => pick.fantasyTeam === myTeamName);

  return {
    available,
    myPicks,
    draftedPicks,
    lastOverallPick: draftedPicks.at(-1)?.overallPick || 0,
  };
}

export function getPicksUntilNextTurn(lastOverallPick, myOverallPicks) {
  const next = myOverallPicks.find((pick) => pick > lastOverallPick);
  if (!next) return { nextPick: null, picksUntil: null };
  return { nextPick: next, picksUntil: Math.max(next - lastOverallPick - 1, 0) };
}

export function scoreAvailablePlayers({
  players,
  draftedPicks,
  myTeamName,
  config,
  myOverallPicks = [],
  opponentNeeds = {},
}) {
  const state = buildDraftState({ players, draftedPicks, myTeamName });
  const availableByPosition = sortByPosition(
    [...state.available].sort((a, b) => (b.projectedPoints ?? 0) - (a.projectedPoints ?? 0)),
  );
  const maxProjection = Math.max(...state.available.map((p) => p.projectedPoints || 0), 1);
  const turn = getPicksUntilNextTurn(state.lastOverallPick, myOverallPicks);
  const weights = config.strategy.weights;

  return state.available
    .map((player) => {
      const components = {
        baseValue: baseValue(player, maxProjection),
        vor: valueOverReplacement(
          player,
          availableByPosition[player.position] || [],
          config.strategy.replacementRanks[player.position] || 8,
        ),
        scarcity: scarcityScore(player, availableByPosition, config),
        rosterNeed: rosterNeedScore(player, state.myPicks, config),
        tierDrop: tierDropScore(player, availableByPosition),
        turnRisk: estimateTurnRisk(
          player,
          turn.picksUntil,
          availableByPosition,
          opponentNeeds,
        ),
      };

      const draftScore = Object.entries(weights).reduce(
        (total, [key, weight]) => total + (components[key] || 0) * weight,
        0,
      );

      return {
        ...player,
        draftScore: Number(draftScore.toFixed(2)),
        components,
        nextPick: turn.nextPick,
        picksUntilNextTurn: turn.picksUntil,
      };
    })
    .sort((a, b) => b.draftScore - a.draftScore);
}

export function recommendPairs(scoredPlayers, limit = 12) {
  const candidates = scoredPlayers.slice(0, limit);
  const pairs = [];

  for (let i = 0; i < candidates.length; i += 1) {
    for (let j = i + 1; j < candidates.length; j += 1) {
      const first = candidates[i];
      const second = candidates[j];
      let synergy = 0;

      if (first.position !== second.position) synergy += 4;
      if (first.position === 'QB' || second.position === 'QB') synergy += 3;
      if (['DST', 'K'].includes(first.position) || ['DST', 'K'].includes(second.position)) synergy -= 10;

      pairs.push({
        first,
        second,
        pairScore: Number((first.draftScore + second.draftScore + synergy).toFixed(2)),
      });
    }
  }

  return pairs.sort((a, b) => b.pairScore - a.pairScore);
}

export function summarizeRoster(myPicks) {
  const counts = rosterCounts(myPicks);
  return STARTER_SLOTS.map((slot) => ({ slot, count: counts[slot] || 0 }));
}
