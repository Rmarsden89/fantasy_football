import test from 'node:test';
import assert from 'node:assert/strict';
import { LEAGUE_CONFIG } from '../src/config.js';
import { scoreAvailablePlayers } from '../src/strategyRecommendationEngine.js';

const snakePicks = [8, 9, 24, 25, 40, 41, 56, 57, 72, 73, 88, 89, 104, 105, 120, 121, 136, 137];

const players = [
  { id: 1, name: 'QB Safe', position: 'QB', projectedPoints: 390, consensusValue: 90, seasonOutlook: 'safe veteran starter' },
  { id: 2, name: 'QB Upside', position: 'QB', projectedPoints: 370, consensusValue: 76, seasonOutlook: 'breakout upside high ceiling' },
  { id: 3, name: 'RB Safe', position: 'RB', projectedPoints: 250, consensusValue: 82, seasonOutlook: 'steady role' },
  { id: 4, name: 'RB Upside', position: 'RB', projectedPoints: 235, consensusValue: 72, seasonOutlook: 'rookie breakout upside high ceiling' },
  { id: 5, name: 'WR Safe', position: 'WR', projectedPoints: 220, consensusValue: 82, seasonOutlook: 'steady role' },
  { id: 6, name: 'WR Upside', position: 'WR', projectedPoints: 205, consensusValue: 72, seasonOutlook: 'rookie breakout upside high ceiling' },
];

function myPick(id, name, position, overallPick) {
  return { playerId: id, playerName: name, position, overallPick, fantasyTeam: LEAGUE_CONFIG.myTeamName };
}

test('QB2 suppresses upside while QB3 boosts it', () => {
  const qb2Board = scoreAvailablePlayers({
    players,
    draftedPicks: [myPick(100, 'Roster QB1', 'QB', 8)],
    myTeamName: LEAGUE_CONFIG.myTeamName,
    config: LEAGUE_CONFIG,
    myOverallPicks: snakePicks,
  });
  const qb2 = qb2Board.find((p) => p.id === 2);
  assert.equal(qb2.components.upsideMultiplier, 0.15);

  const qb3Board = scoreAvailablePlayers({
    players,
    draftedPicks: [
      myPick(100, 'Roster QB1', 'QB', 8),
      myPick(101, 'Roster QB2', 'QB', 9),
    ],
    myTeamName: LEAGUE_CONFIG.myTeamName,
    config: LEAGUE_CONFIG,
    myOverallPicks: snakePicks,
  });
  const qb3 = qb3Board.find((p) => p.id === 2);
  assert.equal(qb3.components.upsideMultiplier, 1.3);
});

test('RB3/RB4 are upside-chasing roster spots', () => {
  const board = scoreAvailablePlayers({
    players,
    draftedPicks: [
      myPick(100, 'Roster RB1', 'RB', 8),
      myPick(101, 'Roster RB2', 'RB', 9),
    ],
    myTeamName: LEAGUE_CONFIG.myTeamName,
    config: LEAGUE_CONFIG,
    myOverallPicks: snakePicks,
  });
  const upside = board.find((p) => p.id === 4);
  assert.equal(upside.components.upsideMultiplier, 1.35);
  assert.ok(upside.components.upside > upside.components.upsideBase);
});

test('WR4 begins the stronger upside preference', () => {
  const board = scoreAvailablePlayers({
    players,
    draftedPicks: [
      myPick(100, 'Roster WR1', 'WR', 8),
      myPick(101, 'Roster WR2', 'WR', 9),
      myPick(102, 'Roster WR3', 'WR', 24),
    ],
    myTeamName: LEAGUE_CONFIG.myTeamName,
    config: LEAGUE_CONFIG,
    myOverallPicks: snakePicks,
  });
  const upside = board.find((p) => p.id === 6);
  assert.equal(upside.components.upsideMultiplier, 1.3);
});

test('fourth QB is not a recommendation candidate', () => {
  const board = scoreAvailablePlayers({
    players,
    draftedPicks: [
      myPick(100, 'Roster QB1', 'QB', 8),
      myPick(101, 'Roster QB2', 'QB', 9),
      myPick(102, 'Roster QB3', 'QB', 24),
    ],
    myTeamName: LEAGUE_CONFIG.myTeamName,
    config: LEAGUE_CONFIG,
    myOverallPicks: snakePicks,
  });
  assert.equal(board.some((p) => p.position === 'QB'), false);
});
