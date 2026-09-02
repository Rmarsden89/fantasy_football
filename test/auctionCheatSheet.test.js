import test from 'node:test';
import assert from 'node:assert/strict';

import { buildCheatSheetContext, buildCheatSheetState, getCheatSheetPlayer } from '../src/auction/cheatSheet.js';

test('cheat sheet recognizes elite RB targets', () => {
  const gibbs = getCheatSheetPlayer('Jahmyr Gibbs');
  assert.equal(gibbs.tier, 'STRETCH');
  assert.equal(gibbs.eliteRb, true);
  assert.equal(gibbs.targetRole, 'RB1');
});

test('elite RB chase is aggressive before RB1 is secured', () => {
  const context = buildCheatSheetContext({
    playerName: 'Jahmyr Gibbs',
    position: 'RB',
    roster: [
      { playerName: 'Brock Bowers', position: 'TE', price: 28 },
      { playerName: 'Chris Olave', position: 'WR', price: 25 },
    ],
    remainingBudget: 197,
  });

  assert.equal(context.state.eliteRbSecured, false);
  assert.equal(context.state.budgetMode, 'AGGRESSIVE');
  assert.equal(context.preferenceMultiplier, 1.12);
  assert.equal(context.maximumCheatSheetBid, 98);
});

test('elite RB chase turns down after one is secured', () => {
  const roster = [
    { playerName: 'Brock Bowers', position: 'TE', price: 28 },
    { playerName: 'Chris Olave', position: 'WR', price: 25 },
    { playerName: 'Jahmyr Gibbs', position: 'RB', price: 90 },
  ];

  const state = buildCheatSheetState({ roster, remainingBudget: 107 });
  const context = buildCheatSheetContext({
    playerName: 'Jonathan Taylor',
    position: 'RB',
    roster,
    remainingBudget: 107,
  });

  assert.equal(state.eliteRbSecured, true);
  assert.equal(state.eliteRbName, 'Jahmyr Gibbs');
  assert.ok(context.preferenceMultiplier < 1);
});
