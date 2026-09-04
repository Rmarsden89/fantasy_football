import test from 'node:test';
import assert from 'node:assert/strict';

import { AUCTION_LEAGUE_CONFIG } from '../src/auction/config.js';
import { buildPositionScarcitySignal } from '../src/auction/positionScarcity.js';

function player(name, position, auctionValueAverage) {
  return { name, position, auctionValueAverage, raw: {} };
}

const keepers = [
  { playerName: 'Bijan Robinson', position: 'RB', price: 90 },
  { playerName: 'Brock Bowers', position: 'TE', price: 28 },
];

test('RB2 becomes a meaningful FLEX priority when WR starters are filled', () => {
  const roster = [
    ...keepers,
    { playerName: 'Terry McLaurin', position: 'WR', price: 22 },
    { playerName: 'Rome Odunze', position: 'WR', price: 19 },
  ];
  const pool = [
    player('RB A', 'RB', 22),
    player('RB B', 'RB', 18),
    player('RB C', 'RB', 14),
    player('WR A', 'WR', 30),
    player('WR B', 'WR', 24),
    player('WR C', 'WR', 20),
    player('WR D', 'WR', 18),
    player('WR E', 'WR', 15),
    player('WR F', 'WR', 13),
    player('WR G', 'WR', 12),
  ];

  const signal = buildPositionScarcitySignal({
    position: 'RB',
    roster,
    playerPool: pool,
    config: AUCTION_LEAGUE_CONFIG,
  });

  assert.equal(signal.active, true);
  assert.equal(signal.rb2Open, true);
  assert.equal(signal.urgency, 'HIGH');
  assert.equal(signal.preferenceFloor, 1);
});

test('thin WR supply can still signal urgency while a starting WR spot is open', () => {
  const roster = [...keepers, { playerName: 'Terry McLaurin', position: 'WR', price: 22 }];
  const pool = [
    player('WR A', 'WR', 22),
    player('WR B', 'WR', 15),
    player('WR C', 'WR', 12),
    player('RB A', 'RB', 28),
    player('RB B', 'RB', 24),
    player('RB C', 'RB', 20),
    player('RB D', 'RB', 18),
    player('RB E', 'RB', 16),
    player('RB F', 'RB', 14),
    player('RB G', 'RB', 12),
  ];

  const signal = buildPositionScarcitySignal({
    position: 'WR',
    roster,
    playerPool: pool,
    config: AUCTION_LEAGUE_CONFIG,
  });

  assert.equal(signal.active, true);
  assert.equal(signal.wrStartersOpen, 1);
  assert.equal(signal.urgency, 'HIGH');
  assert.equal(signal.preferenceFloor, 1);
});

test('sold players are removed from usable supply counts', () => {
  const pool = [
    player('RB A', 'RB', 22),
    player('RB B', 'RB', 18),
    player('RB C', 'RB', 14),
    player('RB D', 'RB', 12),
  ];
  const sales = [
    { playerName: 'RB A', position: 'RB' },
    { playerName: 'RB B', position: 'RB' },
  ];

  const signal = buildPositionScarcitySignal({
    position: 'RB',
    roster: keepers,
    sales,
    playerPool: pool,
    config: AUCTION_LEAGUE_CONFIG,
  });

  assert.equal(signal.supply.usableRemaining, 2);
});


test('RB2 scarcity can raise FLEX value before both WR starters are filled', () => {
  const roster = [
    ...keepers,
    { playerName: 'Terry McLaurin', position: 'WR', price: 22 },
  ];
  const pool = [
    player('RB A', 'RB', 24),
    player('RB B', 'RB', 16),
    player('RB C', 'RB', 12),
    player('WR A', 'WR', 32),
    player('WR B', 'WR', 28),
    player('WR C', 'WR', 24),
    player('WR D', 'WR', 20),
    player('WR E', 'WR', 18),
    player('WR F', 'WR', 16),
    player('WR G', 'WR', 14),
    player('WR H', 'WR', 12),
  ];

  const signal = buildPositionScarcitySignal({
    position: 'RB',
    roster,
    playerPool: pool,
    config: AUCTION_LEAGUE_CONFIG,
  });

  assert.equal(signal.active, true);
  assert.equal(signal.rb2Open, true);
  assert.equal(signal.wrStartersOpen, 1);
  assert.equal(signal.urgency, 'HIGH');
  assert.equal(signal.roleMultiplierFloor, 1);
});

test('healthy RB supply does not force RB2 ahead of open WR starters', () => {
  const roster = [...keepers];
  const pool = [
    player('RB A', 'RB', 30),
    player('RB B', 'RB', 27),
    player('RB C', 'RB', 24),
    player('RB D', 'RB', 22),
    player('RB E', 'RB', 20),
    player('RB F', 'RB', 18),
    player('RB G', 'RB', 16),
    player('RB H', 'RB', 14),
    player('RB I', 'RB', 12),
    player('WR A', 'WR', 30),
    player('WR B', 'WR', 24),
    player('WR C', 'WR', 20),
  ];

  const signal = buildPositionScarcitySignal({
    position: 'RB',
    roster,
    playerPool: pool,
    config: AUCTION_LEAGUE_CONFIG,
  });

  assert.equal(signal.active, true);
  assert.equal(signal.wrStartersOpen, 2);
  assert.ok(signal.roleMultiplierFloor < 1);
});
