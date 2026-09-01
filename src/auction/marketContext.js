import { AUCTION_LEAGUE_CONFIG } from './config.js';
import { getMaximumBid } from './marketMath.js';

function positionCounts(players = []) {
  return players.reduce((counts, player) => {
    const position = player?.position;
    if (!position) return counts;
    counts[position] = (counts[position] ?? 0) + 1;
    return counts;
  }, {});
}

function starterRequirements(config) {
  return {
    QB: config.roster.QB ?? 0,
    RB: config.roster.RB ?? 0,
    WR: config.roster.WR ?? 0,
    TE: config.roster.TE ?? 0,
    DP: config.roster.DP ?? 0,
    DST: config.roster.DST ?? 0,
    K: config.roster.K ?? 0,
  };
}

function flexFilled(counts, config) {
  const requirements = starterRequirements(config);
  const flexPositions = config.auctionStrategy?.flexPositions ?? ['RB', 'WR', 'TE'];
  const surplus = flexPositions.reduce(
    (total, position) => total + Math.max(0, (counts[position] ?? 0) - (requirements[position] ?? 0)),
    0,
  );
  return surplus >= (config.roster.FLEX ?? 0);
}

function demandWeightForPosition(position, roster, config) {
  const counts = positionCounts(roster);
  const requirements = starterRequirements(config);
  const have = counts[position] ?? 0;
  const required = requirements[position] ?? 0;

  if (have < required) return 1;

  const flexPositions = config.auctionStrategy?.flexPositions ?? ['RB', 'WR', 'TE'];
  if (flexPositions.includes(position) && !flexFilled(counts, config)) return 0.55;

  const positionLimit = config.positionLimits?.[position];
  if (!Number.isFinite(positionLimit) || have < positionLimit) return 0.15;
  return 0;
}

function groupOpponentSales(sales, config) {
  const grouped = new Map();
  for (const sale of sales ?? []) {
    if (!sale?.fantasyTeam || sale.fantasyTeam === config.myTeamName) continue;
    const team = grouped.get(sale.fantasyTeam) ?? { teamName: sale.fantasyTeam, spent: 0, roster: [] };
    team.spent += Number(sale.price || 0);
    team.roster.push(sale);
    grouped.set(sale.fantasyTeam, team);
  }
  return [...grouped.values()];
}

export function buildOpponentDemand({
  position,
  marketValue,
  sales = [],
  config = AUCTION_LEAGUE_CONFIG,
} = {}) {
  if (!position) return null;

  const opponents = groupOpponentSales(sales, config);
  const observedOpponentCount = opponents.length;
  const unknownOpponentCount = Math.max(0, (config.teams ?? 1) - 1 - observedOpponentCount);
  const targetValue = Math.max(config.minimumBid, Number(marketValue) || config.minimumBid);

  let effectiveDemand = unknownOpponentCount;
  let starterNeedTeams = unknownOpponentCount;
  let flexNeedTeams = 0;
  let capableBidderCount = unknownOpponentCount;

  const details = opponents.map((team) => {
    const playersRostered = team.roster.length;
    const remainingBudget = Math.max(0, config.salaryCap - team.spent);
    const maxBid = getMaximumBid({ remainingBudget, playersRostered, config });
    const demandWeight = demandWeightForPosition(position, team.roster, config);
    const abilityWeight = Math.min(1, maxBid / targetValue);
    const weightedDemand = demandWeight * abilityWeight;

    const counts = positionCounts(team.roster);
    const required = starterRequirements(config)[position] ?? 0;
    if ((counts[position] ?? 0) < required) starterNeedTeams += 1;
    else if (demandWeight >= 0.5) flexNeedTeams += 1;

    if (demandWeight >= 0.5 && maxBid >= Math.max(config.minimumBid, targetValue * 0.7)) {
      capableBidderCount += 1;
    }

    effectiveDemand += weightedDemand;
    return {
      teamName: team.teamName,
      maxBid,
      demandWeight,
      abilityWeight: Number(abilityWeight.toFixed(3)),
      weightedDemand: Number(weightedDemand.toFixed(3)),
    };
  });

  return {
    position,
    observedOpponentCount,
    unknownOpponentCount,
    effectiveDemand: Number(effectiveDemand.toFixed(3)),
    starterNeedTeams,
    flexNeedTeams,
    capableBidderCount,
    details,
  };
}

