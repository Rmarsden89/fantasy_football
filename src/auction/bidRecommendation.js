import { AUCTION_LEAGUE_CONFIG, getActiveRosterSize } from './config.js';
import { getMaximumBid } from './marketMath.js';

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
  };
}

export function recommendBid({
  nomination,
  purchases = [],
  config = AUCTION_LEAGUE_CONFIG,
} = {}) {
  if (!nomination?.playerName) return null;

  const budget = buildMyBudgetState({ purchases, config });
  const marketValue = Number(nomination.marketValue);
  const hasMarketValue = Number.isFinite(marketValue) && marketValue >= config.minimumBid;
  const currentBid = Number(nomination.currentBid);
  const hasCurrentBid = Number.isFinite(currentBid) && currentBid >= 0;

  // For the first practice pass, ESPN's displayed auction value is the market
  // anchor when available. The GOP historical model can replace this input
  // without changing the budget-safety logic below.
  const buyAtOrBelow = hasMarketValue
    ? Math.max(config.minimumBid, Math.min(Math.floor(marketValue), budget.maximumLegalBid))
    : budget.maximumLegalBid;

  const action = hasCurrentBid
    ? currentBid <= buyAtOrBelow
      ? 'BUY'
      : 'PASS'
    : 'WATCH';

  return {
    playerName: nomination.playerName,
    position: nomination.position ?? null,
    currentBid: hasCurrentBid ? currentBid : null,
    marketValue: hasMarketValue ? marketValue : null,
    marketValueSource: nomination.marketValueSource ?? (hasMarketValue ? 'espn-practice' : null),
    buyAtOrBelow,
    action,
    remainingBudget: budget.remainingBudget,
    maximumLegalBid: budget.maximumLegalBid,
    minimumFillReserve: budget.minimumFillReserve,
    spotsLeft: budget.spotsLeft,
  };
}
