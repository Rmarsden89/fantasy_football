import test from 'node:test';
import assert from 'node:assert/strict';

import { AUCTION_LEAGUE_CONFIG } from '../src/auction/config.js';
import { buildCheatSheetContext, buildCheatSheetState, getCheatSheetPlayer } from '../src/auction/cheatSheet.js';

const keepers = [
  { playerName: 'Brock Bowers', position: 'TE', price: 28 },
  { playerName: 'Chris Olave', position: 'WR', price: 25 },
];

test('cheat sheet recognizes elite RB targets', () => {
  const gibbs = getCheatSheetPlayer('Jahmyr Gibbs');
  assert.equal(gibbs.tier, 'STRETCH');
  assert.equal(gibbs.eliteRb, true);
  assert.equal(gibbs.targetRole, 'RB1');
});

test('elite RB preference is a soft boost rather than a hard dollar cap', () => {
  const context = buildCheatSheetContext({
    playerName: 'Jahmyr Gibbs',
    position: 'RB',
    roster: keepers,
    remainingBudget: 197,
    config: AUCTION_LEAGUE_CONFIG,
  });

  assert.equal(context.state.eliteRbSecured, false);
  assert.equal(context.state.budgetMode, 'AGGRESSIVE');
  assert.ok(context.preferenceMultiplier > 1);
  assert.equal(context.maximumCheatSheetBid, null);
  assert.equal(context.primaryGoal.additionalReserve, 0);
});

test('non-RB purchases preserve extra budget while elite RB targets remain', () => {
  const context = buildCheatSheetContext({
    playerName: 'Puka Nacua',
    position: 'WR',
    roster: keepers,
    remainingBudget: 197,
    config: AUCTION_LEAGUE_CONFIG,
  });

  assert.equal(context.primaryGoal.open, true);
  assert.equal(context.primaryGoal.targetReserve, 85);
  assert.equal(context.primaryGoal.additionalReserve, 57);
});

test('elite RB chase turns down after one is secured', () => {
  const roster = [
    ...keepers,
    { playerName: 'Jahmyr Gibbs', position: 'RB', price: 90 },
  ];

  const state = buildCheatSheetState({ roster, remainingBudget: 107 });
  const context = buildCheatSheetContext({
    playerName: 'Jonathan Taylor',
    position: 'RB',
    roster,
    remainingBudget: 107,
    config: AUCTION_LEAGUE_CONFIG,
  });

  assert.equal(state.eliteRbSecured, true);
  assert.equal(state.eliteRbName, 'Jahmyr Gibbs');
  assert.ok(context.preferenceMultiplier < 1);
  assert.equal(context.primaryGoal.additionalReserve, 0);
});

test('tier urgency rises when a target is the last stretch RB left', () => {
  const sales = [
    { playerName: 'Bijan Robinson', position: 'RB' },
    { playerName: 'Jonathan Taylor', position: 'RB' },
    { playerName: "De'Von Achane", position: 'RB' },
    { playerName: 'Christian McCaffrey', position: 'RB' },
  ];
  const context = buildCheatSheetContext({
    playerName: 'Jahmyr Gibbs',
    position: 'RB',
    roster: keepers,
    remainingBudget: 197,
    sales,
    config: AUCTION_LEAGUE_CONFIG,
  });

  assert.equal(context.scarcity.urgency, 'HIGH');
  assert.equal(context.state.board.RB.byTier.STRETCH.remaining, 1);
});

test('cheap rookie upside creates a keeper-flier signal', () => {
  const context = buildCheatSheetContext({
    playerName: 'Jadarian Price',
    position: 'RB',
    roster: keepers,
    remainingBudget: 197,
    marketValue: 20,
    experienceYears: 0,
    config: AUCTION_LEAGUE_CONFIG,
  });

  assert.equal(context.keeper.eligible, true);
  assert.equal(context.keeper.rookie, true);
  assert.equal(context.keeper.maximumBid, 8);
});
