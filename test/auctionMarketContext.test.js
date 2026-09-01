import test from 'node:test';
import assert from 'node:assert/strict';

import { AUCTION_LEAGUE_CONFIG } from '../src/auction/config.js';
import {
  buildOpponentDemand,
  buildRemainingSupply,
  marketPressureFactor,
} from '../src/auction/marketContext.js';

test('unknown opponents are treated as live demand early in the auction', () => {
  const demand = buildOpponentDemand({
    position: 'WR',
    marketValue: 60,
    sales: [],
    config: AUCTION_LEAGUE_CONFIG,
  });

  assert.equal(demand.unknownOpponentCount, 15);
  assert.equal(demand.capableBidderCount, 15);
  assert.equal(demand.effectiveDemand, 15);
  assert.equal(marketPressureFactor({ demand, supply: null }), 1);
});

test('teams at their position limit stop contributing demand', () => {
  const sales = [];
  for (let team = 1; team <= 15; team += 1) {
    sales.push(
      { fantasyTeam: `Opponent ${team}`, playerName: `RB ${team}A`, position: 'RB', price: 1 },
      { fantasyTeam: `Opponent ${team}`, playerName: `RB ${team}B`, position: 'RB', price: 1 },
      { fantasyTeam: `Opponent ${team}`, playerName: `RB ${team}C`, position: 'RB', price: 1 },
    );
  }

  const demand = buildOpponentDemand({
    position: 'RB',
    marketValue: 50,
    sales,
    config: AUCTION_LEAGUE_CONFIG,
  });

  assert.equal(demand.unknownOpponentCount, 0);
  assert.equal(demand.capableBidderCount, 0);
  assert.equal(demand.effectiveDemand, 0);
  assert.equal(marketPressureFactor({ demand, supply: null }), 0.72);
});

test('remaining supply excludes sold players, keepers, and the nominee', () => {
  const supply = buildRemainingSupply({
    nomination: {
      playerName: 'Target WR',
      position: 'WR',
      projectedPoints: 250,
    },
    playerPool: [
      { id: 1, name: 'Target WR', position: 'WR', projectedPoints: 250 },
      { id: 2, name: 'Comparable WR', position: 'WR', projectedPoints: 245 },
      { id: 3, name: 'Sold WR', position: 'WR', projectedPoints: 260 },
      { id: 4, name: 'Lower WR', position: 'WR', projectedPoints: 200 },
      { id: 5, name: 'Bijan Robinson', position: 'RB', projectedPoints: 300 },
    ],
    sales: [
      { playerId: 3, playerName: 'Sold WR', position: 'WR', fantasyTeam: 'Opponent 1', price: 20 },
    ],
    config: AUCTION_LEAGUE_CONFIG,
  });

  assert.equal(supply.remainingAtPosition, 2);
  assert.equal(supply.comparableCount, 1);
  assert.equal(supply.nearPeerCount, 1);
  assert.equal(supply.superiorCount, 0);
});
