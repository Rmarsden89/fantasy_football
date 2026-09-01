import test from 'node:test';
import assert from 'node:assert/strict';

import { nominationIdentity, parseNomineeCardText } from '../src/auction/nominationWatcher.js';

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

test('parses ESPN collapsed DOM text without letting bid history into player name', () => {
  const nominee = parseNomineeCardText(
    'Jonathan TaylorINDRB 2025 STATS: 1585 YDS, 18 TDS, 398 PTS 2026 PROJECTED: 1502 YDS, 12 TDS, 351 PTS, BYE WEEK 13 PRE-DRAFT VAL: $105 CURRENT OFFER: $111 MANUAL OFFER (MAX $140) OFFER $112 OFFER $111 ICE Raiders $110 Strategic Rebrand',
  );

  assert.equal(nominee.playerName, 'Jonathan Taylor');
  assert.equal(nominee.nflTeam, 'IND');
  assert.equal(nominee.position, 'RB');
  assert.equal(nominee.currentBid, 111);
  assert.equal(nominee.marketValue, 105);
});

test('nomination identity stays constant when only the bid changes', () => {
  const atOne = parseNomineeCardText(
    'Jonathan TaylorINDRB 2025 STATS: x PRE-DRAFT VAL: $105 CURRENT OFFER: $1',
  );
  const atHundred = parseNomineeCardText(
    'Jonathan TaylorINDRB 2025 STATS: x PRE-DRAFT VAL: $105 CURRENT OFFER: $100 OFFER $101 OFFER $100 Strategic Rebrand',
  );

  assert.equal(nominationIdentity(atOne), nominationIdentity(atHundred));
  assert.equal(nominationIdentity(atOne), 'jonathan taylor|ind|rb');
});

test('does not mistake the player filter panel for a nominee card', () => {
  assert.equal(
    parseNomineeCardText('2026 Projected 2025 Season All Pos. QB RB WR TE FLEX DP D/ST K All NFL Teams'),
    null,
  );
});
