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

test('recommendation never exceeds ESPN market value or the legal max bid', () => {
  const recommendation = recommendBid({
    nomination: {
      playerName: 'Puka Nacua',
      position: 'WR',
      marketValue: 107,
      currentBid: 95,
      marketValueSource: 'espn-practice',
    },
    config: AUCTION_LEAGUE_CONFIG,
  });

  assert.equal(recommendation.buyAtOrBelow, 107);
  assert.equal(recommendation.action, 'BUY');
  assert.equal(recommendation.remainingBudget, 152);
  assert.equal(recommendation.maximumLegalBid, 140);
});

test('recommendation passes when current bid exceeds threshold', () => {
  const recommendation = recommendBid({
    nomination: {
      playerName: 'Puka Nacua',
      position: 'WR',
      marketValue: 107,
      currentBid: 108,
    },
    config: AUCTION_LEAGUE_CONFIG,
  });

  assert.equal(recommendation.action, 'PASS');
  assert.equal(recommendation.buyAtOrBelow, 107);
});
