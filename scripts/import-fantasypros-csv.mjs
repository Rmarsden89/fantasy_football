import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = path.resolve('src/data/rankings/2026-draft-final.json');
const input = process.argv[2];

if (!input) {
  console.error('Usage: npm run rankings:import-fantasypros -- <path-to-fantasypros.csv>');
  process.exit(1);
}

function normalizeName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }
  return rows;
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

const csvText = await fs.readFile(path.resolve(input), 'utf8');
const rows = parseCsv(csvText);
if (rows.length < 2) throw new Error('CSV is empty.');

const headers = rows[0].map((value) => value.trim());
const index = Object.fromEntries(headers.map((header, i) => [header, i]));
for (const required of ['Rank', 'Player', 'Position', 'Team']) {
  if (!(required in index)) throw new Error(`Missing required FantasyPros CSV column: ${required}`);
}

let prior = { players: {}, sources: {} };
try {
  prior = JSON.parse(await fs.readFile(OUT, 'utf8'));
} catch {
  // First import is fine.
}

const players = {};
for (const player of Object.values(prior.players || {})) {
  const key = normalizeName(player.name);
  // Preserve non-FantasyPros source fields and any manually captured ESPN rank.
  const preserved = { ...player };
  delete preserved.fantasyProsRank;
  delete preserved.fantasyProsAverage;
  delete preserved.fantasyProsExpertRanks;
  players[key] = preserved;
}

let imported = 0;
for (const row of rows.slice(1)) {
  const rank = numberOrNull(row[index.Rank]);
  const name = String(row[index.Player] || '').trim();
  const position = String(row[index.Position] || '').trim().toUpperCase();
  if (!rank || !name || !position) continue;

  const key = normalizeName(name);
  const current = players[key] || { name, team: null, position };
  current.name = name;
  current.team = String(row[index.Team] || '').trim() || current.team || null;
  current.position = position || current.position;
  current.fantasyProsRank = rank;

  const expertRanks = ['Katz Rank', 'Soppe Rank']
    .filter((header) => header in index)
    .map((header) => numberOrNull(row[index[header]]))
    .filter((value) => value !== null);
  if (expertRanks.length) current.fantasyProsExpertRanks = expertRanks;

  if ('Average' in index) {
    const average = numberOrNull(row[index.Average]);
    if (average !== null) current.fantasyProsAverage = average;
  }

  players[key] = current;
  imported += 1;
}

if (imported < 100) {
  throw new Error(`Only imported ${imported} players; refusing to overwrite snapshot.`);
}

const today = new Date().toISOString().slice(0, 10);
const snapshot = {
  snapshotVersion: 2,
  season: 2026,
  format: 'PPR_SUPERFLEX',
  generatedAt: today,
  notes: 'Static pre-draft ranking snapshot. FantasyPros ranks imported from the downloadable 2026 Superflex PPR CSV; runtime never scrapes ranking sites.',
  sources: {
    ...(prior.sources || {}),
    fantasyPros: {
      name: 'FantasyPros 2026 Superflex PPR downloadable CSV',
      asOf: today,
      playerCount: imported,
      importMethod: 'csv',
    },
  },
  players,
};

await fs.mkdir(path.dirname(OUT), { recursive: true });
await fs.writeFile(OUT, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
console.log(`Imported ${imported} FantasyPros players from ${input}`);
console.log(`Wrote ${OUT} with ${Object.keys(players).length} total players`);
