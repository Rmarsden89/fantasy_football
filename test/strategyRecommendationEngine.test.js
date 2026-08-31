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

function myPick(id, name, position, overallPick, nflTeam = null) {
  return { playerId: id, playerName: name, position, overallPick, nflTeam, fantasyTeam: LEAGUE_CONFIG.myTeamName };
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

test('RB WR and TE cannot duplicate the same NFL team at the same position', () => {
  const teamPlayers = [
    { id: 201, name: 'ATL RB Two', position: 'RB', nflTeam: 'ATL', projectedPoints: 245, consensusValue: 82, seasonOutlook: 'steady role' },
    { id: 202, name: 'ATL WR Two', position: 'WR', nflTeam: 'ATL', projectedPoints: 215, consensusValue: 82, seasonOutlook: 'steady role' },
    { id: 203, name: 'ATL TE Two', position: 'TE', nflTeam: 'ATL', projectedPoints: 185, consensusValue: 88, seasonOutlook: 'elite receiving role' },
    { id: 204, name: 'ATL QB', position: 'QB', nflTeam: 'ATL', projectedPoints: 390, consensusValue: 86, seasonOutlook: 'safe veteran starter' },
    { id: 205, name: 'TB RB', position: 'RB', nflTeam: 'TB', projectedPoints: 240, consensusValue: 80, seasonOutlook: 'steady role' },
  ];
  const board = scoreAvailablePlayers({
    players: teamPlayers,
    draftedPicks: [
      myPick(301, 'ATL RB One', 'RB', 8, 'ATL'),
      myPick(302, 'ATL WR One', 'WR', 9, 'ATL'),
      myPick(303, 'ATL TE One', 'TE', 24, 'ATL'),
    ],
    myTeamName: LEAGUE_CONFIG.myTeamName,
    config: LEAGUE_CONFIG,
    myOverallPicks: snakePicks,
  });

  assert.equal(board.some((p) => p.id === 201), false);
  assert.equal(board.some((p) => p.id === 202), false);
  assert.equal(board.some((p) => p.id === 203), false);
  assert.equal(board.some((p) => p.id === 204), true);
  assert.equal(board.some((p) => p.id === 205), true);
});

test('cross-position same-team combinations remain eligible', () => {
  const teamPlayers = [
    { id: 401, name: 'ATL WR', position: 'WR', nflTeam: 'ATL', projectedPoints: 220, consensusValue: 85, seasonOutlook: 'steady role' },
    { id: 402, name: 'ATL TE', position: 'TE', nflTeam: 'ATL', projectedPoints: 190, consensusValue: 90, seasonOutlook: 'elite receiving role' },
  ];
  const board = scoreAvailablePlayers({
    players: teamPlayers,
    draftedPicks: [myPick(400, 'ATL RB', 'RB', 8, 'ATL')],
    myTeamName: LEAGUE_CONFIG.myTeamName,
    config: LEAGUE_CONFIG,
    myOverallPicks: snakePicks,
  });

  assert.equal(board.some((p) => p.id === 401), true);
  assert.equal(board.some((p) => p.id === 402), true);
});
