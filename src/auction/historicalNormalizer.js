const HTML_ENTITY_MAP = {
  '&amp;': '&',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&lt;': '<',
  '&gt;': '>',
  '&nbsp;': ' ',
};

function decodeHtml(value = '') {
  return String(value)
    .replace(/&(amp|quot|#39|apos|lt|gt|nbsp);/g, (entity) => HTML_ENTITY_MAP[entity] ?? entity)
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function stripTags(value = '') {
  return decodeHtml(String(value).replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function parseNumber(value) {
  const parsed = Number(String(value ?? '').replace(/[$,]/g, '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function extractRows(html = '') {
  return [...String(html).matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((match) => match[1]);
}

function extractCells(rowHtml = '') {
  return [...String(rowHtml).matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((match) => match[1]);
}

function extractTitleAttribute(html = '') {
  const match = String(html).match(/\btitle="([^"]*)"/i);
  return match ? decodeHtml(match[1]).trim() : null;
}

function splitTeamAndManagers(title = '') {
  const cleaned = decodeHtml(title).trim();
  const match = cleaned.match(/^(.*?)\s*\(([^()]*)\)\s*$/);
  if (!match) {
    return { teamName: cleaned || null, managerNames: [] };
  }

  return {
    teamName: match[1].trim(),
    managerNames: match[2]
      .split(',')
      .map((name) => normalizeManagerName(name))
      .filter(Boolean),
  };
}

export function normalizeManagerName(name = '') {
  return String(name)
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\bsteve buckingham\b/i, 'Steven Buckingham')
    .replace(/\breece marsden\b/i, 'Reece Marsden');
}

export function normalizeTeamName(name = '') {
  return String(name).trim().replace(/\s+/g, ' ');
}

export function parseFinalStandingsHtml(html, season) {
  return extractRows(html)
    .map((rowHtml) => {
      const cells = extractCells(rowHtml);
      if (cells.length < 6) return null;

      const rank = parseNumber(stripTags(cells[0]));
      const teamTitle = extractTitleAttribute(cells[1]);
      if (!rank || !teamTitle) return null;

      const { teamName, managerNames } = splitTeamAndManagers(teamTitle);
      const record = stripTags(cells[2]) || null;
      const pointsFor = parseNumber(stripTags(cells[3]));
      const pointsAgainst = parseNumber(stripTags(cells[4]));
      const pointsForPerGame = parseNumber(stripTags(cells[5]));
      const pointsAgainstPerGame = cells.length > 6 ? parseNumber(stripTags(cells[6])) : null;

      return {
        season,
        rank,
        teamName: normalizeTeamName(teamName),
        managerNames,
        primaryManager: managerNames[0] ?? null,
        record,
        pointsFor,
        pointsAgainst,
        pointsForPerGame,
        pointsAgainstPerGame,
      };
    })
    .filter(Boolean);
}

function splitDraftRecapTeamBlocks(html = '') {
  const pattern = /<div class="[^"]*draftRecapTable[^"]*byTeam[^"]*">([\s\S]*?)(?=<div class="[^"]*draftRecapTable[^"]*byTeam[^"]*">|$)/gi;
  return [...String(html).matchAll(pattern)].map((match) => match[1]);
}

function parsePlayerCell(cellHtml = '') {
  const playerMatch = String(cellHtml).match(/<a\b[^>]*>([\s\S]*?)<\/a>/i);
  const positionMatches = [...String(cellHtml).matchAll(/<span\b[^>]*class="[^"]*fw-medium[^"]*"[^>]*>([\s\S]*?)<\/span>/gi)];

  return {
    playerName: playerMatch ? stripTags(playerMatch[1]) : null,
    position: positionMatches.length ? stripTags(positionMatches.at(-1)[1]).toUpperCase() : null,
    isKeeper: /title="Keeper"/i.test(cellHtml),
  };
}

export function parseDraftRecapHtml(html, season) {
  const blocks = splitDraftRecapTeamBlocks(html);
  const records = [];

  for (const block of blocks) {
    const teamMatch = block.match(/<span\b[^>]*class="[^"]*teamName[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
    const teamName = teamMatch ? normalizeTeamName(stripTags(teamMatch[1])) : null;
    if (!teamName) continue;

    for (const rowHtml of extractRows(block)) {
      const cells = extractCells(rowHtml);
      if (cells.length < 3) continue;

      const draftNumber = parseNumber(stripTags(cells[0]));
      const { playerName, position, isKeeper } = parsePlayerCell(cells[1]);
      const price = parseNumber(stripTags(cells[2]));
      if (!draftNumber || !playerName || !position || price == null) continue;

      records.push({
        season,
        teamName,
        draftNumber,
        playerName,
        position,
        price,
        isKeeper,
        behaviorSource: 'unknown',
        ownerBehaviorEligible: false,
      });
    }
  }

  return records;
}

export function parseLeagueMembersHtml(html, season = 2026) {
  return extractRows(html)
    .map((rowHtml) => {
      const cells = extractCells(rowHtml);
      if (cells.length < 5) return null;

      const memberNumber = parseNumber(stripTags(cells[0]));
      const abbreviation = stripTags(cells[1]);
      const teamTitle = extractTitleAttribute(cells[2]);
      const managerName = normalizeManagerName(stripTags(cells[4]));
      if (!memberNumber || !teamTitle || !managerName) return null;

      return {
        season,
        memberNumber,
        abbreviation,
        teamName: normalizeTeamName(teamTitle),
        managerName,
        active: true,
      };
    })
    .filter(Boolean);
}

export function buildManagerContinuity(standingsBySeason, currentMembers = []) {
  const currentManagers = new Set(currentMembers.map((member) => normalizeManagerName(member.managerName)));
  const continuity = new Map();

  for (const standing of standingsBySeason.flat()) {
    for (const rawManagerName of standing.managerNames ?? []) {
      const managerName = normalizeManagerName(rawManagerName);
      if (!managerName) continue;

      const entry = continuity.get(managerName) ?? {
        managerName,
        currentMember: currentManagers.has(managerName),
        seasons: [],
        teamNames: [],
      };

      entry.currentMember ||= currentManagers.has(managerName);
      if (!entry.seasons.includes(standing.season)) entry.seasons.push(standing.season);
      if (standing.teamName && !entry.teamNames.includes(standing.teamName)) entry.teamNames.push(standing.teamName);
      continuity.set(managerName, entry);
    }
  }

  for (const member of currentMembers) {
    const managerName = normalizeManagerName(member.managerName);
    const entry = continuity.get(managerName) ?? {
      managerName,
      currentMember: true,
      seasons: [],
      teamNames: [],
    };
    entry.currentMember = true;
    if (member.teamName && !entry.teamNames.includes(member.teamName)) entry.teamNames.push(member.teamName);
    continuity.set(managerName, entry);
  }

  return [...continuity.values()].map((entry) => ({
    ...entry,
    seasons: [...entry.seasons].sort((a, b) => a - b),
  }));
}
