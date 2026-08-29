export function createEspnDraftWatcher({ teams = 8, onPick = null } = {}) {
  const seen = new Set();
  const picks = [];
  let observer = null;

  function parsePick(el) {
    const rawText = (el.innerText || '').replace(/\s+/g, ' ').trim();

    const pickMatch = rawText.match(/R(\d+)\s*,\s*P(\d+)\s*-\s*(.+)$/i);
    if (!pickMatch) return null;

    const round = Number(pickMatch[1]);
    const roundPick = Number(pickMatch[2]);
    const fantasyTeam = pickMatch[3].trim();

    const playerMatch = rawText.match(
      /^(.+?)\s*\/\s*([A-Z]{2,3})\s+(QB|RB|WR|TE|K|D\/ST|DST)\b/i,
    );
    if (!playerMatch) return null;

    const playerName = playerMatch[1].trim();
    const nflTeam = playerMatch[2].toUpperCase();
    const position = playerMatch[3].toUpperCase().replace('D/ST', 'DST');

    const img = el.querySelector('img[src*="/headshots/nfl/players/"]');
    let playerId = null;

    if (img?.src) {
      const idMatch = img.src.match(/\/players\/(?:full\/)?(\d+)\.(?:png|jpg|jpeg)/i);
      if (idMatch) playerId = Number(idMatch[1]);
    }

    return {
      overallPick: (round - 1) * teams + roundPick,
      round,
      roundPick,
      playerId,
      playerName,
      nflTeam,
      position,
      fantasyTeam,
      rawText,
    };
  }

  function scan({ announce = false } = {}) {
    const candidates = [...document.querySelectorAll('[class*="pick-message"]')];

    for (const el of candidates) {
      const pick = parsePick(el);
      if (!pick) continue;

      const key = `${pick.round}:${pick.roundPick}`;
      if (seen.has(key)) continue;

      seen.add(key);
      picks.push(pick);
      picks.sort((a, b) => a.overallPick - b.overallPick);

      if (announce) {
        console.log(`🏈 PICK ${pick.overallPick}: ${pick.playerName} (${pick.position})`);
        console.table([pick]);
        onPick?.(pick, [...picks]);
      }
    }

    return [...picks];
  }

  function start() {
    if (observer) observer.disconnect();

    const existing = scan({ announce: false });

    observer = new MutationObserver(() => {
      scan({ announce: true });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    console.log(`ESPN draft watcher running. ${existing.length} completed picks loaded.`);
    return [...picks];
  }

  function stop() {
    observer?.disconnect();
    observer = null;
  }

  function getPicks() {
    return [...picks];
  }

  return { start, stop, scan, getPicks, parsePick };
}
