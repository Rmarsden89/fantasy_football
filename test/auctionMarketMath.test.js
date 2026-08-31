import assert from 'node:assert/strict';
import test from 'node:test';

import { AUCTION_LEAGUE_CONFIG, getActiveRosterSize } from '../src/auction/config.js';
import {
  filterTrustedBehaviorSamples,
  getDiscretionaryBudget,
  getMaximumBid,
  getRemainingRosterSpots,
  isTrustedBehaviorSample,
} from '../src/auction/marketMath.js';

test('auction config has 15 active roster spots and excludes IR', () => {
  assert.equal(getActiveRosterSize(), 15);
});

test('maximum bid reserves the minimum bid for every other open roster spot', () => {
  assert.equal(
    getMaximumBid({ remainingBudget: 31, playersRostered: 9 }),
    26,
  );
});

test('discretionary budget reserves one dollar for every open roster spot', () => {
  assert.equal(
    getDiscretionaryBudget({ remainingBudget: 31, playersRostered: 9 }),
    25,
  );
});

test('remaining roster spots cannot be negative', () => {
  assert.equal(getRemainingRosterSpots({ playersRostered: 99 }), 0);
  assert.equal(getMaximumBid({ remainingBudget: 10, playersRostered: 99 }), 0);
});

test('autodraft behavior is excluded from deterministic owner samples', () => {
  const samples = [
    { id: 'human-1', behaviorSource: 'human', isAutodraft: false },
    { id: 'auto-1', behaviorSource: 'autodraft', isAutodraft: true },
    { id: 'unknown-1', behaviorSource: 'unknown' },
  ];

  assert.equal(isTrustedBehaviorSample(samples[0]), true);
  assert.equal(isTrustedBehaviorSample(samples[1]), false);
  assert.deepEqual(filterTrustedBehaviorSamples(samples), [samples[0]]);
});

test('helpers honor an explicit auction config instead of relying on snake config', () => {
  const config = {
    ...AUCTION_LEAGUE_CONFIG,
    salaryCap: 100,
    minimumBid: 2,
    roster: { QB: 1, RB: 1, BENCH: 2, IR: 1 },
  };

  assert.equal(getActiveRosterSize(config), 4);
  assert.equal(getMaximumBid({ remainingBudget: 20, playersRostered: 1, config }), 16);
});
