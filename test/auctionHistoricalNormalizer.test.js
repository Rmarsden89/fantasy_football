import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildManagerContinuity,
  parseDraftRecapHtml,
  parseFinalStandingsHtml,
  parseLeagueMembersHtml,
} from '../src/auction/historicalNormalizer.js';

test('final standings preserve manager identity independently of team name', () => {
  const html = `
    <table><tbody>
      <tr>
        <td><div>1</div></td>
        <td><div title="Bofa Deez Nuts (Reece Marsden)"><span class="teamName">Bofa Deez Nuts</span></div></td>
        <td><span>10-4-0</span></td>
        <td><div>2523.05</div></td>
        <td><div>2244.6</div></td>
        <td><div>180.2</div></td>
        <td><div>160.3</div></td>
      </tr>
    </tbody></table>`;

  assert.deepEqual(parseFinalStandingsHtml(html, 2022), [
    {
      season: 2022,
      rank: 1,
      teamName: 'Bofa Deez Nuts',
      managerNames: ['Reece Marsden'],
      primaryManager: 'Reece Marsden',
      record: '10-4-0',
      pointsFor: 2523.05,
      pointsAgainst: 2244.6,
      pointsForPerGame: 180.2,
      pointsAgainstPerGame: 160.3,
    },
  ]);
});

test('draft recap parser preserves keeper status and does not trust owner behavior by default', () => {
  const html = `
    <div class="draftRecapTable byTeam">
      <div class="Table__Title"><span title="Go Birds" class="teamName truncate">Go Birds</span></div>
      <table><tbody>
        <tr>
          <td><div>1</div></td>
          <td><div title="PLAYER"><a>Jalen Hurts</a><span> Phi, </span><span class="fw-medium">QB</span><span title="Keeper">K</span></div></td>
          <td><span class="fr">$32</span></td>
        </tr>
        <tr>
          <td><div>17</div></td>
          <td><div title="PLAYER"><a>Brandon Aiyuk</a><span> SF, </span><span class="fw-medium">WR</span></div></td>
          <td><span class="fr">$22</span></td>
        </tr>
      </tbody></table>
    </div>`;

  const rows = parseDraftRecapHtml(html, 2023);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], {
    season: 2023,
    teamName: 'Go Birds',
    draftNumber: 1,
    playerName: 'Jalen Hurts',
    position: 'QB',
    price: 32,
    isKeeper: true,
    behaviorSource: 'unknown',
    ownerBehaviorEligible: false,
  });
  assert.equal(rows[1].isKeeper, false);
});

test('league members map current managers to current team names', () => {
  const html = `
    <table><tbody>
      <tr>
        <td>1</td>
        <td><span>BDB</span></td>
        <td><div title="Go Birds"><span class="teamName">Go Birds</span></div></td>
        <td>Bush's WMD</td>
        <td>Brian Barrett</td>
      </tr>
    </tbody></table>`;

  assert.deepEqual(parseLeagueMembersHtml(html), [
    {
      season: 2026,
      memberNumber: 1,
      abbreviation: 'BDB',
      teamName: 'Go Birds',
      managerName: 'Brian Barrett',
      active: true,
    },
  ]);
});

test('manager continuity follows owners across team-name changes and flags current members', () => {
  const standings = [
    [{ season: 2020, teamName: 'Team Marsden', managerNames: ['Reece Marsden'] }],
    [{ season: 2022, teamName: 'Bofa Deez Nuts', managerNames: ['Reece Marsden'] }],
  ];
  const members = [{ season: 2026, teamName: 'Uncle RICO', managerName: 'Reece Marsden' }];

  assert.deepEqual(buildManagerContinuity(standings, members), [
    {
      managerName: 'Reece Marsden',
      currentMember: true,
      seasons: [2020, 2022],
      teamNames: ['Team Marsden', 'Bofa Deez Nuts', 'Uncle RICO'],
    },
  ]);
});
