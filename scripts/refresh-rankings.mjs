import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = path.resolve('src/data/rankings/2026-draft-final.json');
const SOURCES = {
  // The printable rankings page is server-rendered. The interactive cheatsheet
  // page can return shell HTML to Node and therefore parse as zero players.
  fantasyPros: 'https://www.fantasypros.com/nfl/fantasy-football-rankings/ppr-superflex.php?print=true',
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

    // FantasyPros has used both of these layouts:
    //   RK | PLAYER | expert1 | expert2 ...
    //   RK | PLAYER | POS | BYE ...
    // The player cell usually contains the team and position text as well.
    const playerCell = cells[1] || '';
    const positionFromPlayer = playerCell.match(/\b(QB|RB|WR|TE)\d*\b/i)?.[1]?.toUpperCase() || null;
    const teamFromPlayer = playerCell.match(/\b([A-Z]{2,3})\s+(?:QB|RB|WR|TE)\d*\b/)?.[1] || null;

    let position = positionFromPlayer;
    for (const cell of cells.slice(2, 5)) {
      position ||= cell.match(/^(QB|RB|WR|TE)\d*$/i)?.[1]?.toUpperCase() || null;
    }

    // Strip duplicated short-name/image text, trailing team and position tokens.
    let name = playerCell
      .replace(/\b[A-Z]{2,3}\s+(?:QB|RB|WR|TE)\d*\b.*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    // Some printable rows are simply "Josh Allen BUF QB".
    const simple = playerCell.match(/^(.*?)\s+([A-Z]{2,3})\s+(QB|RB|WR|TE)\d*\b/i);
    if (simple) name = simple[1].trim();

    if (!name || !position) continue;
    players.push({ rank, name, team: teamFromPlayer, position });
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
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/148 Safari/537.36',
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'accept-language': 'en-US,en;q=0.9',
    },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return response.text();
}

async function trySource(name, url, parser) {
  try {
    const html = await fetchText(url);
    const players = parser(html);
    if (players.length < 12) {
      throw new Error(`parser only found ${players.length} players`);
    }
    console.log(`${name}: refreshed ${players.length} players`);
    return { ok: true, players, error: null };
  } catch (error) {
    console.warn(`${name}: refresh skipped (${error.message})`);
    return { ok: false, players: [], error: error.message };
  }
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

let prior = { players: {}, sources: {} };
try {
  prior = JSON.parse(await fs.readFile(OUT, 'utf8'));
} catch {
  // First generation is fine.
}

const [fantasyProsResult, pfnResult] = await Promise.all([
  trySource('FantasyPros', SOURCES.fantasyPros, parseFantasyPros),
  trySource('PFN', SOURCES.pfn, parsePfn),
]);

// Refreshing is maintenance, not a runtime dependency. If every web source is
// temporarily blocked but a checked-in snapshot exists, keep it and exit 0.
if (!fantasyProsResult.ok && !pfnResult.ok) {
  const priorCount = Object.keys(prior.players || {}).length;
  if (priorCount > 0) {
    console.warn(`No source refreshed; keeping checked-in snapshot with ${priorCount} players.`);
    console.warn('The draft helper can still build and run from the preserved snapshot.');
    process.exit(0);
  }
  throw new Error('No ranking source refreshed successfully and no prior snapshot exists.');
}

// Start from prior data so a temporarily blocked source does not erase useful rankings.
const players = {};
for (const player of Object.values(prior.players || {})) {
  const key = normalizeName(player.name);
  players[key] = { ...player };
}

if (fantasyProsResult.ok) {
  for (const player of Object.values(players)) delete player.fantasyProsRank;
  mergePlayers(players, fantasyProsResult.players, 'fantasyProsRank');
}
if (pfnResult.ok) {
  for (const player of Object.values(players)) delete player.pfnRank;
  mergePlayers(players, pfnResult.players, 'pfnRank');
}

const today = new Date().toISOString().slice(0, 10);
const sources = {
  ...(prior.sources || {}),
  fantasyPros: {
    name: 'FantasyPros PPR Superflex',
    asOf: fantasyProsResult.ok ? today : prior.sources?.fantasyPros?.asOf || null,
    url: SOURCES.fantasyPros,
    playerCount: fantasyProsResult.ok
      ? fantasyProsResult.players.length
      : Object.values(players).filter((p) => Number.isFinite(Number(p.fantasyProsRank))).length,
    refreshStatus: fantasyProsResult.ok ? 'refreshed' : 'preserved',
    refreshError: fantasyProsResult.error,
  },
  pfn: {
    name: 'Pro Football Network Superflex PPR Big Board',
    asOf: pfnResult.ok ? today : prior.sources?.pfn?.asOf || null,
    url: SOURCES.pfn,
    playerCount: pfnResult.ok
      ? pfnResult.players.length
      : Object.values(players).filter((p) => Number.isFinite(Number(p.pfnRank))).length,
    refreshStatus: pfnResult.ok ? 'refreshed' : 'preserved',
    refreshError: pfnResult.error,
  },
};

const snapshot = {
  snapshotVersion: 1,
  season: 2026,
  format: 'PPR_SUPERFLEX',
  generatedAt: today,
  notes: 'Static pre-draft ranking snapshot. Runtime does not scrape ranking sites. Refresh intentionally before draft day; blocked sources preserve their prior ranks.',
  sources,
  players,
};

await fs.mkdir(path.dirname(OUT), { recursive: true });
await fs.writeFile(OUT, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
console.log(`Wrote ${OUT}`);
console.log(
  `FantasyPros: ${sources.fantasyPros.playerCount} (${sources.fantasyPros.refreshStatus}); ` +
  `PFN: ${sources.pfn.playerCount} (${sources.pfn.refreshStatus}); merged: ${Object.keys(players).length}`,
);
