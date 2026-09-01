import { AUCTION_LEAGUE_CONFIG, getActiveRosterSize } from './config.js';
import { createEspnAuctionWatcher } from './espnAuctionWatcher.js';
import { getDiscretionaryBudget, getMaximumBid } from './marketMath.js';

const HELPER_VERSION = '0.1.0-auction-practice';

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

function printState(sales, config = AUCTION_LEAGUE_CONFIG) {
  const teams = buildAuctionState(sales, config);
  console.group(`Fantasy Auction Helper ${HELPER_VERSION}`);
  console.log(`${sales.length} completed salary-cap sales detected.`);

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
  return { sales: [...sales], teams };
}

export function startAuctionPracticeHelper({ config = AUCTION_LEAGUE_CONFIG } = {}) {
  let latest = { sales: [], teams: [] };
  const watcher = createEspnAuctionWatcher({
    onSale: (_sale, sales) => {
      latest = printState(sales, config);
    },
  });

  const initialSales = watcher.start();
  latest = printState(initialSales, config);

  return {
    version: HELPER_VERSION,
    config,
    watcher,
    getState: () => latest,
    printState: () => printState(watcher.getSales(), config),
    stop: () => watcher.stop(),
  };
}

if (typeof window !== 'undefined') {
  window.FantasyAuctionHelper = {
    version: HELPER_VERSION,
    config: AUCTION_LEAGUE_CONFIG,
    buildAuctionState,
    start: startAuctionPracticeHelper,
  };

  console.log(
    `Fantasy Auction Helper ${HELPER_VERSION} loaded. Run FantasyAuctionHelper.start() in the console to begin.`,
  );
}
