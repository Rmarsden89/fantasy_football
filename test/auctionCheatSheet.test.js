import test from 'node:test';
import assert from 'node:assert/strict';

import { AUCTION_LEAGUE_CONFIG } from '../src/auction/config.js';
import { buildCheatSheetContext, buildCheatSheetState, getCheatSheetPlayer } from '../src/auction/cheatSheet.js';

const keepers = [
  { playerName: 'Bijan Robinson', position: 'RB', price: 90 },
  { playerName: 'Brock Bowers', position: 'TE', price: 28 },
];

test('cheat sheet recognizes elite RB targets', () => {
  const gibbs = getCheatSheetPlayer('Jahmyr Gibbs');
  assert.equal(gibbs.tier, 'STRETCH');
  assert.equal(gibbs.eliteRb, true);
  assert.equal(gibbs.targetRole, 'RB1');
});

test('Bijan keeper starts the draft with the elite RB goal filled', () => {
  const state = buildCheatSheetState({ roster: keepers, remainingBudget: 132 });
  assert.equal(state.eliteRbSecured, true);
  assert.equal(state.eliteRbName, 'Bijan Robinson');
  assert.equal(state.wrCount, 0);
});

test('second elite RB is de-prioritized behind open roster needs', () => {
  const context = buildCheatSheetContext({
    playerName: 'Jahmyr Gibbs',
    position: 'RB',
    roster: keepers,
    remainingBudget: 132,
    config: AUCTION_LEAGUE_CONFIG,
  });

  assert.equal(context.state.eliteRbSecured, true);
  assert.ok(context.preferenceMultiplier < 1);
  assert.equal(context.primaryGoal.additionalReserve, 0);
});

test('open WR starters can move preferred targets toward full market value but not above it', () => {
  const context = buildCheatSheetContext({
    playerName: 'Nico Collins',
    position: 'WR',
    roster: keepers,
    remainingBudget: 132,
    config: AUCTION_LEAGUE_CONFIG,
  });

  assert.equal(context.state.wrCount, 0);
  assert.ok(context.preferenceMultiplier <= 1);
  assert.ok(context.preferenceMultiplier >= 0.95);
});

test('Olave remains an ideal auction target rather than a keeper commitment', () => {
  const olave = getCheatSheetPlayer('Chris Olave');
  assert.equal(olave.tier, 'IDEAL');
  assert.equal(olave.position, 'WR');
});

test('tier urgency rises when a target is the last preferred WR left', () => {
  const sales = [
    { playerName: "Ja'Marr Chase", position: 'WR' },
    { playerName: 'Puka Nacua', position: 'WR' },
    { playerName: 'Amon-Ra St. Brown', position: 'WR' },
    { playerName: 'Jaxon Smith-Njigba', position: 'WR' },
    { playerName: 'CeeDee Lamb', position: 'WR' },
    { playerName: 'Drake London', position: 'WR' },
    { playerName: 'Nico Collins', position: 'WR' },
    { playerName: 'Garrett Wilson', position: 'WR' },
    { playerName: 'Rashee Rice', position: 'WR' },
    { playerName: 'A.J. Brown', position: 'WR' },
  ];
  const context = buildCheatSheetContext({
    playerName: 'Chris Olave',
    position: 'WR',
    roster: keepers,
    remainingBudget: 132,
    sales,
    config: AUCTION_LEAGUE_CONFIG,
  });

  assert.equal(context.scarcity.urgency, 'HIGH');
});

test('cheap rookie upside creates a keeper-flier signal', () => {
  const context = buildCheatSheetContext({
    playerName: 'Jadarian Price',
    position: 'RB',
    roster: keepers,
    remainingBudget: 132,
    marketValue: 20,
    experienceYears: 0,
    config: AUCTION_LEAGUE_CONFIG,
  });

  assert.equal(context.keeper.eligible, true);
  assert.equal(context.keeper.rookie, true);
  assert.equal(context.keeper.maximumBid, 8);
});

test('unknown experience is not automatically considered a rookie', () => {
  const context = buildCheatSheetContext({
    playerName: 'Unknown Player',
    position: 'WR',
    roster: keepers,
    remainingBudget: 132,
    marketValue: 5,
    experienceYears: null,
    config: AUCTION_LEAGUE_CONFIG,
  });

  assert.equal(context.keeper.rookie, false);
  assert.equal(context.keeper.eligible, false);
});
