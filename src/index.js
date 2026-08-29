import { LEAGUE_CONFIG, getMySnakePicks } from './config.js';
import { createEspnDraftWatcher } from './espnDraftWatcher.js';
import { fetchEspnPlayerPool } from './espnPlayerPool.js';
import { recommendPairs, scoreAvailablePlayers } from './recommendationEngine.js';

const HELPER_VERSION = '0.2.1-position-priority-logging';

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

function downloadText(filename, text, type = 'application/json') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function buildHistorySnapshot({ draftedPicks, scored, pairs, myTeamName }) {
  const lastPick = draftedPicks.at(-1) || null;
  const nextPick = scored[0]?.nextPick ?? null;
  const picksUntilNextTurn = scored[0]?.picksUntilNextTurn ?? null;
  const myRoster = draftedPicks
    .filter((pick) => pick.fantasyTeam === myTeamName)
    .map((pick) => ({
      overallPick: pick.overallPick,
      round: pick.round,
      roundPick: pick.roundPick,
      playerId: pick.playerId,
      playerName: pick.playerName,
      nflTeam: pick.nflTeam,
      position: pick.position,
    }));

  const positionPriorities = Object.values(scored.positionPriorities || {})
    .sort((a, b) => b.priority - a.priority)
    .map((item) => ({
      position: item.position,
      priority: item.priority,
      have: item.have,
      required: item.required,
      ...item.components,
    }));

  const recommendations = scored.slice(0, 20).map((player, index) => ({
    rank: index + 1,
    playerId: player.id,
    playerName: player.name,
    position: player.position,
    projectedPoints: player.projectedPoints,
    espnRank: player.espnRank,
    averageDraftPosition: player.averageDraftPosition,
    draftScore: player.draftScore,
    positionPriority: player.positionPriority,
    ...player.components,
  }));

  const pairRecommendations = pairs.slice(0, 10).map((pair, index) => ({
    rank: index + 1,
    firstPlayer: pair.first.name,
    firstPosition: pair.first.position,
    secondPlayer: pair.second.name,
    secondPosition: pair.second.position,
    pairScore: pair.pairScore,
  }));

  return {
    timestamp: new Date().toISOString(),
    afterOverallPick: lastPick?.overallPick ?? 0,
    lastPick,
    nextPick,
    picksUntilNextTurn,
    myRoster,
    positionPriorities,
    recommendations,
    pairRecommendations,
  };
}

function historyToCsv(history) {
  const headers = [
    'timestamp',
    'afterOverallPick',
    'nextPick',
    'picksUntilNextTurn',
    'recommendationRank',
    'playerId',
    'playerName',
    'position',
    'draftScore',
    'positionPriority',
    'projectedPoints',
    'espnRank',
    'averageDraftPosition',
    'vor',
    'withinPositionValue',
    'tierDrop',
    'turnRisk',
  ];

  const rows = [headers.join(',')];
  for (const snapshot of history) {
    for (const rec of snapshot.recommendations) {
      rows.push([
        snapshot.timestamp,
        snapshot.afterOverallPick,
        snapshot.nextPick,
        snapshot.picksUntilNextTurn,
        rec.rank,
        rec.playerId,
        rec.playerName,
        rec.position,
        rec.draftScore,
        rec.positionPriority,
        rec.projectedPoints,
        rec.espnRank,
        rec.averageDraftPosition,
        rec.vor,
        rec.withinPositionValue,
        rec.tierDrop,
        rec.turnRisk,
      ].map(csvEscape).join(','));
    }
  }
  return rows.join('\n');
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
  const history = [];
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
    const snapshot = buildHistorySnapshot({
      draftedPicks,
      scored,
      pairs,
      myTeamName: config.myTeamName,
    });

    const prior = history.at(-1);
    if (!prior || prior.afterOverallPick !== snapshot.afterOverallPick) {
      history.push(snapshot);
    } else {
      history[history.length - 1] = snapshot;
    }

    window.__fantasyDraftHelper.state = {
      version: HELPER_VERSION,
      draftedPicks,
      scored,
      pairs,
      positionPriorities: scored.positionPriorities,
      myOverallPicks,
      history,
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
    history,
    recalculate,
    exportLogs(filename = `fantasy-draft-${Date.now()}.json`) {
      const payload = {
        version: HELPER_VERSION,
        exportedAt: new Date().toISOString(),
        config,
        history,
        finalState: window.__fantasyDraftHelper.state,
      };
      downloadText(filename, JSON.stringify(payload, null, 2));
      console.log(`Exported ${history.length} draft snapshots to ${filename}`);
    },
    exportCsv(filename = `fantasy-draft-recommendations-${Date.now()}.csv`) {
      downloadText(filename, historyToCsv(history), 'text/csv;charset=utf-8');
      console.log(`Exported recommendation history to ${filename}`);
    },
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
