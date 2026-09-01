import test from 'node:test';
import assert from 'node:assert/strict';

import { parseNomineeCardText } from '../src/auction/nominationWatcher.js';

test('parses the ESPN salary-cap nominee card with current offer and pre-draft value', () => {
  const nominee = parseNomineeCardText(
    'Derrick Henry BAL RB CURRENT OFFER: $84 2025 STATS: 1595 YDS, 16 TDS, 317 PTS 2026 PROJECTED: 1505 YDS, 13 TDS, 312 PTS, BYE WEEK 13 PRE-DRAFT VAL: $77',
  );

  assert.equal(nominee.playerName, 'Derrick Henry');
  assert.equal(nominee.nflTeam, 'BAL');
  assert.equal(nominee.position, 'RB');
  assert.equal(nominee.currentBid, 84);
  assert.equal(nominee.marketValue, 77);
});

test('does not mistake the player filter panel for a nominee card', () => {
  assert.equal(
    parseNomineeCardText('2026 Projected 2025 Season All Pos. QB RB WR TE FLEX DP D/ST K All NFL Teams'),
    null,
  );
});
