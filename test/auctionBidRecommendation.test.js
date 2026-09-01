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

test('after WR1 is filled, FLEX spending protects the lower WR2 reserve tier', () => {
  const recommendation = recommendBid({
    nomination: {
      playerName: 'Kyren Williams',
      position: 'RB',
      marketValue: 48,
      currentBid: 1,
    },
    purchases: [
      { playerName: 'Chris Olave', position: 'WR', price: 65, fantasyTeam: 'Uncle RICO' },
    ],
    config: AUCTION_LEAGUE_CONFIG,
  });

  assert.equal(recommendation.role, 'FLEX');
  assert.equal(recommendation.remainingBudget, 87);
  assert.equal(recommendation.strategicMaximumBid, 27);
});

test('a third RB is treated as bench depth and heavily capped', () => {
  const recommendation = recommendBid({
    nomination: {
      playerName: 'Jeremiyah Love',
      position: 'RB',
      marketValue: 66,
      currentBid: 10,
    },
    purchases: [
      { playerName: 'Ashton Jeanty', position: 'RB', price: 50, fantasyTeam: 'Uncle RICO' },
    ],
    config: AUCTION_LEAGUE_CONFIG,
  });

  assert.equal(recommendation.role, 'BENCH');
  assert.equal(recommendation.buyAtOrBelow, 15);
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

test('collapsed opponent QB demand lowers the ceiling for an otherwise valuable starter', () => {
  const strongMarket = recommendBid({
    nomination: {
      playerName: 'Josh Allen',
      position: 'QB',
      marketValue: 58,
      currentBid: 1,
    },
    config: AUCTION_LEAGUE_CONFIG,
  });

  const sales = [];
  for (let team = 1; team <= 15; team += 1) {
    sales.push(
      { fantasyTeam: `Opponent ${team}`, playerName: `QB ${team}A`, position: 'QB', price: 1 },
      { fantasyTeam: `Opponent ${team}`, playerName: `QB ${team}B`, position: 'QB', price: 1 },
    );
  }

  const weakMarket = recommendBid({
    nomination: {
      playerName: 'Josh Allen',
      position: 'QB',
      marketValue: 58,
      currentBid: 1,
    },
    sales,
    config: AUCTION_LEAGUE_CONFIG,
  });

  assert.equal(strongMarket.buyAtOrBelow, 58);
  assert.ok(weakMarket.buyAtOrBelow < strongMarket.buyAtOrBelow);
  assert.equal(weakMarket.opponentDemand.capableBidderCount, 0);
});
