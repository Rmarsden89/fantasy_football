import test from 'node:test';
import assert from 'node:assert/strict';
import { LEAGUE_CONFIG } from '../src/config.js';
import {
  buildDraftState,
  computePositionPriorities,
  getPicksUntilNextTurn,
  recommendPairs,
  scoreAvailablePlayers,
} from '../src/recommendationEngine.js';

const players = [
  { id: 1, name: 'QB One', position: 'QB', projectedPoints: 420, espnRank: 1 },
  { id: 2, name: 'QB Two', position: 'QB', projectedPoints: 395, espnRank: 5 },
  { id: 3, name: 'RB One', position: 'RB', projectedPoints: 325, espnRank: 3 },
  { id: 4, name: 'RB Two', position: 'RB', projectedPoints: 300, espnRank: 8 },
  { id: 5, name: 'WR One', position: 'WR', projectedPoints: 290, espnRank: 4 },
  { id: 6, name: 'TE Elite', position: 'TE', projectedPoints: 230, espnRank: 10 },
  { id: 9, name: 'TE Two', position: 'TE', projectedPoints: 200, espnRank: 30 },
  { id: 10, name: 'TE Three', position: 'TE', projectedPoints: 170, espnRank: 60 },
  { id: 7, name: 'DST One', position: 'DST', projectedPoints: 240, espnRank: 200 },
  { id: 8, name: 'K One', position: 'K', projectedPoints: 145, espnRank: 220 },
];

test('drafted players are removed from the available pool', () => {
  const state = buildDraftState({
    players,
    draftedPicks: [{ playerId: 1, playerName: 'QB One', fantasyTeam: 'Other', overallPick: 1 }],
    myTeamName: LEAGUE_CONFIG.myTeamName,
  });

  assert.equal(state.available.some((player) => player.id === 1), false);
  assert.equal(state.available.length, players.length - 1);
});

test('next turn calculation is correct for the 8/9 snake slot', () => {
  assert.deepEqual(getPicksUntilNextTurn(9, [8, 9, 24, 25]), {
    nextPick: 24,
    picksUntil: 14,
  });
});

test('missing starters drive position priority ahead of filled positions', () => {
  const draftedPicks = [
    { playerId: 11, playerName: 'My QB', position: 'QB', fantasyTeam: LEAGUE_CONFIG.myTeamName, overallPick: 8 },
    { playerId: 12, playerName: 'My WR', position: 'WR', fantasyTeam: LEAGUE_CONFIG.myTeamName, overallPick: 9 },
    { playerId: 13, playerName: 'My WR2', position: 'WR', fantasyTeam: LEAGUE_CONFIG.myTeamName, overallPick: 24 },
  ];

  const priorities = computePositionPriorities({
    draftedPicks,
    myTeamName: LEAGUE_CONFIG.myTeamName,
    config: LEAGUE_CONFIG,
    players,
    picksUntilNextTurn: 14,
    currentRound: 4,
  });

  assert.ok(priorities.RB.priority > priorities.WR.priority);
  assert.ok(priorities.QB.priority > priorities.WR.priority);
});

test('filled QB starters reduce QB priority relative to empty RB starters', () => {
  const draftedPicks = [
    { playerId: 11, playerName: 'My QB1', position: 'QB', fantasyTeam: LEAGUE_CONFIG.myTeamName, overallPick: 8 },
    { playerId: 12, playerName: 'My QB2', position: 'QB', fantasyTeam: LEAGUE_CONFIG.myTeamName, overallPick: 9 },
  ];

  const priorities = computePositionPriorities({
    draftedPicks,
    myTeamName: LEAGUE_CONFIG.myTeamName,
    config: LEAGUE_CONFIG,
    players,
    picksUntilNextTurn: 14,
    currentRound: 4,
  });

  assert.ok(priorities.RB.priority > priorities.QB.priority);
  assert.equal(priorities.QB.components.starterNeed, 0);
  assert.equal(priorities.RB.components.starterNeed, 100);
});

test('an elite starting TE makes TE2 a very low priority', () => {
  const draftedPicks = [
    { playerId: 6, playerName: 'TE Elite', position: 'TE', fantasyTeam: LEAGUE_CONFIG.myTeamName, overallPick: 8 },
  ];

  const priorities = computePositionPriorities({
    draftedPicks,
    myTeamName: LEAGUE_CONFIG.myTeamName,
    config: LEAGUE_CONFIG,
    players,
    picksUntilNextTurn: 14,
    currentRound: 6,
  });

  assert.equal(priorities.TE.bestRosterTePositionRank, 1);
  assert.ok(priorities.TE.priority <= LEAGUE_CONFIG.strategy.tightEndStrategy.eliteStarterPriorityCap);
  assert.equal(priorities.TE.components.flexNeed, 0);
});

test('a third TE is never a recommendation candidate', () => {
  const draftedPicks = [
    { playerId: 6, playerName: 'TE Elite', position: 'TE', fantasyTeam: LEAGUE_CONFIG.myTeamName, overallPick: 8 },
    { playerId: 9, playerName: 'TE Two', position: 'TE', fantasyTeam: LEAGUE_CONFIG.myTeamName, overallPick: 25 },
  ];

  const scored = scoreAvailablePlayers({
    players,
    draftedPicks,
    myTeamName: LEAGUE_CONFIG.myTeamName,
    config: LEAGUE_CONFIG,
    myOverallPicks: [8, 9, 24, 25, 40, 41],
  });

  assert.equal(scored.some((player) => player.position === 'TE'), false);
  assert.equal(scored.positionPriorities.TE.priority, 0);
  assert.equal(scored.positionPriorities.TE.eligible, false);
});

test('pair recommendations do not spend both turn picks on tight ends', () => {
  const scored = scoreAvailablePlayers({
    players,
    draftedPicks: [],
    myTeamName: LEAGUE_CONFIG.myTeamName,
    config: LEAGUE_CONFIG,
    myOverallPicks: [8, 9, 24, 25],
  });

  const pairs = recommendPairs(scored, 10);
  assert.equal(pairs.some((pair) => pair.first.position === 'TE' && pair.second.position === 'TE'), false);
});

test('DST and kicker are not recommendation candidates before their late-round gates', () => {
  const scored = scoreAvailablePlayers({
    players,
    draftedPicks: [],
    myTeamName: LEAGUE_CONFIG.myTeamName,
    config: LEAGUE_CONFIG,
    myOverallPicks: [8, 9, 24, 25],
  });

  assert.equal(scored.some((player) => player.position === 'DST'), false);
  assert.equal(scored.some((player) => player.position === 'K'), false);
  assert.equal(scored.positionPriorities.DST.priority, 0);
  assert.equal(scored.positionPriorities.K.priority, 0);
});

test('engine scores players and carries position priorities into player scores', () => {
  const scored = scoreAvailablePlayers({
    players,
    draftedPicks: [],
    myTeamName: LEAGUE_CONFIG.myTeamName,
    config: LEAGUE_CONFIG,
    myOverallPicks: [8, 9, 24, 25],
  });

  assert.equal(scored.length, players.length - 2);
  assert.ok(scored.every((player) => Number.isFinite(player.draftScore)));
  assert.ok(scored.positionPriorities.RB);

  const pairs = recommendPairs(scored, 8);
  assert.ok(pairs.length > 0);
  assert.ok(pairs[0].pairScore >= pairs.at(-1).pairScore);
});
