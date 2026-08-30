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
  { id: 1, name: 'QB One', position: 'QB', projectedPoints: 420, espnRank: 1, consensusValue: 96 },
  { id: 2, name: 'QB Two', position: 'QB', projectedPoints: 395, espnRank: 5, consensusValue: 90 },
  { id: 3, name: 'RB One', position: 'RB', projectedPoints: 325, espnRank: 3, consensusValue: 95 },
  { id: 4, name: 'RB Two', position: 'RB', projectedPoints: 300, espnRank: 8, consensusValue: 88 },
  { id: 5, name: 'WR One', position: 'WR', projectedPoints: 290, espnRank: 4, consensusValue: 94 },
  { id: 11, name: 'WR Two', position: 'WR', projectedPoints: 270, espnRank: 12, consensusValue: 86 },
  { id: 6, name: 'TE Elite', position: 'TE', projectedPoints: 230, espnRank: 10, consensusValue: 92 },
  { id: 9, name: 'TE Two', position: 'TE', projectedPoints: 200, espnRank: 30, consensusValue: 75 },
  { id: 10, name: 'TE Three', position: 'TE', projectedPoints: 170, espnRank: 60, consensusValue: 55 },
  { id: 7, name: 'DST One', position: 'DST', projectedPoints: 240, espnRank: 200, consensusValue: 20 },
  { id: 8, name: 'K One', position: 'K', projectedPoints: 145, espnRank: 220, consensusValue: 10 },
];

const snakePicks = [8, 9, 24, 25, 40, 41];

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
    { playerId: 21, playerName: 'My QB', position: 'QB', fantasyTeam: LEAGUE_CONFIG.myTeamName, overallPick: 8 },
    { playerId: 22, playerName: 'My WR', position: 'WR', fantasyTeam: LEAGUE_CONFIG.myTeamName, overallPick: 9 },
    { playerId: 23, playerName: 'My WR2', position: 'WR', fantasyTeam: LEAGUE_CONFIG.myTeamName, overallPick: 24 },
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
    { playerId: 21, playerName: 'My QB1', position: 'QB', fantasyTeam: LEAGUE_CONFIG.myTeamName, overallPick: 8 },
    { playerId: 22, playerName: 'My QB2', position: 'QB', fantasyTeam: LEAGUE_CONFIG.myTeamName, overallPick: 9 },
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
    myOverallPicks: snakePicks,
  });
  assert.equal(scored.some((player) => player.position === 'TE'), false);
  assert.equal(scored.positionPriorities.TE.priority, 0);
  assert.equal(scored.positionPriorities.TE.eligible, false);
});

test('DST and kicker are not recommendation candidates before their late-round gates', () => {
  const scored = scoreAvailablePlayers({
    players,
    draftedPicks: [],
    myTeamName: LEAGUE_CONFIG.myTeamName,
    config: LEAGUE_CONFIG,
    myOverallPicks: snakePicks,
  });
  assert.equal(scored.some((player) => player.position === 'DST'), false);
  assert.equal(scored.some((player) => player.position === 'K'), false);
});

test('wait risk describes the following pick and is zero across the 8/9 turn', () => {
  const beforePick8 = Array.from({ length: 7 }, (_, index) => ({
    playerId: 100 + index,
    playerName: `Other ${index + 1}`,
    position: index < 2 ? 'QB' : 'WR',
    fantasyTeam: `Other Team ${index + 1}`,
    overallPick: index + 1,
  }));
  const scored = scoreAvailablePlayers({
    players,
    draftedPicks: beforePick8,
    myTeamName: LEAGUE_CONFIG.myTeamName,
    config: LEAGUE_CONFIG,
    myOverallPicks: snakePicks,
  });
  assert.equal(scored.nextPick, 8);
  assert.equal(scored.followingPick, 9);
  assert.equal(scored.picksUntilFollowing, 0);
  assert.ok(scored.every((player) => player.components.waitRisk === 0));
});

