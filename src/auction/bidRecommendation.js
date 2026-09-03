import { AUCTION_LEAGUE_CONFIG, getActiveRosterSize } from './config.js';
import { buildCheatSheetContext } from './cheatSheet.js';
import { getIdpTarget, isIndividualDefensivePosition } from './idpTargets.js';
import { buildMarketContext } from './marketContext.js';
import { getMaximumBid } from './marketMath.js';

function positionCounts(players = []) {
  return players.reduce((counts, player) => {
    const position = player?.position;
    if (!position) return counts;
    counts[position] = (counts[position] ?? 0) + 1;
    if (isIndividualDefensivePosition(position)) {
      counts.DP = (counts.DP ?? 0) + 1;
    }
    return counts;
  }, {});
}

function rosterSlotForPosition(position) {
  return isIndividualDefensivePosition(position) ? 'DP' : position;
}

function baseStarterRequirements(config) {
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
  const requirements = baseStarterRequirements(config);
  const flexPositions = config.auctionStrategy?.flexPositions ?? ['RB', 'WR', 'TE'];
  const surplus = flexPositions.reduce(
    (total, position) => total + Math.max(0, (counts[position] ?? 0) - (requirements[position] ?? 0)),
    0,
  );
  return surplus >= (config.roster.FLEX ?? 0);
}

function candidateRole(position, players, config) {
  const counts = positionCounts(players);
  const requirements = baseStarterRequirements(config);
  const slot = rosterSlotForPosition(position);
  if ((counts[slot] ?? 0) < (requirements[slot] ?? 0)) return 'STARTER';

  if (position === 'TE' && (counts.TE ?? 0) >= (requirements.TE ?? 0)) return 'BENCH';

  const flexPositions = config.auctionStrategy?.flexPositions ?? ['RB', 'WR', 'TE'];
  if (flexPositions.includes(position) && !flexFilled(counts, config)) return 'FLEX';
  return 'BENCH';
}

function reserveTargetForMissingStarters(counts, config) {
  const requirements = baseStarterRequirements(config);
  const reserveConfig = config.auctionStrategy?.starterReserve ?? {};
  let premiumReserve = 0;

  for (const [position, required] of Object.entries(requirements)) {
    const have = counts[position] ?? 0;
    const missing = Math.max(0, required - have);
    if (!missing) continue;

    const targets = reserveConfig[position] ?? [];
    for (let index = 0; index < missing; index += 1) {
      const targetIndex = have + index;
      const fallback = targets.length ? targets[targets.length - 1] : config.minimumBid;
      const target = Number(targets[targetIndex] ?? fallback ?? config.minimumBid);
      premiumReserve += Math.max(0, target - config.minimumBid);
    }
  }

  if ((config.roster.FLEX ?? 0) > 0 && !flexFilled(counts, config)) {
    premiumReserve += Math.max(0, Number(config.auctionStrategy?.flexReserve ?? config.minimumBid) - config.minimumBid);
  }

  return premiumReserve;
}

function clearingBuffer(value, config) {
  const strategy = config.auctionStrategy?.market ?? {};
  const pct = Number(strategy.clearingBufferPct ?? 0.05);
  const minBuffer = Number(strategy.minimumClearingBuffer ?? 2);
  const maxBuffer = Number(strategy.maximumClearingBuffer ?? 5);
  return Math.max(minBuffer, Math.min(maxBuffer, Math.ceil(value * pct)));
}

function quarterbackOpportunityCap({ position, role, counts, remainingBudget, config }) {
  if (position !== 'QB' || role !== 'STARTER') return Number.POSITIVE_INFINITY;
  const wrCount = counts.WR ?? 0;
  const qb = config.auctionStrategy?.quarterback ?? {};
  if (wrCount === 0) {
    return Math.floor(remainingBudget * Number(qb.maxBudgetShareWithZeroWr ?? 1));
  }
  if (wrCount === 1) {
    return Math.floor(remainingBudget * Number(qb.maxBudgetShareWithOneWr ?? 1));
  }
  return Number.POSITIVE_INFINITY;
}

function idpOpportunityCap({ playerName, position, role, config }) {
  if (!isIndividualDefensivePosition(position)) return Number.POSITIVE_INFINITY;
  if (role !== 'STARTER') return config.minimumBid;
  const idpTarget = getIdpTarget(playerName);
  const idpConfig = config.auctionStrategy?.idp ?? {};
  return idpTarget
    ? Number(idpConfig.preferredMaximumBid ?? 4)
    : Number(idpConfig.fallbackMaximumBid ?? 2);
}

