import test from 'node:test';
import assert from 'node:assert/strict';

import { parseNomineeFromText } from '../src/auction/nominationWatcher.js';

test('parses the ESPN salary-cap nominee card heading', () => {
  const nominee = parseNomineeFromText(
    'Jaxon Smith-Njigba SEA WR 2025 STATS: 1793 YDS, 10 TDS, 367 PTS 2026 PROJECTED: 1569 YDS, 9 TDS, 329 PTS, BYE WEEK 11',
  );

  assert.deepEqual(nominee, {
    playerName: 'Jaxon Smith-Njigba',
    nflTeam: 'SEA',
    position: 'WR',
  });
});
