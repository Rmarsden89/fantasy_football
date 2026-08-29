const STARTER_SLOTS = ['QB', 'QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX'];
const CORE_POSITIONS = ['QB', 'RB', 'WR', 'TE'];
const FLEX_POSITIONS = new Set(['RB', 'WR', 'TE']);

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function normalizePosition(position) {
  return position === 'D/ST' ? 'DST' : position;
}

function sortByPosition(players) {
  return players.reduce((groups, player) => {
    const position = normalizePosition(player.position);
    (groups[position] ||= []).push(player);
    return groups;
  }, {});
}

function rosterCounts(picks) {
  return picks.reduce((counts, pick) => {
    const position = normalizePosition(pick.position);
    counts[position] = (counts[position] || 0) + 1;
    return counts;
  }, {});
}

function flexFilled(counts, config) {
  return Math.max(
    0,
    (counts.RB || 0) - config.roster.RB +
      (counts.WR || 0) - config.roster.WR +
      (counts.TE || 0) - config.roster.TE,
  );
}

function starterNeed(position, counts, config) {
  const required = config.roster[position] || 0;
  if (!required) return 0;
  const missing = Math.max(required - (counts[position] || 0), 0);
  return clamp((missing / required) * 100);
}

function flexNeed(position, counts, config) {
  if (!FLEX_POSITIONS.has(position) || !config.roster.FLEX) return 0;
  const missingFlex = Math.max(config.roster.FLEX - flexFilled(counts, config), 0);
  return missingFlex > 0 ? 100 : 0;
}

function depthNeed(position, counts, config) {
  const have = counts[position] || 0;
  if (position === 'QB') {
    if (have < config.roster.QB) return 100;
    if (have === config.roster.QB) return 25;
    if (have === config.roster.QB + 1) return 10;
    return 0;
  }
  if (position === 'RB' || position === 'WR') {
    if (have < config.roster[position]) return 100;
    if (have < config.roster[position] + 2) return 45;
    return 20;
  }
  if (position === 'TE') {
    if (have < config.roster.TE) return 100;
    if (have === config.roster.TE) return 20;
    return 5;
  }
  if (position === 'DST') return have < config.roster.DST ? 20 : 0;
  if (position === 'K') return have < config.roster.K ? 10 : 0;
  return 0;
}

function marketDepletion(position, draftedPicks, config) {
  const drafted = draftedPicks.filter((pick) => normalizePosition(pick.position) === position).length;
  const starterDemand = Math.max(config.teams * (config.roster[position] || 1), 1);
  return clamp((drafted / starterDemand) * 100);
}

function opponentDemand(position, draftedPicks, myTeamName, config) {
  if (!CORE_POSITIONS.includes(position)) return 0;

  const byTeam = new Map();
  for (const pick of draftedPicks) {
    if (!pick.fantasyTeam || pick.fantasyTeam === myTeamName) continue;
    const counts = byTeam.get(pick.fantasyTeam) || {};
    const pickPosition = normalizePosition(pick.position);
    counts[pickPosition] = (counts[pickPosition] || 0) + 1;
    byTeam.set(pick.fantasyTeam, counts);
  }

  const opponentCount = Math.max(config.teams - 1, 1);
  let teamsStillNeeding = 0;
  for (const counts of byTeam.values()) {
    if ((counts[position] || 0) < (config.roster[position] || 0)) teamsStillNeeding += 1;
  }

  teamsStillNeeding += Math.max(opponentCount - byTeam.size, 0);
  return clamp((teamsStillNeeding / opponentCount) * 100);
}

function positionTurnPressure(position, picksUntilNextTurn, draftedPicks, myTeamName, config) {
  if (!Number.isFinite(picksUntilNextTurn) || picksUntilNextTurn <= 0) return 0;
  const demand = opponentDemand(position, draftedPicks, myTeamName, config) / 100;
  const exposure = Math.min(picksUntilNextTurn / Math.max(config.teams * 2 - 2, 1), 1);
  return clamp(demand * exposure * 100);
}

