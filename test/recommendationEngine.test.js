import test from 'node:test';
import assert from 'node:assert/strict';
import { LEAGUE_CONFIG } from '../src/config.js';
import {
  buildDraftState,
  getPicksUntilNextTurn,
  recommendPairs,
  scoreAvailablePlayers,
} from '../src/recommendationEngine.js';

const players = [
  { id: 1, name: 'QB One', position: 'QB', projectedPoints: 420, espnRank: 1 },
  { id: 2, name: 'QB Two', position: 'QB', projectedPoints: 395, espnRank: 5 },
  { id: 3, name: 'RB One', position: 'RB', projectedPoints: 325, espnRank: 3 },
  { id: 4, name: 'WR One', position: 'WR', projectedPoints: 290, espnRank: 4 },
  { id: 5, name: 'TE One', position: 'TE', projectedPoints: 230, espnRank: 10 },
];

test('drafted players are removed from the available pool', () => {
  const state = buildDraftState({
    players,
    draftedPicks: [{ playerId: 1, playerName: 'QB One', fantasyTeam: 'Other', overallPick: 1 }],
    myTeamName: LEAGUE_CONFIG.myTeamName,
  });

  assert.equal(state.available.some((player) => player.id === 1), false);
  assert.equal(state.available.length, 4);
});

test('next turn calculation is correct for the 8/9 snake slot', () => {
  assert.deepEqual(getPicksUntilNextTurn(9, [8, 9, 24, 25]), {
    nextPick: 24,
    picksUntil: 14,
  });
});

test('engine scores players and pair optimizer returns combinations', () => {
  const scored = scoreAvailablePlayers({
    players,
    draftedPicks: [],
    myTeamName: LEAGUE_CONFIG.myTeamName,
    config: LEAGUE_CONFIG,
    myOverallPicks: [8, 9, 24, 25],
  });

  assert.equal(scored.length, players.length);
  assert.ok(scored.every((player) => Number.isFinite(player.draftScore)));

  const pairs = recommendPairs(scored, 5);
  assert.ok(pairs.length > 0);
  assert.ok(pairs[0].pairScore >= pairs.at(-1).pairScore);
});
