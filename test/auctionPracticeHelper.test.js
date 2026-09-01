import test from 'node:test';
import assert from 'node:assert/strict';

import { buildAuctionState } from '../src/auction/index.js';

const sales = [
  { playerName: 'Player One', position: 'RB', price: 80, fantasyTeam: 'Uncle RICO' },
  { playerName: 'Player Two', position: 'WR', price: 18, fantasyTeam: 'Uncle RICO' },
  { playerName: 'Player Three', position: 'QB', price: 40, fantasyTeam: 'Florida Man' },
];

test('auction state tracks spend, roster spots, and legal max bid', () => {
  const state = buildAuctionState(sales);
  const rico = state.find((team) => team.teamName === 'Uncle RICO');

  assert.equal(rico.spent, 98);
  assert.equal(rico.remainingBudget, 152);
  assert.equal(rico.playersRostered, 2);
  assert.equal(rico.maxBid, 140);
  assert.equal(rico.discretionaryBudget, 139);
  assert.deepEqual(rico.roster.map((player) => player.price), [80, 18]);
});
