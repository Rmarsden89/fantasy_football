import { LEAGUE_CONFIG, getMySnakePicks } from './config.js';
import { createEspnDraftWatcher } from './espnDraftWatcher.js';
import { fetchEspnPlayerPool } from './espnPlayerPool.js';
import { recommendPairs, scoreAvailablePlayers } from './recommendationEngine.js';

const HELPER_VERSION = '0.2.0-position-priority';

function printRecommendations(scored, pairs, count = 10) {
  console.group(`Fantasy Draft Helper ${HELPER_VERSION}`);

  const positionPriorities = scored.positionPriorities || {};
  console.log('Position priorities');
  console.table(
    Object.values(positionPriorities)
      .sort((a, b) => b.priority - a.priority)
      .map((item) => ({
        position: item.position,
        priority: item.priority,
        have: item.have,
        required: item.required,
        starterNeed: Number(item.components.starterNeed.toFixed(1)),
        flexNeed: Number(item.components.flexNeed.toFixed(1)),
        depthNeed: Number(item.components.depthNeed.toFixed(1)),
        depletion: Number(item.components.depletion.toFixed(1)),
        opponentDemand: Number(item.components.opponentDemand.toFixed(1)),
        turnPressure: Number(item.components.turnPressure.toFixed(1)),
      })),
  );

  console.log('Recommended players');
  console.table(
    scored.slice(0, count).map((player, index) => ({
      rank: index + 1,
      player: player.name,
      position: player.position,
      positionPriority: Number(player.positionPriority.toFixed(1)),
      projected: player.projectedPoints,
      espnRank: player.espnRank,
      score: player.draftScore,
      vor: Number(player.components.vor.toFixed(1)),
      tierDrop: Number(player.components.tierDrop.toFixed(1)),
      turnRisk: Number(player.components.turnRisk.toFixed(1)),
    })),
  );

  console.log('Best turn pairs');
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
      positionWeights: {
        ...LEAGUE_CONFIG.strategy.positionWeights,
        ...(overrides.strategy?.positionWeights || {}),
      },
      playerWeights: {
        ...LEAGUE_CONFIG.strategy.playerWeights,
        ...(overrides.strategy?.playerWeights || {}),
      },
      replacementRanks: {
        ...LEAGUE_CONFIG.strategy.replacementRanks,
        ...(overrides.strategy?.replacementRanks || {}),
      },
    },
  };

  console.log(`Starting Fantasy Draft Helper ${HELPER_VERSION}`);
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
      version: HELPER_VERSION,
      draftedPicks,
      scored,
      pairs,
      positionPriorities: scored.positionPriorities,
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
    version: HELPER_VERSION,
    config,
    players,
    watcher,
    state: null,
    recalculate,
    stop() {
      watcher.stop();
      console.log(`Fantasy Draft Helper ${HELPER_VERSION} stopped.`);
    },
  };

  recalculate();
  return window.__fantasyDraftHelper;
}

if (typeof window !== 'undefined') {
  window.startFantasyDraftHelper = startDraftHelper;
}
