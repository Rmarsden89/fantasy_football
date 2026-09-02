import test from 'node:test';
import assert from 'node:assert/strict';

import { decideAutoBid } from '../src/auction/autoBidController.js';

const recommendation = {
  playerName: 'Bijan Robinson',
  nflTeam: 'ATL',
  position: 'RB',
  action: 'BUY',
  buyAtOrBelow: 92,
};

test('auto-bid advances one dollar at a time below the fixed ceiling', () => {
  const decision = decideAutoBid({
    nomination: {
      playerName: 'Bijan Robinson',
      nflTeam: 'ATL',
      position: 'RB',
      currentBid: 87,
      rawText: 'CURRENT OFFER: $87 OFFER $88',
    },
    recommendation,
  });

  assert.equal(decision.shouldBid, true);
  assert.equal(decision.nextBid, 88);
  assert.equal(decision.ceiling, 92);
});

test('auto-bid stops when the next bid would exceed the recommendation ceiling', () => {
  const decision = decideAutoBid({
    nomination: {
      playerName: 'Bijan Robinson',
      nflTeam: 'ATL',
      position: 'RB',
      currentBid: 92,
      rawText: 'CURRENT OFFER: $92 OFFER $93',
    },
    recommendation,
  });

  assert.equal(decision.shouldBid, false);
  assert.equal(decision.reason, 'ceiling-reached');
  assert.equal(decision.nextBid, 93);
});

test('auto-bid does nothing while our team is already winning', () => {
  const decision = decideAutoBid({
    nomination: {
      playerName: 'Bijan Robinson',
      nflTeam: 'ATL',
      position: 'RB',
      currentBid: 88,
      rawText: 'CURRENT OFFER: $88 WINNING',
    },
    recommendation,
  });

  assert.equal(decision.shouldBid, false);
  assert.equal(decision.reason, 'already-winning');
});

test('auto-bid never applies a recommendation to a different nominee', () => {
  const decision = decideAutoBid({
    nomination: {
      playerName: 'Jahmyr Gibbs',
      nflTeam: 'DET',
      position: 'RB',
      currentBid: 50,
      rawText: 'CURRENT OFFER: $50 OFFER $51',
    },
    recommendation,
  });

  assert.equal(decision.shouldBid, false);
  assert.equal(decision.reason, 'recommendation-does-not-match-current-nominee');
});
