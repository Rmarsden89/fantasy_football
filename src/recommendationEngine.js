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
    Math.max((counts.RB || 0) - config.roster.RB, 0) +
      Math.max((counts.WR || 0) - config.roster.WR, 0) +
      Math.max((counts.TE || 0) - config.roster.TE, 0),
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
  if (position === 'TE' && (counts.TE || 0) >= config.roster.TE) return 0;
  const missingFlex = Math.max(config.roster.FLEX - flexFilled(counts, config), 0);
  return missingFlex > 0 ? 100 : 0;
}

function depthNeed(position, counts, config) {
  const have = counts[position] || 0;
  if (position === 'QB') {
    if (have < config.roster.QB) return 100;
    if (have === config.roster.QB) return 35;
    if (have === config.roster.QB + 1) return 2;
    return 0;
  }
  if (position === 'RB') {
    if (have < config.roster.RB) return 100;
    if (have === config.roster.RB) return 55;
    if (have === config.roster.RB + 1) return 45;
    if (have === config.roster.RB + 2) return 30;
    if (have === config.roster.RB + 3) return 8;
    return 0;
  }
  if (position === 'WR') {
    if (have < config.roster.WR) return 100;
    if (have === config.roster.WR) return 60;
    if (have <= config.roster.WR + 2) return 50;
    if (have === config.roster.WR + 3) return 35;
    return 18;
  }
  if (position === 'TE') {
    if (have < config.roster.TE) return 100;
    if (have === config.roster.TE) return 10;
    return 0;
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

function maxRecommendedForPosition(position, config) {
  return config.strategy.maxRecommendedByPosition?.[position] ?? Infinity;
}

function isPositionEligible(position, currentRound, config, counts = {}) {
  if (['DST', 'K'].includes(position) && currentRound < earliestRoundForPosition(position, config)) return false;
  return (counts[position] || 0) < maxRecommendedForPosition(position, config);
}

function findPlayerForPick(pick, players) {
  return players.find((player) =>
    (pick.playerId && player.id === pick.playerId) ||
    (pick.playerName && player.name?.toLowerCase() === pick.playerName.toLowerCase()),
  );
}

function bestRosterTePositionRank(myPicks, players) {
  const rosteredTeIds = new Set(
    myPicks
      .filter((pick) => normalizePosition(pick.position) === 'TE')
      .map((pick) => findPlayerForPick(pick, players)?.id)
      .filter(Boolean),
  );
  if (!rosteredTeIds.size) return null;
  const rankedTes = players
    .filter((player) => normalizePosition(player.position) === 'TE')
    .sort((a, b) => (b.projectedPoints ?? 0) - (a.projectedPoints ?? 0));
  let bestRank = Infinity;
  rankedTes.forEach((player, index) => {
    if (rosteredTeIds.has(player.id)) bestRank = Math.min(bestRank, index + 1);
  });
  return Number.isFinite(bestRank) ? bestRank : null;
}

function saturationMultiplier(position, counts, config) {
  const settings = config.strategy.saturation?.[position];
  if (!settings) return 1;
  const have = counts[position] || 0;
  if (have < settings.softTarget) return 1;
  return settings.multiplierAfterTarget ?? 1;
}

export function computePositionPriorities({
  draftedPicks,
  myTeamName,
  config,
  players = [],
  picksUntilNextTurn = 0,
  currentRound = 1,
}) {
  const myPicks = draftedPicks.filter((pick) => pick.fantasyTeam === myTeamName);
  const counts = rosterCounts(myPicks);
  const weights = config.strategy.positionWeights;
  const priorities = {};
  const bestTeRank = bestRosterTePositionRank(myPicks, players);

  for (const position of ['QB', 'RB', 'WR', 'TE', 'DST', 'K']) {
    const components = {
      starterNeed: starterNeed(position, counts, config),
      flexNeed: flexNeed(position, counts, config),
      depthNeed: depthNeed(position, counts, config),
      depletion: marketDepletion(position, draftedPicks, config),
      opponentDemand: opponentDemand(position, draftedPicks, myTeamName, config),
      turnPressure: positionTurnPressure(position, picksUntilNextTurn, draftedPicks, myTeamName, config),
    };
    const rawPriority = Object.entries(weights).reduce(
      (total, [key, weight]) => total + (components[key] || 0) * weight,
      0,
    );
    const eligible = isPositionEligible(position, currentRound, config, counts);
    let priority = eligible ? rawPriority : 0;

    if (position === 'TE' && (counts.TE || 0) >= 1 && eligible) {
      const teStrategy = config.strategy.tightEndStrategy || {};
      const elite = Number.isFinite(bestTeRank) && bestTeRank <= (teStrategy.elitePositionRank ?? 5);
      const cap = elite
        ? (teStrategy.eliteStarterPriorityCap ?? 8)
        : (teStrategy.normalStarterPriorityCap ?? 20);
      priority = Math.min(priority, cap);
      if (currentRound < (teStrategy.backupEarliestRound ?? 10)) priority *= 0.25;
    }

    const saturation = saturationMultiplier(position, counts, config);
    priority *= saturation;

    priorities[position] = {
      position,
      priority: Number(priority.toFixed(2)),
      rawPriority: Number(rawPriority.toFixed(2)),
      eligible,
      eligibleRound: earliestRoundForPosition(position, config),
      have: counts[position] || 0,
      required: config.roster[position] || 0,
      saturationMultiplier: saturation,
      bestRosterTePositionRank: position === 'TE' ? bestTeRank : null,
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
  const consensusScore = Number.isFinite(player.consensusValue) ? player.consensusValue : null;
  if (consensusScore === null) return clamp(projectionScore);
  return clamp(projectionScore * 0.55 + consensusScore * 0.45);
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
    const aRank = a.consensusRank ?? a.espnRank;
    const bRank = b.consensusRank ?? b.espnRank;
    if (Number.isFinite(aRank) && Number.isFinite(bRank)) return aRank - bRank;
    return (b.projectedPoints ?? 0) - (a.projectedPoints ?? 0);
  });
  const rankWithinPosition = Math.max(group.findIndex((p) => p.id === player.id) + 1, 1);
  const pressure = positionPriority / 100;
  const expectedAtPosition = Math.max(1, picksUntilNextTurn * (0.1 + pressure * 0.35));
  if (rankWithinPosition <= expectedAtPosition) return 95;
  return clamp(95 - (rankWithinPosition - expectedAtPosition) * 11, 5, 95);
}

function upsideScore(player, currentRound) {
  let score = 30;
  const outlook = String(player.seasonOutlook || '').toLowerCase();
  const positiveTerms = [
    ['sleeper', 20],
    ['breakout', 20],
    ['upside', 16],
    ['high ceiling', 18],
    ['lottery', 14],
    ['emerge', 10],
    ['rookie', 10],
    ['starting role', 10],
    ['featured', 10],
  ];
  const negativeTerms = [
    ['low ceiling', -18],
    ['limited ceiling', -15],
    ['no more than', -10],
    ['off the short-term fantasy radar', -25],
    ['unlikely to be a fantasy option', -25],
  ];
  for (const [term, points] of positiveTerms) if (outlook.includes(term)) score += points;
  for (const [term, points] of negativeTerms) if (outlook.includes(term)) score += points;

  if (Number.isFinite(player.marketGap)) score += clamp(player.marketGap, -20, 40) * 0.75;
  if (Number.isFinite(player.percentOwned) && player.percentOwned < 55 && currentRound >= 10) score += 8;
  return clamp(score);
}

function byeTiebreakScore(player, myPicks, players, config) {
  if (!Number.isFinite(player.byeWeek)) return 50;
  let conflicts = 0;
  for (const pick of myPicks) {
    const rostered = findPlayerForPick(pick, players);
    if (rostered?.byeWeek === player.byeWeek) conflicts += 1;
  }
  const settings = config.strategy.byeTiebreaker || {};
  const counted = Math.min(conflicts, settings.maxConflictsCounted ?? 3);
  return clamp(100 - counted * (settings.conflictPenalty ?? 25));
}

function phaseWeights(currentRound, config) {
  const phases = config.strategy.phaseWeights || {};
  if (currentRound <= (phases.early?.throughRound ?? 6)) return phases.early;
  if (currentRound <= (phases.middle?.throughRound ?? 11)) return phases.middle;
  return phases.late;
}

export function buildDraftState({ players, draftedPicks, myTeamName }) {
  const draftedIds = new Set(draftedPicks.filter((pick) => pick.playerId).map((pick) => pick.playerId));
  const draftedNames = new Set(draftedPicks.map((pick) => pick.playerName?.toLowerCase()).filter(Boolean));
  const available = players.filter(
    (player) => !draftedIds.has(player.id) && !draftedNames.has(player.name?.toLowerCase()),
  );
  const myPicks = draftedPicks.filter((pick) => pick.fantasyTeam === myTeamName);
  return { available, myPicks, draftedPicks, lastOverallPick: draftedPicks.at(-1)?.overallPick || 0 };
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
  const counts = rosterCounts(state.myPicks);
  const eligibleAvailable = state.available.filter((player) =>
    isPositionEligible(normalizePosition(player.position), currentRound, config, counts),
  );
  const availableByPosition = sortByPosition(eligibleAvailable);
  const positionPriorities = computePositionPriorities({
    draftedPicks,
    myTeamName,
    config,
    players,
    picksUntilNextTurn: turn.picksUntil,
    currentRound,
  });
  const weights = phaseWeights(currentRound, config);

  const scored = eligibleAvailable.map((player) => {
    const position = normalizePosition(player.position);
    const positionPlayers = availableByPosition[position] || [];
    const positionPriority = positionPriorities[position]?.priority || 0;
    const saturation = positionPriorities[position]?.saturationMultiplier ?? 1;
    const components = {
      positionPriority,
      withinPositionValue: withinPositionValue(player, positionPlayers),
      vor: valueOverReplacement(player, positionPlayers, config.strategy.replacementRanks[position] || 8),
      consensusValue: Number.isFinite(player.consensusValue) ? player.consensusValue : 50,
      upside: upsideScore(player, currentRound),
      tierDrop: tierDropScore(player, positionPlayers),
      turnRisk: estimateTurnRisk(player, turn.picksUntil, positionPlayers, positionPriority),
      byeTiebreak: byeTiebreakScore(player, state.myPicks, players, config),
    };

    const baseScore = Object.entries(weights || {}).reduce(
      (total, [key, weight]) => total + (components[key] || 0) * weight,
      0,
    );
    const draftScore = baseScore * saturation;

    return {
      ...player,
      position,
      draftScore: Number(draftScore.toFixed(2)),
      components,
      positionPriority,
      saturationMultiplier: saturation,
      currentRound,
      nextPick: turn.nextPick,
      picksUntilNextTurn: turn.picksUntil,
    };
  });

  const tieWindow = config.strategy.byeTiebreaker?.scoreWindow ?? 2;
  scored.sort((a, b) => {
    const delta = b.draftScore - a.draftScore;
    if (Math.abs(delta) > tieWindow) return delta;
    const byeDelta = b.components.byeTiebreak - a.components.byeTiebreak;
    if (byeDelta !== 0) return byeDelta;
    const upsideDelta = b.components.upside - a.components.upside;
    if (upsideDelta !== 0) return upsideDelta;
    return delta;
  });

  scored.positionPriorities = positionPriorities;
  scored.currentRound = currentRound;
  scored.phaseWeights = weights;
  return scored;
}

export function recommendPairs(scoredPlayers, limit = 14) {
  const candidates = scoredPlayers.slice(0, limit);
  const pairs = [];
  for (let i = 0; i < candidates.length; i += 1) {
    for (let j = i + 1; j < candidates.length; j += 1) {
      const first = candidates[i];
      const second = candidates[j];
      if (first.position === 'TE' && second.position === 'TE') continue;
      if (first.position === 'QB' && second.position === 'QB' && first.saturationMultiplier < 1) continue;
      let synergy = 0;
      if (first.position !== second.position) synergy += 4;
      if (first.components.upside >= 70) synergy += 2;
      if (second.components.upside >= 70) synergy += 2;
      if (['DST', 'K'].includes(first.position) || ['DST', 'K'].includes(second.position)) synergy -= 15;
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
