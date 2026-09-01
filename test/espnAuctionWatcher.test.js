import test from 'node:test';
import assert from 'node:assert/strict';

import {
  canonicalSaleKey,
  parseAuctionEventElement,
} from '../src/auction/espnAuctionWatcher.js';

function fakeElement(text, playerId = 12345) {
  return {
    innerText: text,
    querySelector(selector) {
      if (!selector.includes('headshots')) return null;
      return { src: `https://a.espncdn.com/i/headshots/nfl/players/full/${playerId}.png` };
    },
  };
}

test('parses a salary-cap sale message with player, price, and team', () => {
  const sale = parseAuctionEventElement(
    fakeElement('Bijan Robinson / ATL RB sold to Uncle RICO for $80', 4430807),
  );

  assert.equal(sale.playerName, 'Bijan Robinson');
  assert.equal(sale.nflTeam, 'ATL');
  assert.equal(sale.position, 'RB');
  assert.equal(sale.playerId, 4430807);
  assert.equal(sale.price, 80);
  assert.equal(sale.fantasyTeam, 'Uncle RICO');
});

test('ignores non-auction messages', () => {
  assert.equal(parseAuctionEventElement(fakeElement('Bijan Robinson / ATL RB nominated')), null);
});

test('sale dedupe key ignores player id differences between duplicate DOM copies', () => {
  const withId = {
    playerName: 'Puka Nacua',
    playerId: 4426515,
    price: 114,
    fantasyTeam: 'PUKA Pac',
  };
  const withoutId = {
    playerName: 'Puka Nacua',
    playerId: null,
    price: 114,
    fantasyTeam: 'PUKA Pac',
  };

  assert.equal(canonicalSaleKey(withId), canonicalSaleKey(withoutId));
});
