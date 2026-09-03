import test from 'node:test';
import assert from 'node:assert/strict';

import { AUCTION_LEAGUE_CONFIG } from '../src/auction/config.js';
import { recommendBid } from '../src/auction/bidRecommendation.js';
import { recommendNomination } from '../src/auction/nominationStrategy.js';

test('IDP fills the DP starter slot instead of being treated as bench', () => {
  const recommendation = recommendBid({
    nomination: {
      playerName: 'Maxx Crosby',
      position: 'DE',
      marketValue: 5,
      currentBid: 1,
    },
    config: AUCTION_LEAGUE_CONFIG,
  });

  assert.equal(recommendation.rosterSlot, 'DP');
  assert.equal(recommendation.role, 'STARTER');
  assert.equal(recommendation.idpTarget.tier, 'A');
  assert.ok(recommendation.buyAtOrBelow <= 4);
});

test('second QB is capped as cheap bench insurance', () => {
  const recommendation = recommendBid({
    nomination: {
      playerName: 'Justin Herbert',
      position: 'QB',
      marketValue: 12,
      currentBid: 1,
    },
    purchases: [
      { playerName: 'Josh Allen', position: 'QB', price: 35, fantasyTeam: 'Uncle RICO' },
    ],
    config: AUCTION_LEAGUE_CONFIG,
  });

  assert.equal(recommendation.role, 'BENCH');
  assert.equal(recommendation.backupRoleCap, 2);
  assert.equal(recommendation.buyAtOrBelow, 2);
});

test('QB spend is constrained while both WR starters are open', () => {
  const recommendation = recommendBid({
    nomination: {
      playerName: 'Josh Allen',
      position: 'QB',
      marketValue: 58,
      currentBid: 1,
    },
    config: AUCTION_LEAGUE_CONFIG,
  });

  assert.equal(recommendation.role, 'STARTER');
  assert.equal(recommendation.remainingBudget, 132);
  assert.equal(recommendation.quarterbackOpportunityCap, 36);
  assert.ok(recommendation.buyAtOrBelow <= 36);
});

test('nomination recommendation prioritizes an open WR starter over QB depth', () => {
  const playerPool = [
    { name: 'Nico Collins', position: 'WR', projectedPoints: 240, auctionValueAverage: 40, raw: {} },
    { name: 'Justin Herbert', position: 'QB', projectedPoints: 330, auctionValueAverage: 10, raw: {} },
    { name: 'Maxx Crosby', position: 'DE', projectedPoints: 180, auctionValueAverage: 2, raw: {} },
  ];

  const result = recommendNomination({
    playerPool,
    sales: [],
    roster: AUCTION_LEAGUE_CONFIG.myKeepers,
    config: AUCTION_LEAGUE_CONFIG,
  });

  assert.equal(result.primary.playerName, 'Nico Collins');
});
