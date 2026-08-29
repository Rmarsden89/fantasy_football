import test from 'node:test';
import assert from 'node:assert/strict';
import { LEAGUE_CONFIG, getMySnakePicks, getSnakeOverallPick } from '../src/config.js';

test('8th slot snake picks alternate between end and start of rounds', () => {
  assert.equal(getSnakeOverallPick(1, 8, 8), 8);
  assert.equal(getSnakeOverallPick(2, 8, 8), 9);
  assert.equal(getSnakeOverallPick(3, 8, 8), 24);
  assert.equal(getSnakeOverallPick(4, 8, 8), 25);
});

test('league config produces expected opening turns', () => {
  assert.deepEqual(getMySnakePicks(6, LEAGUE_CONFIG), [8, 9, 24, 25, 40, 41]);
});
