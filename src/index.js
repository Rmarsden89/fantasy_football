import { LEAGUE_CONFIG, getMySnakePicks } from './config.js';
import { applyConsensusModel } from './consensusModel.js';
import { createEspnDraftWatcher } from './espnDraftWatcher.js';
import { fetchEspnPlayerPool } from './espnPlayerPool.js';
import { recommendPairs, scoreAvailablePlayers } from './recommendationEngine.js';

const HELPER_VERSION = '0.3.3-need-vs-value';

function printRecommendations(scored, pairs, count = 10) {
  console.group(`Fantasy Draft Helper ${HELPER_VERSION}`);
  console.log(`Round ${scored.currentRound} scoring phase`, scored.phaseWeights);

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
        starterUrgency: item.missingStarterUrgencyMultiplier,
        saturation: item.saturationMultiplier,
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
      bye: player.byeWeek,
      score: player.draftScore,
      positionPriority: Number(player.positionPriority.toFixed(1)),
      basePositionPriority: Number((player.basePositionPriority ?? player.positionPriority).toFixed(1)),
      needQuality: Number((player.needQualityMultiplier ?? 1).toFixed(2)),
      consensusRank: player.consensusRank,
      sources: player.consensusSourceCount,
      projected: player.projectedPoints,
      adp: player.averageDraftPosition,
      upside: Number(player.components.upside.toFixed(1)),
      vor: Number(player.components.vor.toFixed(1)),
      waitRisk: Number(player.components.waitRisk.toFixed(1)),
      byeTie: Number(player.components.byeTiebreak.toFixed(1)),
      saturation: player.saturationMultiplier,
    })),
  );

  if (pairs.length) {
    console.log('Best sequential turn pairs');
    console.table(
      pairs.slice(0, 5).map((pair, index) => ({
        rank: index + 1,
        pair: `${pair.first.name} + ${pair.second.name}`,
        positions: `${pair.first.position}/${pair.second.position}`,
        firstScore: pair.first.draftScore,
        secondScoreAfterFirst: pair.secondScoreAfterFirst,
        pairScore: pair.pairScore,
      })),
    );
  } else {
    console.log('No immediate two-pick turn pair at this selection.');
  }
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
      rawPriority: item.rawPriority,
      missingStarterUrgencyMultiplier: item.missingStarterUrgencyMultiplier,
      have: item.have,
      required: item.required,
      saturationMultiplier: item.saturationMultiplier,
      ...item.components,
    }));

  const recommendations = scored.slice(0, 20).map((player, index) => ({
    rank: index + 1,
    playerId: player.id,
    playerName: player.name,
    position: player.position,
    byeWeek: player.byeWeek,
    projectedPoints: player.projectedPoints,
    espnRank: player.espnRank,
    averageDraftPosition: player.averageDraftPosition,
    consensusRank: player.consensusRank,
    consensusValue: player.consensusValue,
    consensusSourceCount: player.consensusSourceCount,
    marketGap: player.marketGap,
    draftScore: player.draftScore,
    positionPriority: player.positionPriority,
    basePositionPriority: player.basePositionPriority,
    needQualityMultiplier: player.needQualityMultiplier,
    saturationMultiplier: player.saturationMultiplier,
    ...player.components,
  }));

  const pairRecommendations = pairs.slice(0, 10).map((pair, index) => ({
    rank: index + 1,
    firstPlayer: pair.first.name,
    firstPosition: pair.first.position,
    firstScore: pair.first.draftScore,
    secondPlayer: pair.second.name,
    secondPosition: pair.second.position,
    secondScoreAfterFirst: pair.secondScoreAfterFirst,
    pairScore: pair.pairScore,
    sequentialSimulation: pair.simulatedAfterFirst === true,
  }));

  return {
    timestamp: new Date().toISOString(),
    afterOverallPick: lastPick?.overallPick ?? 0,
    lastPick,
    nextPick,
    picksUntilNextTurn,
    followingPick: scored.followingPick ?? null,
    picksUntilFollowing: scored.picksUntilFollowing ?? null,
    currentRound: scored.currentRound,
    scoringPhaseWeights: scored.phaseWeights,
    myRoster,
    positionPriorities,
    recommendations,
    pairRecommendations,
  };
}