function earliestRoundForPosition(position, config) {
  return config.strategy.specialTeamsEarliestRound?.[position] ?? 1;
}

function isPositionEligible(position, currentRound, config) {
  if (!['DST', 'K'].includes(position)) return true;
  return currentRound >= earliestRoundForPosition(position, config);
}

export function computePositionPriorities({
  draftedPicks,
  myTeamName,
  config,
  picksUntilNextTurn = 0,
  currentRound = 1,
}) {
  const myPicks = draftedPicks.filter((pick) => pick.fantasyTeam === myTeamName);
  const counts = rosterCounts(myPicks);
  const weights = config.strategy.positionWeights;
  const priorities = {};

  for (const position of ['QB', 'RB', 'WR', 'TE', 'DST', 'K']) {
    const components = {
      starterNeed: starterNeed(position, counts, config),
      flexNeed: flexNeed(position, counts, config),
      depthNeed: depthNeed(position, counts, config),
      depletion: marketDepletion(position, draftedPicks, config),
      opponentDemand: opponentDemand(position, draftedPicks, myTeamName, config),
      turnPressure: positionTurnPressure(
        position,
        picksUntilNextTurn,
        draftedPicks,
        myTeamName,
        config,
      ),
    };

    const rawPriority = Object.entries(weights).reduce(
      (total, [key, weight]) => total + (components[key] || 0) * weight,
      0,
    );
    const eligible = isPositionEligible(position, currentRound, config);
    const priority = eligible ? rawPriority : 0;

    priorities[position] = {
      position,
      priority: Number(priority.toFixed(2)),
      rawPriority: Number(rawPriority.toFixed(2)),
      eligible,
      eligibleRound: earliestRoundForPosition(position, config),
      have: counts[position] || 0,
      required: config.roster[position] || 0,
      components,
    };
  }

  return priorities;
}

function withinPositionValue(player, positionPlayers) {
  const projected = positionPlayers
    .filter((p) => Number.isFinite(p.projectedPoints))
    .sort((a, b) => b.projectedPoints - a.projectedPoints);
  const projectionIndex = projected.findIndex((p) => p.id === player.id);
  const projectionScore = projectionIndex < 0 || projected.length <= 1
    ? 50
    : 100 - (projectionIndex / (projected.length - 1)) * 100;

  if (!Number.isFinite(player.espnRank)) return clamp(projectionScore);
  const rankScore = clamp(105 - Math.min(player.espnRank, 105));
  return clamp(projectionScore * 0.7 + rankScore * 0.3);
}

function valueOverReplacement(player, positionPlayers, replacementRank) {
  if (!Number.isFinite(player.projectedPoints)) return 50;
  const sorted = [...positionPlayers]
    .filter((p) => Number.isFinite(p.projectedPoints))
    .sort((a, b) => b.projectedPoints - a.projectedPoints);
  if (!sorted.length) return 50;
  const replacementIndex = Math.min(Math.max(replacementRank - 1, 0), sorted.length - 1);
  const replacement = sorted[replacementIndex]?.projectedPoints ?? 0;
  const leader = sorted[0]?.projectedPoints ?? replacement;
  const range = Math.max(leader - replacement, 1);
  return clamp(((player.projectedPoints - replacement) / range) * 100);
}

function tierDropScore(player, positionPlayers) {
  const group = [...positionPlayers]
    .filter((p) => Number.isFinite(p.projectedPoints))
    .sort((a, b) => b.projectedPoints - a.projectedPoints);
  const index = group.findIndex((p) => p.id === player.id);
  if (index < 0 || index === group.length - 1) return 0;
  const current = group[index].projectedPoints;
  const next = group[index + 1]?.projectedPoints ?? current;
  const leader = group[0]?.projectedPoints ?? current;
  const floor = group.at(-1)?.projectedPoints ?? next;
  const range = Math.max(leader - floor, 1);
  return clamp(((current - next) / range) * 600);
}

