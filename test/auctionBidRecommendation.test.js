import test from 'node:test';
import assert from 'node:assert/strict';

import { AUCTION_LEAGUE_CONFIG } from '../src/auction/config.js';
import { buildMyBudgetState, recommendBid } from '../src/auction/bidRecommendation.js';

test('Bowers and Olave keeper commitments leave $197 for the auction', () => {
  const budget = buildMyBudgetState({ config: AUCTION_LEAGUE_CONFIG });
  assert.equal(budget.keeperSpend, 53);
  assert.equal(budget.remainingBudget, 197);
  assert.equal(budget.playersRostered, 2);
  assert.equal(budget.spotsLeft, 13);
  assert.equal(budget.maximumLegalBid, 185);
});

test('elite RB stretch target receives a soft preference without a static cheat-sheet cap', () => {
  const recommendation = recommendBid({
    nomination: {
      playerName: 'Jahmyr Gibbs',
      nflTeam: 'DET',
      position: 'RB',
      marketValue: 110,
      currentBid: 1,
    },
    config: AUCTION_LEAGUE_CONFIG,
  });

  assert.equal(recommendation.role, 'STARTER');
  assert.equal(recommendation.cheatSheetTier, 'STRETCH');
  assert.equal(recommendation.cheatSheetMaximumBid, null);
  assert.ok(recommendation.cheatSheetPreferenceMultiplier > 1);
  assert.equal(recommendation.primaryGoalAdditionalReserve, 0);
  assert.equal(recommendation.buyAtOrBelow, 119);
});

test('non-RB splurge is constrained while elite RB primary goal remains open', () => {
  const recommendation = recommendBid({
    nomination: {
      playerName: 'Puka Nacua',
      nflTeam: 'LAR',
      position: 'WR',
      marketValue: 107,
      currentBid: 1,
    },
    config: AUCTION_LEAGUE_CONFIG,
  });

  assert.equal(recommendation.role, 'STARTER');
  assert.equal(recommendation.primaryGoalSignal.open, true);
  assert.equal(recommendation.primaryGoalSignal.targetReserve, 85);
  assert.equal(recommendation.primaryGoalAdditionalReserve, 57);
  assert.equal(recommendation.buyAtOrBelow, 52);
});

test('once an elite RB is secured, a second elite RB is strongly de-prioritized', () => {
  const recommendation = recommendBid({
    nomination: {
      playerName: 'Jonathan Taylor',
      nflTeam: 'IND',
      position: 'RB',
      marketValue: 105,
      currentBid: 1,
    },
    purchases: [
      { playerName: 'Jahmyr Gibbs', position: 'RB', price: 90, fantasyTeam: 'Uncle RICO' },
    ],
    config: AUCTION_LEAGUE_CONFIG,
  });

  assert.equal(recommendation.role, 'FLEX');
  assert.equal(recommendation.cheatSheetState.eliteRbSecured, true);
  assert.equal(recommendation.cheatSheetState.eliteRbName, 'Jahmyr Gibbs');
  assert.ok(recommendation.cheatSheetPreferenceMultiplier < 1);
  assert.equal(recommendation.primaryGoalAdditionalReserve, 0);
  assert.ok(recommendation.buyAtOrBelow < 60);
});

test('TE2 is treated as a cheap backup rather than a FLEX target', () => {
  const recommendation = recommendBid({
    nomination: {
      playerName: 'Trey McBride',
      nflTeam: 'ARI',
      position: 'TE',
      marketValue: 69,
      currentBid: 1,
    },
    config: AUCTION_LEAGUE_CONFIG,
  });

  assert.equal(recommendation.role, 'BENCH');
  assert.equal(recommendation.backupRoleCap, 5);
  assert.equal(recommendation.buyAtOrBelow, 5);
});

test('cheap rookie can receive keeper-flier support without consuming starter money', () => {
  const recommendation = recommendBid({
    nomination: {
      playerName: 'Jadarian Price',
      nflTeam: 'SEA',
      position: 'RB',
      marketValue: 20,
      currentBid: 1,
      experienceYears: 0,
    },
    purchases: [
      { playerName: 'Omarion Hampton', position: 'RB', price: 78, fantasyTeam: 'Uncle RICO' },
    ],
    config: AUCTION_LEAGUE_CONFIG,
  });

  assert.equal(recommendation.keeperSignal.eligible, true);
  assert.equal(recommendation.keeperSignal.maximumBid, 8);
  assert.ok(recommendation.buyAtOrBelow <= 8);
});

test('collapsed opponent QB demand lowers the ceiling for an otherwise valuable starter', () => {
  const strongMarket = recommendBid({
    nomination: {
      playerName: 'Lamar Jackson',
      nflTeam: 'BAL',
      position: 'QB',
      marketValue: 27,
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
      playerName: 'Lamar Jackson',
      nflTeam: 'BAL',
      position: 'QB',
      marketValue: 27,
      currentBid: 1,
    },
    sales,
    config: AUCTION_LEAGUE_CONFIG,
  });

  assert.ok(weakMarket.buyAtOrBelow < strongMarket.buyAtOrBelow);
  assert.equal(weakMarket.opponentDemand.capableBidderCount, 0);
});