test('stable player score does not change merely because the current pick gets closer', () => {
  const afterFive = Array.from({ length: 5 }, (_, index) => ({
    playerId: 100 + index,
    playerName: `Other ${index + 1}`,
    position: 'QB',
    fantasyTeam: `Other Team ${index + 1}`,
    overallPick: index + 1,
  }));
  const afterSix = [
    ...afterFive,
    { playerId: 106, playerName: 'Other 6', position: 'QB', fantasyTeam: 'Other Team 6', overallPick: 6 },
  ];
  const first = scoreAvailablePlayers({
    players,
    draftedPicks: afterFive,
    myTeamName: LEAGUE_CONFIG.myTeamName,
    config: LEAGUE_CONFIG,
    myOverallPicks: snakePicks,
  });
  const second = scoreAvailablePlayers({
    players,
    draftedPicks: afterSix,
    myTeamName: LEAGUE_CONFIG.myTeamName,
    config: LEAGUE_CONFIG,
    myOverallPicks: snakePicks,
  });
  const firstRb = first.find((player) => player.id === 3);
  const secondRb = second.find((player) => player.id === 3);
  assert.equal(firstRb.draftScore, secondRb.draftScore);
});

test('turn pairs are built by rescoring the board after the simulated first pick', () => {
  const beforePick8 = Array.from({ length: 7 }, (_, index) => ({
    playerId: 100 + index,
    playerName: `Other ${index + 1}`,
    position: index < 2 ? 'QB' : 'WR',
    fantasyTeam: `Other Team ${index + 1}`,
    overallPick: index + 1,
  }));
  const scored = scoreAvailablePlayers({
    players,
    draftedPicks: beforePick8,
    myTeamName: LEAGUE_CONFIG.myTeamName,
    config: LEAGUE_CONFIG,
    myOverallPicks: snakePicks,
  });
  const pairs = recommendPairs({
    scoredPlayers: scored,
    players,
    draftedPicks: beforePick8,
    myTeamName: LEAGUE_CONFIG.myTeamName,
    config: LEAGUE_CONFIG,
    myOverallPicks: snakePicks,
    limit: 8,
  });
  assert.ok(pairs.length > 0);
  assert.ok(pairs.every((pair) => pair.simulatedAfterFirst === true));
  assert.ok(pairs.every((pair) => Number.isFinite(pair.secondScoreAfterFirst)));
  assert.ok(pairs[0].pairScore >= pairs.at(-1).pairScore);
});

test('pair recommendations are only shown before an immediate two-pick turn', () => {
  const afterPick8 = [
    { playerId: 3, playerName: 'RB One', position: 'RB', fantasyTeam: LEAGUE_CONFIG.myTeamName, overallPick: 8 },
  ];
  const scored = scoreAvailablePlayers({
    players,
    draftedPicks: afterPick8,
    myTeamName: LEAGUE_CONFIG.myTeamName,
    config: LEAGUE_CONFIG,
    myOverallPicks: snakePicks,
  });
  const pairs = recommendPairs({
    scoredPlayers: scored,
    players,
    draftedPicks: afterPick8,
    myTeamName: LEAGUE_CONFIG.myTeamName,
    config: LEAGUE_CONFIG,
    myOverallPicks: snakePicks,
  });
  assert.equal(scored.nextPick, 9);
  assert.equal(pairs.length, 0);
});

test('engine scores players and carries position priorities into player scores', () => {
  const scored = scoreAvailablePlayers({
    players,
    draftedPicks: [],
    myTeamName: LEAGUE_CONFIG.myTeamName,
    config: LEAGUE_CONFIG,
    myOverallPicks: snakePicks,
  });
  assert.equal(scored.length, players.length - 2);
  assert.ok(scored.every((player) => Number.isFinite(player.draftScore)));
  assert.ok(scored.every((player) => Number.isFinite(player.components.waitRisk)));
  assert.ok(scored.positionPriorities.RB);
});
