import { LEAGUE_CONFIG, getMySnakePicks } from './config.js';
import { createEspnDraftWatcher } from './espnDraftWatcher.js';
import { fetchEspnPlayerPool } from './espnPlayerPool.js';
import { recommendPairs, scoreAvailablePlayers } from './recommendationEngine.js';

function printRecommendations(scored, pairs, count = 8) {
  console.group('Fantasy Draft Helper');
  console.table(
    scored.slice(0, count).map((player) => ({
      rank: scored.indexOf(player) + 1,
      player: player.name,
      position: player.position,
      projected: player.projectedPoints,
      espnRank: player.espnRank,
      score: player.draftScore,
      turnRisk: Number(player.components.turnRisk.toFixed(1)),
      rosterNeed: Number(player.components.rosterNeed.toFixed(1)),
    })),
  );

  console.table(
    pairs.slice(0, 5).map((pair, index) => ({
      rank: index + 1,
      pair: `${pair.first.name} + ${pair.second.name}`,
      positions: `${pair.first.position}/${pair.second.position}`,
      score: pair.pairScore,
    })),
  );
  console.groupEnd();
}

export async function startDraftHelper(overrides = {}) {
  const config = {
    ...LEAGUE_CONFIG,
    ...overrides,
    roster: { ...LEAGUE_CONFIG.roster, ...(overrides.roster || {}) },
    strategy: {
      ...LEAGUE_CONFIG.strategy,
      ...(overrides.strategy || {}),
      weights: {
        ...LEAGUE_CONFIG.strategy.weights,
        ...(overrides.strategy?.weights || {}),
      },
      replacementRanks: {
        ...LEAGUE_CONFIG.strategy.replacementRanks,
        ...(overrides.strategy?.replacementRanks || {}),
      },
    },
  };

  console.log('Loading ESPN player pool...');
  const players = await fetchEspnPlayerPool({
    leagueId: config.leagueId,
    season: config.season,
  });
  console.log(`Loaded ${players.length} ESPN players.`);

  const myOverallPicks = getMySnakePicks(18, config);
  let watcher;

  const recalculate = () => {
    const draftedPicks = watcher.getPicks();
    const scored = scoreAvailablePlayers({
      players,
      draftedPicks,
      myTeamName: config.myTeamName,
      config,
      myOverallPicks,
    });
    const pairs = recommendPairs(scored);

    window.__fantasyDraftHelper.state = {
      draftedPicks,
      scored,
      pairs,
      myOverallPicks,
    };

    printRecommendations(scored, pairs);
    return window.__fantasyDraftHelper.state;
  };

  watcher = createEspnDraftWatcher({
    teams: config.teams,
    onPick: () => recalculate(),
  });

  watcher.start();

  window.__fantasyDraftHelper = {
    config,
    players,
    watcher,
    state: null,
    recalculate,
    stop() {
      watcher.stop();
      console.log('Fantasy Draft Helper stopped.');
    },
  };

  recalculate();
  return window.__fantasyDraftHelper;
}

if (typeof window !== 'undefined') {
  window.startFantasyDraftHelper = startDraftHelper;
}
