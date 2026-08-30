import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = path.resolve('src/data/rankings/2026-draft-final.json');
const SOURCES = {
  fantasyPros: 'https://www.fantasypros.com/nfl/rankings/ppr-superflex-cheatsheets.php',
  pfn: 'https://www.profootballnetwork.com/fantasy-hq/overall-rankings-superflex-ppr',
};

function decodeHtml(text) {
  return String(text || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&ndash;|&mdash;/gi, '-')
    .replace(/&#8217;|&rsquo;/gi, "'")
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tableRows(html) {
  const rows = [];
  for (const rowMatch of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...rowMatch[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)]
      .map((match) => decodeHtml(match[1]))
      .filter(Boolean);
    if (cells.length) rows.push(cells);
  }
  return rows;
}

function normalizeName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function parseFantasyPros(html) {
  const players = [];
  for (const cells of tableRows(html)) {
    const rank = Number.parseInt(cells[0], 10);
    if (!Number.isFinite(rank) || rank <= 0) continue;

    const playerCell = cells[1] || '';
    const match = playerCell.match(/^(.*?)\s*\(([A-Z]{2,3})\)\s*$/);
    const name = (match?.[1] || playerCell).trim();
    const team = match?.[2] || null;
    const positionCell = cells[2] || '';
    const position = positionCell.match(/^(QB|RB|WR|TE)/i)?.[1]?.toUpperCase() || null;
    if (!name || !position) continue;
    players.push({ rank, name, team, position });
  }
  return players;
}

function parsePfn(html) {
  const players = [];
  for (const cells of tableRows(html)) {
    const rank = Number.parseInt(cells[0], 10);
    if (!Number.isFinite(rank) || rank <= 0) continue;
    const name = cells[1]?.trim();
    const position = cells[2]?.match(/^(QB|RB|WR|TE)/i)?.[1]?.toUpperCase() || null;
    const team = cells[3]?.match(/^[A-Z]{2,3}$/)?.[0] || null;
    if (!name || !position) continue;
    players.push({ rank, name, team, position });
  }
  return players;
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'fantasy-football-draft-helper/0.4 ranking-snapshot-refresh',
      accept: 'text/html,application/xhtml+xml',
    },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return response.text();
}

function mergePlayers(existing, sourcePlayers, field) {
  for (const sourcePlayer of sourcePlayers) {
    const key = normalizeName(sourcePlayer.name);
    const current = existing[key] || {
      name: sourcePlayer.name,
      team: sourcePlayer.team,
      position: sourcePlayer.position,
    };
    current[field] = sourcePlayer.rank;
    current.team ||= sourcePlayer.team;
    current.position ||= sourcePlayer.position;
    existing[key] = current;
  }
}

const [fantasyProsHtml, pfnHtml] = await Promise.all([
  fetchText(SOURCES.fantasyPros),
  fetchText(SOURCES.pfn),
]);

const fantasyPros = parseFantasyPros(fantasyProsHtml);
const pfn = parsePfn(pfnHtml);
if (fantasyPros.length < 12) throw new Error(`FantasyPros parser only found ${fantasyPros.length} players; refusing to overwrite snapshot.`);
if (pfn.length < 12) throw new Error(`PFN parser only found ${pfn.length} players; refusing to overwrite snapshot.`);

let prior = { players: {} };
try {
  prior = JSON.parse(await fs.readFile(OUT, 'utf8'));
} catch {
  // First generation is fine.
}

// Preserve manually captured ESPN draft-board ranks while refreshing web sources.
const players = {};
for (const player of Object.values(prior.players || {})) {
  const key = normalizeName(player.name);
  if (Number.isFinite(Number(player.espnDraftRank))) {
    players[key] = {
      name: player.name,
      team: player.team || null,
      position: player.position || null,
      espnDraftRank: Number(player.espnDraftRank),
    };
  }
}

mergePlayers(players, fantasyPros, 'fantasyProsRank');
mergePlayers(players, pfn, 'pfnRank');

const today = new Date().toISOString().slice(0, 10);
const snapshot = {
  snapshotVersion: 1,
  season: 2026,
  format: 'PPR_SUPERFLEX',
  generatedAt: today,
  notes: 'Static pre-draft ranking snapshot. Runtime does not scrape ranking sites. Refresh intentionally before draft day.',
  sources: {
    fantasyPros: { name: 'FantasyPros PPR Superflex', asOf: today, url: SOURCES.fantasyPros, playerCount: fantasyPros.length },
    pfn: { name: 'Pro Football Network Superflex PPR Big Board', asOf: today, url: SOURCES.pfn, playerCount: pfn.length },
  },
  players,
};

await fs.mkdir(path.dirname(OUT), { recursive: true });
await fs.writeFile(OUT, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
console.log(`Wrote ${OUT}`);
console.log(`FantasyPros: ${fantasyPros.length} players; PFN: ${pfn.length} players; merged: ${Object.keys(players).length}`);