function historyToCsv(history) {
  const headers = [
    'timestamp', 'afterOverallPick', 'nextPick', 'picksUntilNextTurn', 'followingPick',
    'picksUntilFollowing', 'currentRound', 'recommendationRank', 'playerId', 'playerName',
    'position', 'byeWeek', 'draftScore', 'positionPriority', 'basePositionPriority',
    'needQualityMultiplier', 'saturationMultiplier', 'projectedPoints', 'espnRank',
    'averageDraftPosition', 'consensusRank', 'consensusValue', 'consensusSourceCount',
    'marketGap', 'upside', 'vor', 'withinPositionValue', 'tierDrop', 'waitRisk', 'byeTiebreak',
  ];
  const rows = [headers.join(',')];
  for (const snapshot of history) {
    for (const rec of snapshot.recommendations) {
      rows.push([
        snapshot.timestamp, snapshot.afterOverallPick, snapshot.nextPick,
        snapshot.picksUntilNextTurn, snapshot.followingPick, snapshot.picksUntilFollowing,
        snapshot.currentRound, rec.rank, rec.playerId, rec.playerName, rec.position, rec.byeWeek,
        rec.draftScore, rec.positionPriority, rec.basePositionPriority, rec.needQualityMultiplier,
        rec.saturationMultiplier, rec.projectedPoints, rec.espnRank, rec.averageDraftPosition,
        rec.consensusRank, rec.consensusValue, rec.consensusSourceCount, rec.marketGap, rec.upside,
        rec.vor, rec.withinPositionValue, rec.tierDrop, rec.waitRisk, rec.byeTiebreak,
      ].map(csvEscape).join(','));
    }
  }
  return rows.join('\n');
}

function mergeConfig(overrides = {}) {
  return {
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
      replacementRanks: {
        ...LEAGUE_CONFIG.strategy.replacementRanks,
        ...(overrides.strategy?.replacementRanks || {}),
      },
      consensus: {
        ...LEAGUE_CONFIG.strategy.consensus,
        ...(overrides.strategy?.consensus || {}),
        sourceWeights: {
          ...LEAGUE_CONFIG.strategy.consensus.sourceWeights,
          ...(overrides.strategy?.consensus?.sourceWeights || {}),
        },
      },
      tightEndStrategy: {
        ...LEAGUE_CONFIG.strategy.tightEndStrategy,
        ...(overrides.strategy?.tightEndStrategy || {}),
        playerQualityGate: {
          ...LEAGUE_CONFIG.strategy.tightEndStrategy.playerQualityGate,
          ...(overrides.strategy?.tightEndStrategy?.playerQualityGate || {}),
        },
      },
      phaseWeights: {
        ...LEAGUE_CONFIG.strategy.phaseWeights,
        ...(overrides.strategy?.phaseWeights || {}),
      },
      decisionContext: {
        ...LEAGUE_CONFIG.strategy.decisionContext,
        ...(overrides.strategy?.decisionContext || {}),
      },
    },
  };
}

export async function startDraftHelper(overrides = {}) {
  const config = mergeConfig(overrides);
  console.log(`Starting Fantasy Draft Helper ${HELPER_VERSION}`);
  console.log('Loading ESPN player pool...');
  const espnPlayers = await fetchEspnPlayerPool({ leagueId: config.leagueId, season: config.season });

  const externalRankings = overrides.externalRankings || window.__fantasyConsensusData || {};
  const players = applyConsensusModel(espnPlayers, {
    sourceWeights: config.strategy.consensus.sourceWeights,
    rankCeiling: config.strategy.consensus.rankCeiling,
    externalRankings,
  });
  const externalSources = Object.keys(externalRankings);
  console.log(`Loaded ${players.length} players. Consensus sources: ESPN rank, market ADP${externalSources.length ? `, ${externalSources.join(', ')}` : ''}.`);
  if (!externalSources.length) {
    console.info('External consensus source not loaded yet; ESPN rank + market ADP are the active baseline inputs.');
  }

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
    const pairs = recommendPairs({
      scoredPlayers: scored,
      players,
      draftedPicks,
      myTeamName: config.myTeamName,
      config,
      myOverallPicks,
    });
    const snapshot = buildHistorySnapshot({ draftedPicks, scored, pairs, myTeamName: config.myTeamName });
    const prior = history.at(-1);
    if (!prior || prior.afterOverallPick !== snapshot.afterOverallPick) history.push(snapshot);
    else history[history.length - 1] = snapshot;

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

  watcher = createEspnDraftWatcher({ teams: config.teams, onPick: () => recalculate() });
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
        consensusSources: ['espnRank', 'marketAdp', ...externalSources],
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

if (typeof window !== 'undefined') window.startFantasyDraftHelper = startDraftHelper;
