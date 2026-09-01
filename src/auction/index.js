import { AUCTION_LEAGUE_CONFIG, getActiveRosterSize } from './config.js';
import { createEspnAuctionWatcher } from './espnAuctionWatcher.js';
import { createNominationWatcher } from './nominationWatcher.js';
import { buildMyBudgetState, recommendBid } from './bidRecommendation.js';
import { getDiscretionaryBudget, getMaximumBid } from './marketMath.js';

const HELPER_VERSION = '0.3.2-structured-nomination';

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
    haveAtPosition: recommendation.positionHave,
    positionLimit: recommendation.positionLimit,
    bidWhenNominated: recommendation.currentBid,
    espnValue: recommendation.marketValue,
    roleAdjustedValue: recommendation.roleAdjustedMarketValue,
    buyAtOrBelow: recommendation.buyAtOrBelow,
    strategicMax: recommendation.strategicMaximumBid,
    remainingBudget: recommendation.remainingBudget,
    reserveAfterWin: recommendation.strategicReserveAfterWin,
    maxLegalBid: recommendation.maximumLegalBid,
  }]);

  const roleText = recommendation.role === 'STARTER'
    ? 'fills an open starter'
    : recommendation.role === 'FLEX'
      ? 'would fill FLEX'
      : recommendation.role === 'BENCH'
        ? 'would be depth/bench'
        : 'position is already full';

  console.log(
    `${recommendation.playerName}: recommended ceiling is $${recommendation.buyAtOrBelow} — ${roleText}; `
    + `$${recommendation.strategicReserveAfterWin} remains protected for the rest of the roster after the win. `
    + 'This ceiling is fixed for the nomination and will not move with live bids.',
  );
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

export function startAuctionPracticeHelper({ config = AUCTION_LEAGUE_CONFIG } = {}) {
  let latest = { sales: [], teams: [], myBudget: buildMyBudgetState({ config }) };
  let latestNomination = null;
  let latestRecommendation = null;
  const sessionLog = [];

  function logEvent(type, payload) {
    sessionLog.push({
      timestamp: new Date().toISOString(),
      type,
      payload,
    });
  }

  function createRecommendation(nomination, sales) {
    if (!nomination) return null;
    latestNomination = nomination;
    latestRecommendation = recommendBid({
      nomination,
      purchases: myPurchases(sales, config),
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
      // Deliberately do not recalculate the just-completed nomination here.
      // The next recommendation is created only when ESPN shows a new nominee.
    },
  });

  const nominationWatcher = createNominationWatcher({
    onNomination: (nomination) => {
      logEvent('nomination', nomination);
      createRecommendation(nomination, watcher.getSales());
    },
  });

  const initialSales = watcher.start();
  latest = printState(initialSales, config);
  nominationWatcher.start();
  logEvent('session-start', {
    version: HELPER_VERSION,
    config,
    myBudget: latest.myBudget,
  });

  const session = {
    version: HELPER_VERSION,
    config,
    watcher,
    nominationWatcher,
    getState: () => latest,
    getNomination: () => latestNomination,
    getRecommendation: () => latestRecommendation,
    getLogs: () => [...sessionLog],
    printState: () => printState(watcher.getSales(), config),
    exportLogs: () => {
      const snapshot = {
        exportedAt: new Date().toISOString(),
        version: HELPER_VERSION,
        config,
        sales: watcher.getSales(),
        state: printState(watcher.getSales(), config),
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
    buildAuctionState,
    buildMyBudgetState,
    recommendBid,
    start: startAuctionPracticeHelper,
  };

  console.log(
    `Fantasy Auction Helper ${HELPER_VERSION} loaded. Run FantasyAuctionHelper.start() in the console to begin.`,
  );
}
