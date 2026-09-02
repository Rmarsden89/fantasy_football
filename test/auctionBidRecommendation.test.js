import test from 'node:test';
import assert from 'node:assert/strict';

import { AUCTION_LEAGUE_CONFIG } from '../src/auction/config.js';
import { buildMyBudgetState, recommendBid } from '../src/auction/bidRecommendation.js';

test('Bijan and Bowers keeper commitments leave $132 for the auction', () => {
  const budget = buildMyBudgetState({ config: AUCTION_LEAGUE_CONFIG });
  assert.equal(budget.keeperSpend, 118);
  assert.equal(budget.remainingBudget, 132);
  assert.equal(budget.playersRostered, 2);
  assert.equal(budget.spotsLeft, 13);
  assert.equal(budget.maximumLegalBid, 120);
});

test('stretch preference cannot inflate a recommendation above the market-value anchor', () => {
  const customConfig = {
    ...AUCTION_LEAGUE_CONFIG,
    myKeepers: [
      { playerName: 'Brock Bowers', position: 'TE', price: 28 },
      { playerName: 'Chris Olave', position: 'WR', price: 25 },
    ],
  };
  const recommendation = recommendBid({
    nomination: {
      playerName: 'Bijan Robinson',
      nflTeam: 'ATL',
      position: 'RB',
      marketValue: 108,
      currentBid: 1,
    },
    config: customConfig,
  });

  assert.equal(recommendation.cheatSheetTier, 'STRETCH');
  assert.equal(recommendation.intrinsicMarketCap, 108);
  assert.ok(recommendation.buyAtOrBelow <= 108);
});

test('Bijan keeper means a second elite RB is FLEX and de-prioritized', () => {
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

  assert.equal(recommendation.role, 'FLEX');
  assert.equal(recommendation.cheatSheetState.eliteRbSecured, true);
  assert.equal(recommendation.cheatSheetState.eliteRbName, 'Bijan Robinson');
  assert.ok(recommendation.cheatSheetPreferenceMultiplier < 1);
  assert.equal(recommendation.primaryGoalAdditionalReserve, 0);
  assert.ok(recommendation.buyAtOrBelow < 110);
});

test('open WR starter gets meaningful budget without an elite-RB reserve', () => {
  const recommendation = recommendBid({
    nomination: {
      playerName: 'Nico Collins',
      nflTeam: 'HOU',
      position: 'WR',
      marketValue: 62,
      currentBid: 1,
    },
    config: AUCTION_LEAGUE_CONFIG,
  });

  assert.equal(recommendation.role, 'STARTER');
  assert.equal(recommendation.primaryGoalSignal.open, false);
  assert.equal(recommendation.primaryGoalAdditionalReserve, 0);
  assert.ok(recommendation.buyAtOrBelow > 20);
  assert.ok(recommendation.buyAtOrBelow <= 62);
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

test('cheap explicitly tagged upside player can receive keeper-flier support', () => {
  const recommendation = recommendBid({
    nomination: {
      playerName: 'Jadarian Price',
      nflTeam: 'SEA',
      position: 'RB',
      marketValue: 20,
      currentBid: 1,
      experienceYears: 0,
    },
    config: AUCTION_LEAGUE_CONFIG,
  });

  assert.equal(recommendation.keeperSignal.eligible, true);
  assert.equal(recommendation.keeperSignal.maximumBid, 8);
  assert.ok(recommendation.buyAtOrBelow <= 8);
});

test('missing experience data is not treated as rookie status', () => {
  const recommendation = recommendBid({
    nomination: {
      playerName: 'Cheap Veteran',
      nflTeam: 'FA',
      position: 'WR',
      marketValue: 5,
      currentBid: 1,
      experienceYears: null,
    },
    config: AUCTION_LEAGUE_CONFIG,
  });

  assert.equal(recommendation.experienceYears, null);
  assert.equal(recommendation.keeperSignal.rookie, false);
  assert.equal(recommendation.keeperSignal.eligible, false);
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