function normalizeName(value = '') {
  return String(value).trim().toLowerCase();
}

export function buildRemainingSupply({
  nomination,
  playerPool = [],
  sales = [],
  config = AUCTION_LEAGUE_CONFIG,
} = {}) {
  const position = nomination?.position;
  const projectedPoints = Number(nomination?.projectedPoints);
  if (!position || !Number.isFinite(projectedPoints) || projectedPoints <= 0 || !playerPool?.length) {
    return null;
  }

  const soldIds = new Set((sales ?? []).map((sale) => Number(sale?.playerId)).filter(Number.isFinite));
  const soldNames = new Set((sales ?? []).map((sale) => normalizeName(sale?.playerName)).filter(Boolean));
  const keeperNames = new Set((config.myKeepers ?? []).map((keeper) => normalizeName(keeper.playerName)));
  const nomineeName = normalizeName(nomination.playerName);

  const remainingAtPosition = playerPool.filter((player) => {
    if (player?.position !== position) return false;
    if (soldIds.has(Number(player.id))) return false;
    if (soldNames.has(normalizeName(player.name))) return false;
    if (keeperNames.has(normalizeName(player.name))) return false;
    if (normalizeName(player.name) === nomineeName) return false;
    return Number.isFinite(Number(player.projectedPoints));
  });

  const comparableFloor = projectedPoints * 0.9;
  const nearFloor = projectedPoints * 0.9;
  const nearCeiling = projectedPoints * 1.05;

  const comparable = remainingAtPosition.filter(
    (player) => Number(player.projectedPoints) >= comparableFloor,
  );
  const nearPeers = remainingAtPosition.filter((player) => {
    const points = Number(player.projectedPoints);
    return points >= nearFloor && points <= nearCeiling;
  });
  const superior = remainingAtPosition.filter(
    (player) => Number(player.projectedPoints) > projectedPoints * 1.02,
  );

  return {
    position,
    projectedPoints,
    remainingAtPosition: remainingAtPosition.length,
    comparableCount: comparable.length,
    nearPeerCount: nearPeers.length,
    superiorCount: superior.length,
  };
}

export function marketPressureFactor({ demand, supply } = {}) {
  const effectiveDemand = Math.max(0, Number(demand?.effectiveDemand) || 0);

  if (supply && Number.isFinite(Number(supply.comparableCount))) {
    const comparableSupply = Math.max(1, Number(supply.comparableCount));
    const competitionScore = effectiveDemand / (effectiveDemand + comparableSupply * 0.75);
    return Number(Math.min(1.02, Math.max(0.72, 0.72 + 0.34 * competitionScore)).toFixed(3));
  }

  // Before the player pool has loaded, do not discount a player while the room
  // still has broad demand. Demand-only discounts begin once the number of
  // meaningful bidders has materially collapsed.
  if (effectiveDemand >= 8) return 1;
  if (effectiveDemand >= 5) return 0.96;
  if (effectiveDemand >= 3) return 0.9;
  if (effectiveDemand >= 1.5) return 0.82;
  if (effectiveDemand > 0) return 0.76;
  return 0.72;
}

export function buildMarketContext({
  nomination,
  sales = [],
  playerPool = [],
  config = AUCTION_LEAGUE_CONFIG,
} = {}) {
  const demand = buildOpponentDemand({
    position: nomination?.position,
    marketValue: nomination?.marketValue,
    sales,
    config,
  });
  const supply = buildRemainingSupply({ nomination, playerPool, sales, config });
  const pressureFactor = marketPressureFactor({ demand, supply });

  return { demand, supply, pressureFactor };
}