function estimateTurnRisk(player, picksUntilNextTurn, positionPlayers, positionPriority) {
  if (!Number.isFinite(picksUntilNextTurn) || picksUntilNextTurn <= 0) return 100;
  const group = [...positionPlayers].sort((a, b) => {
    if (Number.isFinite(a.espnRank) && Number.isFinite(b.espnRank)) return a.espnRank - b.espnRank;
    return (b.projectedPoints ?? 0) - (a.projectedPoints ?? 0);
  });
  const rankWithinPosition = Math.max(group.findIndex((p) => p.id === player.id) + 1, 1);
  const pressure = positionPriority / 100;
  const expectedAtPosition = Math.max(1, picksUntilNextTurn * (0.1 + pressure * 0.35));
  if (rankWithinPosition <= expectedAtPosition) return 95;
  return clamp(95 - (rankWithinPosition - expectedAtPosition) * 11, 5, 95);
}

export function buildDraftState({ players, draftedPicks, myTeamName }) {
  const draftedIds = new Set(draftedPicks.filter((pick) => pick.playerId).map((pick) => pick.playerId));
  const draftedNames = new Set(draftedPicks.map((pick) => pick.playerName?.toLowerCase()).filter(Boolean));
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
}) {
  const state = buildDraftState({ players, draftedPicks, myTeamName });
  const turn = getPicksUntilNextTurn(state.lastOverallPick, myOverallPicks);
  const targetOverallPick = turn.nextPick ?? Math.max(state.lastOverallPick + 1, 1);
  const currentRound = Math.floor((targetOverallPick - 1) / config.teams) + 1;
  const eligibleAvailable = state.available.filter((player) =>
    isPositionEligible(normalizePosition(player.position), currentRound, config),
  );
  const availableByPosition = sortByPosition(eligibleAvailable);
  const positionPriorities = computePositionPriorities({
    draftedPicks,
    myTeamName,
    config,
    picksUntilNextTurn: turn.picksUntil,
    currentRound,
  });
  const weights = config.strategy.playerWeights;

  const scored = eligibleAvailable.map((player) => {
    const position = normalizePosition(player.position);
    const positionPlayers = availableByPosition[position] || [];
    const positionPriority = positionPriorities[position]?.priority || 0;
    const components = {
      positionPriority,
      withinPositionValue: withinPositionValue(player, positionPlayers),
      vor: valueOverReplacement(
        player,
        positionPlayers,
        config.strategy.replacementRanks[position] || 8,
      ),
      tierDrop: tierDropScore(player, positionPlayers),
      turnRisk: estimateTurnRisk(player, turn.picksUntil, positionPlayers, positionPriority),
    };

    const draftScore = Object.entries(weights).reduce(
      (total, [key, weight]) => total + (components[key] || 0) * weight,
      0,
    );

    return {
      ...player,
      position,
      draftScore: Number(draftScore.toFixed(2)),
      components,
      positionPriority,
      currentRound,
      nextPick: turn.nextPick,
      picksUntilNextTurn: turn.picksUntil,
    };
  }).sort((a, b) => b.draftScore - a.draftScore);

  scored.positionPriorities = positionPriorities;
  scored.currentRound = currentRound;
  return scored;
}

export function recommendPairs(scoredPlayers, limit = 14) {
  const candidates = scoredPlayers.slice(0, limit);
  const pairs = [];

  for (let i = 0; i < candidates.length; i += 1) {
    for (let j = i + 1; j < candidates.length; j += 1) {
      const first = candidates[i];
      const second = candidates[j];
      let synergy = 0;
      const firstNeed = first.components.positionPriority || 0;
      const secondNeed = second.components.positionPriority || 0;

      if (first.position !== second.position) synergy += 5;
      if (first.position === second.position && Math.min(firstNeed, secondNeed) < 70) synergy -= 8;
      if (['DST', 'K'].includes(first.position) || ['DST', 'K'].includes(second.position)) synergy -= 15;
      if (firstNeed >= 80) synergy += 3;
      if (secondNeed >= 80) synergy += 3;

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
