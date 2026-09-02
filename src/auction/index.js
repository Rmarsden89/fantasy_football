import { fetchEspnPlayerPool } from '../espnPlayerPool.js';
import { AUCTION_LEAGUE_CONFIG, getActiveRosterSize } from './config.js';
import { AUCTION_CHEAT_SHEET } from './cheatSheet.js';
import { createAutoBidController } from './autoBidController.js';
import { createEspnAuctionWatcher } from './espnAuctionWatcher.js';
import { createNominationWatcher } from './nominationWatcher.js';
import { buildMyBudgetState, recommendBid } from './bidRecommendation.js';
import { getDiscretionaryBudget, getMaximumBid } from './marketMath.js';

const HELPER_VERSION = '0.7.0-dynamic-strategy-signals';

function normalizeName(value = '') {
  return String(value).trim().toLowerCase();
}

function createTeamState(teamName, config = AUCTION_LEAGUE_CONFIG) {
  return {
    teamName,
    spent: 0,
    remainingBudget: config.salaryCap,
    playersRostered: 0,
    maxBid: config.salaryCap - (getActiveRosterSize(config) - 1) * config.minimumBid,
    discretionaryBudget: config.salaryCap - getActiveRosterSize(config) * config.minimumBid,
    roster: [],
  };
}

export function buildAuctionState(sales = [], config = AUCTION_LEAGUE_CONFIG) {
  const teams = new Map();

  for (const sale of sales) {
    if (!sale?.fantasyTeam || !Number.isFinite(Number(sale.price))) continue;
    const team = teams.get(sale.fantasyTeam) ?? createTeamState(sale.fantasyTeam, config);
    team.spent += Number(sale.price);
    team.remainingBudget = Math.max(0, config.salaryCap - team.spent);
    team.playersRostered += 1;
    team.roster.push({
      playerId: sale.playerId ?? null,
      playerName: sale.playerName,
      position: sale.position,
      price: Number(sale.price),
    });
    team.maxBid = getMaximumBid({
      remainingBudget: team.remainingBudget,
      playersRostered: team.playersRostered,
      config,
    });
    team.discretionaryBudget = getDiscretionaryBudget({
      remainingBudget: team.remainingBudget,
      playersRostered: team.playersRostered,
      config,
    });
    teams.set(sale.fantasyTeam, team);
  }

  return [...teams.values()].sort((a, b) => b.remainingBudget - a.remainingBudget);
}

function myPurchases(sales, config) {
  return sales.filter((sale) => sale?.fantasyTeam === config.myTeamName);
}

function printRecommendation(recommendation) {
  if (!recommendation) return;
  const label = recommendation.action === 'BUY'
    ? '✅ BUY'
    : recommendation.action === 'PASS'
      ? '⛔ PASS'
      : '👀 WATCH';

  console.group(`${label}: ${recommendation.playerName} — ${recommendation.position ?? '?'} / ${recommendation.role}`);
  console.table([{
    player: recommendation.playerName,
    position: recommendation.position,
    rosterRole: recommendation.role,
    cheatTier: recommendation.cheatSheetTier,
    targetRole: recommendation.cheatSheetTargetRole,
    preference: recommendation.cheatSheetPreferenceMultiplier,
    tierUrgency: recommendation.tierScarcitySignal?.urgency ?? null,
    keeperFlier: recommendation.keeperSignal?.eligible ?? false,
    backupCap: recommendation.backupRoleCap,
    bidWhenNominated: recommendation.currentBid,
    espnValue: recommendation.marketValue,
    roleAdjustedValue: recommendation.roleAdjustedMarketValue,
    preferredValue: recommendation.intrinsicPreferredValue,
    expectedClearing: recommendation.expectedClearingValue,
    marketPressure: recommendation.marketPressureFactor,
    buyAtOrBelow: recommendation.buyAtOrBelow,
    strategicMax: recommendation.strategicMaximumBid,
    remainingBudget: recommendation.remainingBudget,
    reserveAfterWin: recommendation.strategicReserveAfterWin,
    maxLegalBid: recommendation.maximumLegalBid,
    capableOpponents: recommendation.opponentDemand?.capableBidderCount ?? null,
    effectiveDemand: recommendation.opponentDemand?.effectiveDemand ?? null,
    comparableLeft: recommendation.remainingSupply?.comparableCount ?? null,
    nearPeersLeft: recommendation.remainingSupply?.nearPeerCount ?? null,
  }]);

  const roleText = recommendation.role === 'STARTER'
    ? 'fills an open starter'
    : recommendation.role === 'FLEX'
      ? 'would fill FLEX'
      : recommendation.role === 'BENCH'
        ? 'would be depth/bench'
        : 'position is already full';

  const marketText = recommendation.remainingSupply
    ? `${recommendation.opponentDemand?.capableBidderCount ?? 0} capable opponents and `
      + `${recommendation.remainingSupply.comparableCount} comparable ${recommendation.position}s remain`
    : `${recommendation.opponentDemand?.capableBidderCount ?? 0} capable opponents; player-pool supply unavailable`;

  console.log(
    `${recommendation.playerName}: recommended ceiling is $${recommendation.buyAtOrBelow} — ${roleText}; `
    + `${recommendation.cheatSheetTier} pre-draft preference, ${recommendation.tierScarcitySignal?.urgency ?? 'NONE'} tier urgency. `
    + `${marketText}. $${recommendation.strategicReserveAfterWin} remains protected after a win. `
    + 'This ceiling is fixed for the nomination and will not move with live bids.',
  );
  if (recommendation.cheatSheetReason) console.log(`Strategy signals: ${recommendation.cheatSheetReason}`);
  console.groupEnd();
}