export function buildMyBudgetState({
  purchases = [],
  config = AUCTION_LEAGUE_CONFIG,
} = {}) {
  const keepers = config.myKeepers ?? [];
  const keeperSpend = keepers.reduce((sum, keeper) => sum + Number(keeper.price || 0), 0);
  const purchaseSpend = purchases.reduce((sum, purchase) => sum + Number(purchase.price || 0), 0);
  const playersRostered = keepers.length + purchases.length;
  const remainingBudget = Math.max(0, config.salaryCap - keeperSpend - purchaseSpend);
  const rosterSize = getActiveRosterSize(config);
  const spotsLeft = Math.max(0, rosterSize - playersRostered);
  const minimumFillReserve = Math.max(0, spotsLeft - 1) * config.minimumBid;
  const maximumLegalBid = getMaximumBid({ remainingBudget, playersRostered, config });

  return {
    keeperSpend,
    purchaseSpend,
    totalSpent: keeperSpend + purchaseSpend,
    remainingBudget,
    playersRostered,
    rosterSize,
    spotsLeft,
    minimumFillReserve,
    maximumLegalBid,
    roster: [...keepers, ...purchases],
  };
}

export function recommendBid({
  nomination,
  purchases = [],
  sales = [],
  playerPool = [],
  config = AUCTION_LEAGUE_CONFIG,
} = {}) {
  if (!nomination?.playerName) return null;

  const budget = buildMyBudgetState({ purchases, config });
  const currentRoster = budget.roster;
  const position = nomination.position ?? null;
  const rosterSlot = rosterSlotForPosition(position);
  const currentCounts = positionCounts(currentRoster);
  const positionLimit = position ? config.positionLimits?.[position] : null;
  const atPositionLimit = Number.isFinite(positionLimit) && (currentCounts[position] ?? 0) >= positionLimit;

  const marketValue = Number(nomination.marketValue);
  const hasMarketValue = Number.isFinite(marketValue) && marketValue >= config.minimumBid;
  const currentBid = Number(nomination.currentBid);
  const hasCurrentBid = Number.isFinite(currentBid) && currentBid >= 0;
  const hasExperienceYears = nomination.experienceYears !== null
    && nomination.experienceYears !== undefined
    && Number.isFinite(Number(nomination.experienceYears));

  const role = atPositionLimit ? 'FULL' : candidateRole(position, currentRoster, config);
  const hypotheticalRoster = atPositionLimit
    ? currentRoster
    : [...currentRoster, { playerName: nomination.playerName, position }];
  const countsAfterWin = positionCounts(hypotheticalRoster);
  const spotsAfterWin = Math.max(0, budget.spotsLeft - (atPositionLimit ? 0 : 1));
  const baseReserveAfterWin = spotsAfterWin * config.minimumBid;
  const starterPremiumReserveAfterWin = reserveTargetForMissingStarters(countsAfterWin, config);
  const baseStrategicReserveAfterWin = baseReserveAfterWin + starterPremiumReserveAfterWin;

  const roleMultiplier = Number(config.auctionStrategy?.roleValueMultiplier?.[role] ?? 1);
  const roleAdjustedMarketValue = hasMarketValue
    ? Math.floor(marketValue * Math.max(0, roleMultiplier))
    : null;

  const cheatSheetContext = buildCheatSheetContext({
    playerName: nomination.playerName,
    position,
    roster: currentRoster,
    remainingBudget: budget.remainingBudget,
    sales,
    marketValue: hasMarketValue ? marketValue : null,
    experienceYears: hasExperienceYears ? Number(nomination.experienceYears) : null,
    config,
  });

  const primaryGoalAdditionalReserve = Number(cheatSheetContext?.primaryGoal?.additionalReserve ?? 0);
  const strategicReserveAfterWin = baseStrategicReserveAfterWin + Math.max(0, primaryGoalAdditionalReserve);
  const strategicMaximumBid = atPositionLimit
    ? 0
    : Math.max(0, budget.remainingBudget - strategicReserveAfterWin);

  const preferenceMultiplier = Number(cheatSheetContext?.preferenceMultiplier ?? 1);
  let intrinsicPreferredValue = hasMarketValue
    ? Math.max(config.minimumBid, Math.floor(roleAdjustedMarketValue * preferenceMultiplier))
    : null;

  const keeperFlierMaximumBid = Number(cheatSheetContext?.keeper?.maximumBid);
  const hasKeeperFlier = cheatSheetContext?.keeper?.eligible === true
    && Number.isFinite(keeperFlierMaximumBid)
    && keeperFlierMaximumBid >= config.minimumBid;
  const keeperFlierCapApplies = hasKeeperFlier
    && (role === 'BENCH' || String(cheatSheetContext?.targetRole ?? '').includes('BENCH'));
  if (hasMarketValue && hasKeeperFlier) {
    intrinsicPreferredValue = Math.max(
      intrinsicPreferredValue,
      Math.min(keeperFlierMaximumBid, marketValue),
    );
  }

  const marketContext = buildMarketContext({ nomination, sales, playerPool, config });
  const pressureFactor = Number(marketContext?.pressureFactor ?? 1);
  const expectedClearingValue = hasMarketValue
    ? Math.max(config.minimumBid, Math.floor(intrinsicPreferredValue * pressureFactor))
    : null;
  const marketAwareValue = hasMarketValue
    ? Math.min(
        intrinsicPreferredValue,
        expectedClearingValue + clearingBuffer(expectedClearingValue, config),
      )
    : strategicMaximumBid;

  const backupRoleCap = role === 'BENCH'
    ? Number(config.auctionStrategy?.backupRoleCaps?.[position])
    : null;
  const hasBackupRoleCap = Number.isFinite(backupRoleCap) && backupRoleCap >= config.minimumBid;
  const intrinsicMarketCap = hasMarketValue ? marketValue : Number.POSITIVE_INFINITY;
  const qbOpportunityCap = quarterbackOpportunityCap({
    position,
    role,
    counts: currentCounts,
    remainingBudget: budget.remainingBudget,
    config,
  });
  const idpCap = idpOpportunityCap({ playerName: nomination.playerName, position, role, config });
  const idpTarget = getIdpTarget(nomination.playerName);

  const buyAtOrBelow = atPositionLimit
    ? 0
    : Math.max(
        config.minimumBid,
        Math.min(
          budget.maximumLegalBid,
          strategicMaximumBid,
          marketAwareValue,
          intrinsicMarketCap,
          qbOpportunityCap,
          idpCap,
          hasBackupRoleCap ? backupRoleCap : Number.POSITIVE_INFINITY,
          keeperFlierCapApplies ? keeperFlierMaximumBid : Number.POSITIVE_INFINITY,
        ),
      );

  const action = atPositionLimit
    ? 'PASS'
    : hasCurrentBid
      ? currentBid <= buyAtOrBelow
        ? 'BUY'
        : 'PASS'
      : 'WATCH';

  return {
    playerName: nomination.playerName,
    nflTeam: nomination.nflTeam ?? null,
    position,
    rosterSlot,
    currentBid: hasCurrentBid ? currentBid : null,
    marketValue: hasMarketValue ? marketValue : null,
    marketValueSource: nomination.marketValueSource ?? (hasMarketValue ? 'espn-practice' : null),
    projectedPoints: Number.isFinite(Number(nomination.projectedPoints)) ? Number(nomination.projectedPoints) : null,
    experienceYears: hasExperienceYears ? Number(nomination.experienceYears) : null,
    role,
    positionHave: rosterSlot ? (currentCounts[rosterSlot] ?? 0) : null,
    positionLimit: Number.isFinite(positionLimit) ? positionLimit : null,
    roleAdjustedMarketValue,
    cheatSheetTier: cheatSheetContext?.tier ?? 'UNRATED',
    cheatSheetTargetRole: cheatSheetContext?.targetRole ?? null,
    cheatSheetPreferenceMultiplier: preferenceMultiplier,
    cheatSheetMaximumBid: null,
    cheatSheetReason: cheatSheetContext?.reason ?? null,
    cheatSheetState: cheatSheetContext?.state ?? null,
    rosterFitSignal: cheatSheetContext?.rosterFit ?? null,
    tierScarcitySignal: cheatSheetContext?.scarcity ?? null,
    keeperSignal: cheatSheetContext?.keeper ?? null,
    keeperFlierCap: keeperFlierCapApplies ? keeperFlierMaximumBid : null,
    primaryGoalSignal: cheatSheetContext?.primaryGoal ?? null,
    backupRoleCap: hasBackupRoleCap ? backupRoleCap : null,
    quarterbackOpportunityCap: Number.isFinite(qbOpportunityCap) ? qbOpportunityCap : null,
    idpTarget,
    idpOpportunityCap: Number.isFinite(idpCap) ? idpCap : null,
    intrinsicPreferredValue,
    intrinsicMarketCap: hasMarketValue ? marketValue : null,
    expectedClearingValue,
    marketPressureFactor: pressureFactor,
    marketAwareValue,
    opponentDemand: marketContext?.demand ?? null,
    remainingSupply: marketContext?.supply ?? null,
    buyAtOrBelow,
    action,
    remainingBudget: budget.remainingBudget,
    maximumLegalBid: budget.maximumLegalBid,
    strategicMaximumBid,
    strategicReserveAfterWin,
    baseStrategicReserveAfterWin,
    primaryGoalAdditionalReserve: Math.max(0, primaryGoalAdditionalReserve),
    minimumFillReserve: budget.minimumFillReserve,
    spotsLeft: budget.spotsLeft,
  };
}
