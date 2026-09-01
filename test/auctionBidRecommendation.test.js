import test from 'node:test';
import assert from 'node:assert/strict';

import { AUCTION_LEAGUE_CONFIG } from '../src/auction/config.js';
import { buildMyBudgetState, recommendBid } from '../src/auction/bidRecommendation.js';

test('keeper commitments are included in the starting auction budget', () => {
  const budget = buildMyBudgetState({ config: AUCTION_LEAGUE_CONFIG });
  assert.equal(budget.keeperSpend, 98);
  assert.equal(budget.remainingBudget, 152);
  assert.equal(budget.playersRostered, 2);
  assert.equal(budget.spotsLeft, 13);
  assert.equal(budget.maximumLegalBid, 140);
});

test('open WR starter receives a larger budget than a FLEX-only RB', () => {
  const wr = recommendBid({
    nomination: {
      playerName: 'Puka Nacua',
      position: 'WR',
      marketValue: 107,
      currentBid: 70,
      marketValueSource: 'espn-practice',
    },
    config: AUCTION_LEAGUE_CONFIG,
  });

  const rb = recommendBid({
    nomination: {
      playerName: 'Ashton Jeanty',
      position: 'RB',
      marketValue: 72,
      currentBid: 60,
      marketValueSource: 'espn-practice',
    },
    config: AUCTION_LEAGUE_CONFIG,
  });

  assert.equal(wr.role, 'STARTER');
  assert.equal(rb.role, 'FLEX');
  assert.ok(wr.buyAtOrBelow > rb.buyAtOrBelow);
  assert.equal(rb.buyAtOrBelow, 61);
});

test('a third RB is treated as bench depth and heavily capped', () => {
  const recommendation = recommendBid({
    nomination: {
      playerName: 'Jeremiyah Love',
      position: 'RB',
      marketValue: 66,
      currentBid: 20,
    },
    purchases: [
      { playerName: 'Ashton Jeanty', position: 'RB', price: 50, fantasyTeam: 'Uncle RICO' },
    ],
    config: AUCTION_LEAGUE_CONFIG,
  });

  assert.equal(recommendation.role, 'BENCH');
  assert.ok(recommendation.buyAtOrBelow < 25);
  assert.equal(recommendation.action, 'BUY');
});

test('recommendation passes when current bid exceeds roster-aware threshold', () => {
  const recommendation = recommendBid({
    nomination: {
      playerName: 'Ashton Jeanty',
      position: 'RB',
      marketValue: 72,
      currentBid: 62,
    },
    config: AUCTION_LEAGUE_CONFIG,
  });

  assert.equal(recommendation.role, 'FLEX');
  assert.equal(recommendation.buyAtOrBelow, 61);
  assert.equal(recommendation.action, 'PASS');
});
