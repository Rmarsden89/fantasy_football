import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildMarketProfile,
  buildPositionMarketSummary,
  estimateClearingPrice,
  freshAuctionRecords,
} from '../src/auction/marketProfile.js';

const records = [
  { season: 2024, position: 'RB', price: 94, isKeeper: false },
  { season: 2024, position: 'RB', price: 90, isKeeper: false },
  { season: 2025, position: 'RB', price: 82, isKeeper: false },
  { season: 2025, position: 'RB', price: 80, isKeeper: false },
  { season: 2025, position: 'RB', price: 87, isKeeper: true },
  { season: 2024, position: 'WR', price: 90, isKeeper: false },
  { season: 2025, position: 'WR', price: 88, isKeeper: false },
  { season: 2025, position: 'WR', price: 84, isKeeper: true },
  { season: 2025, position: 'TE', price: 42, isKeeper: false },
];

test('keeper salaries are excluded from fresh-auction calibration', () => {
  const fresh = freshAuctionRecords(records);
  assert.equal(fresh.length, 7);
  assert.equal(fresh.some((record) => record.price === 87), false);
  assert.equal(fresh.some((record) => record.price === 84), false);
});

test('position summary reflects actual high-end room spending', () => {
  const rb = buildPositionMarketSummary(records).find((row) => row.position === 'RB');
  assert.equal(rb.sampleSize, 4);
  assert.equal(rb.maximum, 94);
  assert.equal(rb.count80Plus, 4);
  assert.equal(rb.top3Average, (94 + 90 + 82) / 3);
});

test('market profile keeps keeper and auction sample counts separate', () => {
  const profile = buildMarketProfile(records);
  assert.equal(profile.freshAuctionSamples, 7);
  assert.equal(profile.keeperSamples, 2);
  assert.ok(profile.topEndBands.RB.expected >= 80);
});

test('clearing price falls when interested managers are budget constrained', () => {
  const result = estimateClearingPrice({
    intrinsicPrice: 86,
    interestedManagerMaxBids: [26, 18, 11],
  });
  assert.equal(result, 19);
});

test('clearing price never exceeds intrinsic price or winner max bid', () => {
  assert.equal(
    estimateClearingPrice({ intrinsicPrice: 60, interestedManagerMaxBids: [100, 95] }),
    60,
  );
  assert.equal(
    estimateClearingPrice({ intrinsicPrice: 90, interestedManagerMaxBids: [44, 40] }),
    41,
  );
});
