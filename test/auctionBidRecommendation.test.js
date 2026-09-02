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

test('elite RB stretch target gets preference but remains capped by cheat-sheet budget guardrail', () => {
  const recommendation = recommendBid({
    nomination: {
      playerName: 'Jahmyr Gibbs',
      position: 'RB',
      marketValue: 110,
      currentBid: 1,
    },
    config: AUCTION_LEAGUE_CONFIG,
  });

  assert.equal(recommendation.role, 'STARTER');
  assert.equal(recommendation.cheatSheetTier, 'STRETCH');
  assert.equal(recommendation.cheatSheetTargetRole, 'RB1');
  assert.equal(recommendation.cheatSheetMaximumBid, 98);
  assert.equal(recommendation.buyAtOrBelow, 98);
});

test('WR2 stretch target is intentionally capped below elite RB allocation', () => {
  const recommendation = recommendBid({
    nomination: {
      playerName: 'Puka Nacua',
      position: 'WR',
      marketValue: 107,
      currentBid: 1,
    },
    config: AUCTION_LEAGUE_CONFIG,
  });

  assert.equal(recommendation.role, 'STARTER');
  assert.equal(recommendation.cheatSheetTier, 'STRETCH');
  assert.equal(recommendation.cheatSheetMaximumBid, 74);
  assert.equal(recommendation.buyAtOrBelow, 74);
});

test('once an elite RB is secured, a second elite RB is strongly de-prioritized', () => {
  const recommendation = recommendBid({
    nomination: {
      playerName: 'Jonathan Taylor',
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
  assert.ok(recommendation.buyAtOrBelow < 60);
});

test('collapsed opponent QB demand lowers the ceiling for an otherwise valuable starter', () => {
  const strongMarket = recommendBid({
    nomination: {
      playerName: 'Lamar Jackson',
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