function printState(sales, config = AUCTION_LEAGUE_CONFIG) {
  const teams = buildAuctionState(sales, config);
  const budget = buildMyBudgetState({ purchases: myPurchases(sales, config), config });
  console.group(`Fantasy Auction Helper ${HELPER_VERSION}`);
  console.log(`${sales.length} completed salary-cap sales detected.`);
  console.log(
    `${config.myTeamName}: $${budget.remainingBudget} remaining, ${budget.spotsLeft} roster spots left, max legal bid $${budget.maximumLegalBid}.`,
  );

  if (sales.length) {
    console.log('Recent sales');
    console.table(
      sales.slice(-10).map((sale) => ({
        sale: sale.saleNumber,
        player: sale.playerName,
        position: sale.position,
        price: sale.price,
        team: sale.fantasyTeam,
      })),
    );
  }

  if (teams.length) {
    console.log('Observed team budgets');
    console.table(
      teams.map((team) => ({
        team: team.teamName,
        rostered: team.playersRostered,
        spent: team.spent,
        remaining: team.remainingBudget,
        maxBid: team.maxBid,
        discretionary: team.discretionaryBudget,
      })),
    );
  }

  console.groupEnd();
  return { sales: [...sales], teams, myBudget: budget };
}

function downloadJson(filename, value) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function startAuctionPracticeHelper({
  config = AUCTION_LEAGUE_CONFIG,
  autoBid = false,
} = {}) {
  let latest = { sales: [], teams: [], myBudget: buildMyBudgetState({ config }) };
  let latestNomination = null;
  let latestRecommendation = null;
  let playerPool = [];
  let playerPoolStatus = 'loading';
  const sessionLog = [];

  function logEvent(type, payload) {
    sessionLog.push({
      timestamp: new Date().toISOString(),
      type,
      payload,
    });
  }

  function enrichNomination(nomination) {
    if (!nomination || !playerPool.length) return nomination;
    const player = playerPool.find((candidate) => normalizeName(candidate?.name) === normalizeName(nomination.playerName));
    if (!player) return nomination;
    return {
      ...nomination,
      projectedPoints: nomination.projectedPoints ?? player.projectedPoints ?? null,
      experienceYears: player.experienceYears ?? null,
      playerPoolId: player.id ?? null,
    };
  }

  function createRecommendation(nomination, sales) {
    if (!nomination) return null;
    const enrichedNomination = enrichNomination(nomination);
    latestNomination = enrichedNomination;
    latestRecommendation = recommendBid({
      nomination: enrichedNomination,
      purchases: myPurchases(sales, config),
      sales,
      playerPool,
      config,
    });
    logEvent('recommendation', latestRecommendation);
    printRecommendation(latestRecommendation);
    return latestRecommendation;
  }

  const watcher = createEspnAuctionWatcher({
    onSale: (sale, sales) => {
      latest = printState(sales, config);
      logEvent('sale', sale);
    },
  });

  const nominationWatcher = createNominationWatcher({
    onNomination: (nomination) => {
      logEvent('nomination', nomination);
      createRecommendation(nomination, watcher.getSales());
    },
  });

  const autoBidController = createAutoBidController({
    enabled: false,
    getRecommendation: () => latestRecommendation,
    onBid: (bid) => {
      logEvent('auto-bid', bid);
      console.log(
        `🤖 AUTO-BID: ${bid.playerName} $${bid.submittedBid} / fixed ceiling $${bid.ceiling}`,
      );
    },
    onStateChange: (autoBidState) => {
      logEvent('auto-bid-state', autoBidState);
    },
  });

  const initialSales = watcher.start();
  latest = printState(initialSales, config);
  nominationWatcher.start();
  if (autoBid) {
    autoBidController.start();
    console.warn(
      '🤖 PRACTICE AUTO-BID ENABLED. The helper will place incremental $1 bids up to each fixed recommendation ceiling and stop when already winning or the ceiling is reached.',
    );
  }

  fetchEspnPlayerPool({ leagueId: config.leagueId, season: config.season })
    .then((pool) => {
      playerPool = pool;
      playerPoolStatus = 'loaded';
      logEvent('player-pool-loaded', { count: pool.length });
      console.log(`Auction player pool loaded: ${pool.length} players available for supply and keeper-flier analysis.`);
    })
    .catch((error) => {
      playerPoolStatus = 'error';
      logEvent('player-pool-error', { message: String(error?.message ?? error) });
      console.warn('Auction player pool could not be loaded; recommendations will use opponent demand without supply/rookie enrichment.', error);
    });

  logEvent('session-start', {
    version: HELPER_VERSION,
    config,
    cheatSheetVersion: AUCTION_CHEAT_SHEET.version,
    autoBidEnabled: Boolean(autoBid),
    myBudget: latest.myBudget,
  });

  const session = {
    version: HELPER_VERSION,
    config,
    cheatSheet: AUCTION_CHEAT_SHEET,
    watcher,
    nominationWatcher,
    autoBidController,
    getState: () => latest,
    getNomination: () => latestNomination,
    getRecommendation: () => latestRecommendation,
    getLogs: () => [...sessionLog],
    getPlayerPoolStatus: () => ({ status: playerPoolStatus, count: playerPool.length }),
    getAutoBidState: () => autoBidController.getState(),
    getAutoBidHistory: () => autoBidController.getHistory(),
    enableAutoBid: () => {
      const state = autoBidController.enable();
      logEvent('auto-bid-enabled', state);
      console.warn('🤖 PRACTICE AUTO-BID ENABLED.');
      return state;
    },
    disableAutoBid: () => {
      const state = autoBidController.stop();
      logEvent('auto-bid-disabled', state);
      console.warn('🛑 PRACTICE AUTO-BID DISABLED.');
      return state;
    },
    printState: () => printState(watcher.getSales(), config),
    exportLogs: () => {
      const snapshot = {
        exportedAt: new Date().toISOString(),
        version: HELPER_VERSION,
        config,
        cheatSheet: AUCTION_CHEAT_SHEET,
        sales: watcher.getSales(),
        state: printState(watcher.getSales(), config),
        playerPoolStatus: { status: playerPoolStatus, count: playerPool.length },
        autoBid: {
          state: autoBidController.getState(),
          history: autoBidController.getHistory(),
        },
        nomination: latestNomination,
        recommendation: latestRecommendation,
        events: [...sessionLog],
      };
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      downloadJson(`fantasy-auction-${stamp}.json`, snapshot);
      return snapshot;
    },
    stop: () => {
      watcher.stop();
      nominationWatcher.stop();
      autoBidController.stop();
      logEvent('session-stop', {});
    },
  };

  if (typeof window !== 'undefined') window.FantasyAuctionSession = session;
  return session;
}

if (typeof window !== 'undefined') {
  window.FantasyAuctionHelper = {
    version: HELPER_VERSION,
    config: AUCTION_LEAGUE_CONFIG,
    cheatSheet: AUCTION_CHEAT_SHEET,
    buildAuctionState,
    buildMyBudgetState,
    recommendBid,
    start: startAuctionPracticeHelper,
  };

  console.log(
    `Fantasy Auction Helper ${HELPER_VERSION} loaded. Run FantasyAuctionHelper.start() for recommendations or FantasyAuctionHelper.start({ autoBid: true }) for practice auto-bidding.`,
  );
}
