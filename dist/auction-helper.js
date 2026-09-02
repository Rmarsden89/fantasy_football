var FantasyAuctionHelperBundle = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/auction/index.js
  var index_exports = {};
  __export(index_exports, {
    buildAuctionState: () => buildAuctionState,
    startAuctionPracticeHelper: () => startAuctionPracticeHelper
  });

  // src/byeWeeks.js
  var BYE_WEEK_BY_PRO_TEAM_ID_2026 = {
    1: 11,
    // ATL
    2: 7,
    // BUF
    3: 10,
    // CHI
    4: 6,
    // CIN
    5: 11,
    // CLE
    6: 14,
    // DAL
    7: 10,
    // DEN
    8: 6,
    // DET
    9: 11,
    // GB
    10: 9,
    // TEN
    11: 13,
    // IND
    12: 5,
    // KC
    13: 13,
    // LV
    14: 11,
    // LAR
    15: 6,
    // MIA
    16: 6,
    // MIN
    17: 11,
    // NE
    18: 8,
    // NO
    19: 8,
    // NYG
    20: 13,
    // NYJ
    21: 10,
    // PHI
    22: 14,
    // ARI
    23: 9,
    // PIT
    24: 7,
    // LAC
    25: 8,
    // SF
    26: 11,
    // SEA
    27: 10,
    // TB
    28: 7,
    // WAS
    29: 5,
    // CAR
    30: 7,
    // JAX
    33: 13,
    // BAL
    34: 8
    // HOU
  };
  function byeWeekForProTeamId(proTeamId, season = 2026) {
    if (season !== 2026) return null;
    return BYE_WEEK_BY_PRO_TEAM_ID_2026[Number(proTeamId)] ?? null;
  }

  // src/espnPlayerPool.js
  var POSITION_BY_DEFAULT_ID = {
    1: "QB",
    2: "RB",
    3: "WR",
    4: "TE",
    5: "K",
    16: "DST"
  };
  function projectedPoints(player) {
    const stats = player.stats || [];
    const projected = stats.filter((stat) => stat.statSourceId === 1 && Number.isFinite(stat.appliedTotal)).sort((a, b) => {
      const aSeason = a.statSplitTypeId === 0 ? 1 : 0;
      const bSeason = b.statSplitTypeId === 0 ? 1 : 0;
      return bSeason - aSeason;
    });
    return projected[0]?.appliedTotal ?? null;
  }
  function draftRank(player) {
    const ranks = player.draftRanksByRankType || {};
    const preferred = ranks.SUPERFLEX || ranks.PPR || ranks.STANDARD;
    return preferred?.rank ?? preferred?.auctionValue ?? null;
  }
  function normalizeEspnPlayer(entry, season = 2026) {
    const player = entry.player || entry;
    const position = POSITION_BY_DEFAULT_ID[player.defaultPositionId] || null;
    const nflTeamId = player.proTeamId;
    return {
      id: entry.id ?? player.id,
      name: player.fullName,
      nflTeamId,
      position,
      active: player.active ?? null,
      projectedPoints: projectedPoints(player),
      espnRank: draftRank(player),
      percentOwned: player.ownership?.percentOwned ?? null,
      averageDraftPosition: player.ownership?.averageDraftPosition ?? null,
      auctionValueAverage: player.ownership?.auctionValueAverage ?? null,
      injuryStatus: player.injuryStatus ?? null,
      seasonOutlook: player.seasonOutlook ?? "",
      lastNewsDate: player.lastNewsDate ?? null,
      byeWeek: byeWeekForProTeamId(nflTeamId, season),
      raw: entry
    };
  }
  function isDraftEligiblePlayer(player) {
    if (!player?.position) return false;
    if (player.active === false) return false;
    if (player.position !== "DST" && !(Number(player.nflTeamId) > 0)) return false;
    return true;
  }
  async function fetchEspnPlayerPool({
    leagueId,
    season,
    limit = 1e3,
    endpointHost = "https://lm-api-reads.fantasy.espn.com"
  } = {}) {
    if (!leagueId || !season) {
      throw new Error("leagueId and season are required");
    }
    const url = new URL(
      `/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${leagueId}`,
      endpointHost
    );
    url.searchParams.set("view", "kona_player_info");
    url.searchParams.set("scoringPeriodId", "1");
    const fantasyFilter = {
      players: {
        filterSlotIds: { value: [0, 2, 4, 6, 16, 17, 23] },
        limit,
        sortPercOwned: {
          sortPriority: 1,
          sortAsc: false
        },
        filterRanksForScoringPeriodIds: { value: [1] },
        filterRanksForRankTypes: { value: ["SUPERFLEX", "PPR", "STANDARD"] }
      }
    };
    const response = await fetch(url, {
      headers: {
        "X-Fantasy-Filter": JSON.stringify(fantasyFilter)
      },
      credentials: "include"
    });
    if (!response.ok) {
      throw new Error(`ESPN player pool request failed: ${response.status}`);
    }
    const data = await response.json();
    return (data.players || []).map((entry) => normalizeEspnPlayer(entry, season)).filter(isDraftEligiblePlayer);
  }

  // src/auction/config.js
  var AUCTION_LEAGUE_CONFIG = {
    season: 2026,
    leagueId: 1727104,
    myTeamId: 16,
    myTeamName: "Uncle RICO",
    teams: 16,
    draftType: "SALARY_CAP",
    salaryCap: 250,
    keeperCount: 2,
    minimumBid: 1,
    myKeepers: [
      { playerName: "Brock Bowers", position: "TE", price: 28 },
      { playerName: "Chris Olave", position: "WR", price: 25 }
    ],
    roster: {
      QB: 1,
      RB: 1,
      WR: 2,
      TE: 1,
      FLEX: 1,
      DP: 1,
      DST: 1,
      K: 1,
      BENCH: 6,
      IR: 2
    },
    positionLimits: {
      QB: 2,
      RB: 3,
      WR: 5,
      TE: 2,
      DST: 2,
      K: 2
    },
    auctionStrategy: {
      starterReserve: {
        QB: [32],
        RB: [28],
        WR: [28, 18],
        TE: [18],
        DP: [2],
        DST: [1],
        K: [1]
      },
      flexReserve: 18,
      flexPositions: ["RB", "WR", "TE"],
      roleValueMultiplier: {
        STARTER: 1,
        FLEX: 0.85,
        BENCH: 0.35
      },
      market: {
        clearingBufferPct: 0.05,
        minimumClearingBuffer: 2,
        maximumClearingBuffer: 5
      }
    },
    scoring: {
      passing: {
        yards: 0.04,
        completion: 0.1,
        touchdown: 6,
        interception: -2,
        twoPointConversion: 2
      },
      rushing: {
        yards: 0.1,
        attempt: 0.1,
        touchdown: 6,
        twoPointConversion: 2
      },
      receiving: {
        yards: 0.1,
        reception: 1,
        touchdown: 6,
        twoPointConversion: 2
      },
      kicking: {
        extraPointMade: 1,
        extraPointMissed: -1,
        fieldGoal0To39: 3,
        fieldGoal40To49: 3,
        fieldGoalMiss0To39: -3,
        fieldGoalMiss40To49: -1,
        fieldGoal50To59: 5,
        fieldGoal60Plus: 7,
        fieldGoalYards50Plus: 5
      },
      defense: {
        kickReturnYards: 0.05,
        puntReturnYards: 0.05,
        returnTouchdown: 6,
        sack: 1,
        blockedKick: 2,
        interception: 2,
        fumbleRecovery: 2,
        safety: 2
      },
      individualDefense: {
        sack: 5,
        blockedKick: 4,
        interception: 6,
        fumbleRecovery: 2,
        forcedFumble: 3,
        safety: 4,
        assistedTackle: 0.5,
        soloTackle: 1.5,
        stuff: 1.5,
        passDefended: 1.5
      }
    }
  };
  function getActiveRosterSize(config = AUCTION_LEAGUE_CONFIG) {
    return Object.entries(config.roster).filter(([slot]) => slot !== "IR").reduce((total, [, count]) => total + count, 0);
  }

  // src/auction/cheatSheet.js
  var AUCTION_CHEAT_SHEET = {
    version: "2026-09-01-v1",
    goals: {
      primary: "Acquire an elite RB1 without sacrificing roster balance",
      secondary: ["Add a quality WR2", "Add a starting QB at a sensible price"]
    },
    tierMultipliers: {
      STRETCH: 1.08,
      IDEAL: 1.03,
      FALLBACK: 0.98,
      VALUE_ONLY: 0.88,
      AVOID: 0.65
    },
    maxRemainingBudgetShare: {
      RB: { STRETCH: 0.5, IDEAL: 0.45, FALLBACK: 0.36, VALUE_ONLY: 0.25, AVOID: 0.12 },
      WR: { STRETCH: 0.38, IDEAL: 0.31, FALLBACK: 0.24, VALUE_ONLY: 0.18, AVOID: 0.1 },
      QB: { STRETCH: 0.3, IDEAL: 0.22, FALLBACK: 0.16, VALUE_ONLY: 0.12, AVOID: 0.08 }
    },
    players: {
      // Elite-RB chase. These are preference tiers, not fixed dollar values.
      "Jahmyr Gibbs": { position: "RB", tier: "STRETCH", targetRole: "RB1", eliteRb: true },
      "Jonathan Taylor": { position: "RB", tier: "STRETCH", targetRole: "RB1", eliteRb: true },
      "De'Von Achane": { position: "RB", tier: "STRETCH", targetRole: "RB1", eliteRb: true },
      "Christian McCaffrey": { position: "RB", tier: "STRETCH", targetRole: "RB1", eliteRb: true },
      "Saquon Barkley": { position: "RB", tier: "IDEAL", targetRole: "RB1", eliteRb: true },
      "Chase Brown": { position: "RB", tier: "IDEAL", targetRole: "RB1", eliteRb: true },
      "Omarion Hampton": { position: "RB", tier: "IDEAL", targetRole: "RB1", eliteRb: true },
      "Derrick Henry": { position: "RB", tier: "IDEAL", targetRole: "RB1", eliteRb: true },
      "Ashton Jeanty": { position: "RB", tier: "IDEAL", targetRole: "RB1", eliteRb: true },
      "Jeremiyah Love": { position: "RB", tier: "FALLBACK", targetRole: "RB1/FLEX" },
      "Kenneth Walker III": { position: "RB", tier: "FALLBACK", targetRole: "RB1/FLEX" },
      "Breece Hall": { position: "RB", tier: "FALLBACK", targetRole: "RB1/FLEX" },
      "Kyren Williams": { position: "RB", tier: "FALLBACK", targetRole: "RB1/FLEX" },
      "Javonte Williams": { position: "RB", tier: "FALLBACK", targetRole: "RB1/FLEX" },
      "Travis Etienne Jr.": { position: "RB", tier: "VALUE_ONLY", targetRole: "FLEX" },
      "Quinshon Judkins": { position: "RB", tier: "VALUE_ONLY", targetRole: "FLEX" },
      "Bhayshul Tuten": { position: "RB", tier: "VALUE_ONLY", targetRole: "FLEX/BENCH" },
      "Cam Skattebo": { position: "RB", tier: "VALUE_ONLY", targetRole: "FLEX/BENCH" },
      "D'Andre Swift": { position: "RB", tier: "VALUE_ONLY", targetRole: "FLEX/BENCH" },
      // WR2 targets behind keeper Chris Olave. We do not need to force this tier
      // if the room is expensive; the market engine can wait for value.
      "Ja'Marr Chase": { position: "WR", tier: "STRETCH", targetRole: "WR1/WR2" },
      "Puka Nacua": { position: "WR", tier: "STRETCH", targetRole: "WR1/WR2" },
      "Amon-Ra St. Brown": { position: "WR", tier: "STRETCH", targetRole: "WR1/WR2" },
      "Jaxon Smith-Njigba": { position: "WR", tier: "STRETCH", targetRole: "WR1/WR2" },
      "CeeDee Lamb": { position: "WR", tier: "STRETCH", targetRole: "WR1/WR2" },
      "Drake London": { position: "WR", tier: "IDEAL", targetRole: "WR2" },
      "Nico Collins": { position: "WR", tier: "IDEAL", targetRole: "WR2" },
      "Garrett Wilson": { position: "WR", tier: "IDEAL", targetRole: "WR2" },
      "Rashee Rice": { position: "WR", tier: "IDEAL", targetRole: "WR2" },
      "A.J. Brown": { position: "WR", tier: "IDEAL", targetRole: "WR2" },
      "DeVonta Smith": { position: "WR", tier: "FALLBACK", targetRole: "WR2/FLEX" },
      "Tetairoa McMillan": { position: "WR", tier: "FALLBACK", targetRole: "WR2/FLEX" },
      "Emeka Egbuka": { position: "WR", tier: "FALLBACK", targetRole: "WR2/FLEX" },
      "Zay Flowers": { position: "WR", tier: "FALLBACK", targetRole: "WR2/FLEX" },
      "Davante Adams": { position: "WR", tier: "FALLBACK", targetRole: "WR2/FLEX" },
      "Ladd McConkey": { position: "WR", tier: "FALLBACK", targetRole: "WR2/FLEX" },
      "Jaylen Waddle": { position: "WR", tier: "FALLBACK", targetRole: "WR2/FLEX" },
      "Josh Allen": { position: "QB", tier: "STRETCH", targetRole: "QB1" },
      "Lamar Jackson": { position: "QB", tier: "IDEAL", targetRole: "QB1" }
    }
  };
  function normalizeName(value = "") {
    return String(value).trim().toLowerCase();
  }
  var PLAYER_LOOKUP = new Map(
    Object.entries(AUCTION_CHEAT_SHEET.players).map(([name, entry]) => [normalizeName(name), { name, ...entry }])
  );
  function getCheatSheetPlayer(playerName) {
    return PLAYER_LOOKUP.get(normalizeName(playerName)) ?? null;
  }
  function buildCheatSheetState({ roster = [], remainingBudget = 0 } = {}) {
    const mappedRoster = roster.map((player) => ({
      player,
      cheat: getCheatSheetPlayer(player?.playerName)
    }));
    const rbRoster = roster.filter((player) => player?.position === "RB");
    const eliteRb = mappedRoster.find(({ cheat }) => cheat?.position === "RB" && cheat?.eliteRb);
    const wrCount = roster.filter((player) => player?.position === "WR").length;
    const qbCount = roster.filter((player) => player?.position === "QB").length;
    return {
      eliteRbSecured: Boolean(eliteRb),
      eliteRbName: eliteRb?.player?.playerName ?? null,
      rbCount: rbRoster.length,
      wrCount,
      qbCount,
      remainingBudget,
      budgetMode: remainingBudget >= 140 ? "AGGRESSIVE" : remainingBudget >= 90 ? "BALANCED" : "PROTECT"
    };
  }
  function buildCheatSheetContext({ playerName, position, roster = [], remainingBudget = 0 } = {}) {
    const player = getCheatSheetPlayer(playerName);
    const state = buildCheatSheetState({ roster, remainingBudget });
    if (!player) {
      return {
        player: null,
        state,
        tier: "UNRATED",
        targetRole: null,
        preferenceMultiplier: 1,
        maximumCheatSheetBid: null,
        reason: "Player is not yet explicitly rated on the cheat sheet."
      };
    }
    let preferenceMultiplier = Number(AUCTION_CHEAT_SHEET.tierMultipliers[player.tier] ?? 1);
    const reasons = [`${player.tier} cheat-sheet target`];
    if (position === "RB") {
      if (!state.eliteRbSecured && player.eliteRb) {
        preferenceMultiplier += state.budgetMode === "AGGRESSIVE" ? 0.04 : state.budgetMode === "BALANCED" ? 0.02 : 0;
        reasons.push("elite RB1 is still an open primary goal");
      } else if (state.eliteRbSecured) {
        preferenceMultiplier *= 0.72;
        reasons.push(`elite RB1 already secured (${state.eliteRbName})`);
      } else if (state.rbCount >= 1) {
        preferenceMultiplier *= 0.88;
        reasons.push("RB starter is already filled, so this is mainly FLEX/depth");
      }
    }
    if (position === "WR" && state.wrCount >= 2) {
      preferenceMultiplier *= 0.82;
      reasons.push("both starting WR slots are already filled");
    }
    if (position === "QB" && state.qbCount >= 1) {
      preferenceMultiplier *= 0.7;
      reasons.push("QB1 is already secured");
    }
    if (state.budgetMode === "PROTECT" && player.tier === "STRETCH") {
      preferenceMultiplier = Math.min(preferenceMultiplier, 1);
      reasons.push("remaining budget is in protect mode, so stretch premium is disabled");
    }
    const share = Number(AUCTION_CHEAT_SHEET.maxRemainingBudgetShare?.[position]?.[player.tier]);
    const maximumCheatSheetBid = Number.isFinite(share) ? Math.max(1, Math.floor(remainingBudget * share)) : null;
    if (Number.isFinite(maximumCheatSheetBid)) {
      reasons.push(`cheat-sheet budget guardrail is $${maximumCheatSheetBid}`);
    }
    return {
      player,
      state,
      tier: player.tier,
      targetRole: player.targetRole,
      preferenceMultiplier: Number(Math.max(0.5, Math.min(1.15, preferenceMultiplier)).toFixed(3)),
      maximumCheatSheetBid,
      reason: reasons.join("; ")
    };
  }

  // src/auction/espnAuctionWatcher.js
  function normalizeText(value = "") {
    return String(value).replace(/\s+/g, " ").trim();
  }
  function findPrice(text) {
    const matches = [...text.matchAll(/\$(\d{1,3})\b/g)];
    if (!matches.length) return null;
    return Number(matches.at(-1)[1]);
  }
  function findPlayerId(el) {
    const img = el.querySelector?.('img[src*="/headshots/nfl/players/"]');
    if (!img?.src) return null;
    const match = img.src.match(/\/players\/(?:full\/)?(\d+)\.(?:png|jpg|jpeg)/i);
    return match ? Number(match[1]) : null;
  }
  function parsePlayer(text) {
    const match = text.match(/^(.+?)\s*\/\s*([A-Z]{2,3})\s+(QB|RB|WR|TE|K|D\/ST|DST)\b/i);
    if (!match) return null;
    return {
      playerName: match[1].trim(),
      nflTeam: match[2].toUpperCase(),
      position: match[3].toUpperCase().replace("D/ST", "DST")
    };
  }
  function parseWinningTeam(text, price) {
    const escapedPrice = String(price).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patterns = [
      new RegExp(`(?:to|by|won by)\\s+(.+?)\\s+(?:for\\s+)?\\$${escapedPrice}\\b`, "i"),
      new RegExp(`\\$${escapedPrice}\\s*[-\u2013\u2014:]?\\s*(.+)$`, "i")
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) return match[1].trim();
    }
    return null;
  }
  function parseAuctionEventElement(el) {
    const rawText = normalizeText(el?.innerText || el?.textContent || "");
    if (!rawText || !rawText.includes("$")) return null;
    const player = parsePlayer(rawText);
    const price = findPrice(rawText);
    if (!player || !Number.isFinite(price)) return null;
    const fantasyTeam = parseWinningTeam(rawText, price);
    return {
      ...player,
      playerId: findPlayerId(el),
      price,
      fantasyTeam,
      rawText
    };
  }
  function canonicalSaleKey(sale) {
    return [
      normalizeText(sale?.playerName || "").toLowerCase(),
      Number(sale?.price),
      normalizeText(sale?.fantasyTeam || "").toLowerCase()
    ].join("|");
  }
  function createEspnAuctionWatcher({ onSale = null } = {}) {
    const seen = /* @__PURE__ */ new Set();
    const sales = [];
    let observer = null;
    function candidateElements() {
      const selectors = [
        '[class*="pick-message"]',
        '[class*="draft-message"]',
        '[class*="activity"]',
        '[class*="event"]',
        '[class*="message"]'
      ];
      return [...new Set(selectors.flatMap((selector) => [...document.querySelectorAll(selector)]))];
    }
    function scan({ announce = false } = {}) {
      for (const el of candidateElements()) {
        const sale = parseAuctionEventElement(el);
        if (!sale) continue;
        const key = canonicalSaleKey(sale);
        if (seen.has(key)) continue;
        seen.add(key);
        const numbered = { saleNumber: sales.length + 1, ...sale };
        sales.push(numbered);
        if (announce) {
          console.log(`\u{1F4B0} SALE ${numbered.saleNumber}: ${sale.playerName} for $${sale.price}`);
          console.table([numbered]);
          onSale?.(numbered, [...sales]);
        }
      }
      return [...sales];
    }
    function start() {
      observer?.disconnect();
      const existing = scan({ announce: false });
      observer = new MutationObserver(() => scan({ announce: true }));
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      });
      console.log(`ESPN salary-cap watcher running. ${existing.length} completed sales loaded.`);
      return [...sales];
    }
    function stop() {
      observer?.disconnect();
      observer = null;
    }
    function getSales() {
      return [...sales];
    }
    return { start, stop, scan, getSales };
  }

  // src/auction/nominationWatcher.js
  function normalizeText2(value = "") {
    return String(value).replace(/\s+/g, " ").trim();
  }
  function normalizePosition(value = "") {
    return String(value).trim().toUpperCase().replace("D/ST", "DST");
  }
  function parseDollarAfterLabel(text, label) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = normalizeText2(text).match(new RegExp(`${escaped}\\s*\\$([0-9]{1,3})`, "i"));
    return match ? Number(match[1]) : null;
  }
  function parseProjectedPoints(text = "") {
    const cleaned = normalizeText2(text);
    const match = cleaned.match(/2026 PROJECTED:.*?([0-9]+(?:\.[0-9]+)?)\s+PTS\b/i);
    return match ? Number(match[1]) : null;
  }
  function parseNomineeCardText(text = "") {
    const cleaned = normalizeText2(text);
    if (!/CURRENT OFFER:\s*\$\d+/i.test(cleaned) || !/PRE-DRAFT VAL:\s*\$\d+/i.test(cleaned)) return null;
    const boundaryIndex = [" CURRENT OFFER:", " 2025 STATS:"].map((marker) => cleaned.toUpperCase().indexOf(marker)).filter((index) => index >= 0).sort((a, b) => a - b)[0];
    if (!Number.isInteger(boundaryIndex)) return null;
    const heading = cleaned.slice(0, boundaryIndex).trim();
    const headingMatch = heading.match(/^(.+?)\s*([A-Z]{2,3})\s*(QB|RB|WR|TE|K|D\/ST|DST)$/);
    if (!headingMatch) return null;
    return {
      playerName: headingMatch[1].trim(),
      nflTeam: headingMatch[2].toUpperCase(),
      position: normalizePosition(headingMatch[3]),
      currentBid: parseDollarAfterLabel(cleaned, "CURRENT OFFER:"),
      marketValue: parseDollarAfterLabel(cleaned, "PRE-DRAFT VAL:"),
      projectedPoints: parseProjectedPoints(cleaned),
      marketValueSource: "espn-practice",
      rawText: cleaned
    };
  }
  function detectFromPlayerSelectedDom() {
    const card = document.querySelector(".player-selected");
    if (!card) return null;
    const nameEl = card.querySelector('[class*="playerinfo__playername"]');
    const teamEl = card.querySelector('[class*="playerinfo__playerteam"]');
    const positionEl = card.querySelector('[class*="playerinfo__playerpos"]');
    if (!nameEl || !teamEl || !positionEl) return null;
    const playerName = normalizeText2(nameEl.textContent || nameEl.innerText || "");
    const nflTeam = normalizeText2(teamEl.textContent || teamEl.innerText || "").toUpperCase();
    const position = normalizePosition(positionEl.textContent || positionEl.innerText || "");
    if (!playerName || !nflTeam || !position) return null;
    const pickArea = card.closest(".pickArea") ?? card.parentElement ?? card;
    const rawText = normalizeText2(pickArea.innerText || pickArea.textContent || "");
    const currentBid = parseDollarAfterLabel(rawText, "CURRENT OFFER:");
    const marketValue = parseDollarAfterLabel(rawText, "PRE-DRAFT VAL:");
    if (!Number.isFinite(currentBid) || !Number.isFinite(marketValue)) return null;
    return {
      playerName,
      nflTeam,
      position,
      currentBid,
      marketValue,
      projectedPoints: parseProjectedPoints(rawText),
      marketValueSource: "espn-practice",
      rawText
    };
  }
  function nomineeCandidates() {
    const selectors = [
      '[class*="auction"]',
      '[class*="offer"]',
      '[class*="draft"]',
      '[class*="player"]',
      "section",
      "div"
    ];
    const elements = [...new Set(selectors.flatMap((selector) => [...document.querySelectorAll(selector)]))];
    return elements.map((el) => ({ el, text: normalizeText2(el.innerText || el.textContent || "") })).filter(({ text }) => /CURRENT OFFER:\s*\$\d+/i.test(text) && /PRE-DRAFT VAL:\s*\$\d+/i.test(text)).sort((a, b) => a.text.length - b.text.length);
  }
  function nominationIdentity(nomination) {
    if (!nomination?.playerName) return null;
    return `${nomination.playerName}|${nomination.nflTeam ?? ""}|${nomination.position ?? ""}`.toLowerCase();
  }
  function detectCurrentNomination() {
    const structured = detectFromPlayerSelectedDom();
    if (structured) return structured;
    for (const { text } of nomineeCandidates()) {
      const nomination = parseNomineeCardText(text);
      if (nomination) return nomination;
    }
    return null;
  }
  function createNominationWatcher({ onNomination = null, intervalMs = 500 } = {}) {
    let timer = null;
    let lastKey = null;
    function scan() {
      const nomination = detectCurrentNomination();
      if (!nomination) return null;
      const key = nominationIdentity(nomination);
      if (key && key !== lastKey) {
        lastKey = key;
        onNomination?.(nomination);
      }
      return nomination;
    }
    function start() {
      stop();
      lastKey = null;
      const initial = scan();
      timer = setInterval(scan, intervalMs);
      return initial;
    }
    function stop() {
      if (timer) clearInterval(timer);
      timer = null;
    }
    return { start, stop, scan };
  }

  // src/auction/marketMath.js
  function getRemainingRosterSpots({ playersRostered = 0, config = AUCTION_LEAGUE_CONFIG } = {}) {
    return Math.max(0, getActiveRosterSize(config) - playersRostered);
  }
  function getMaximumBid({
    remainingBudget,
    playersRostered = 0,
    config = AUCTION_LEAGUE_CONFIG
  }) {
    const spotsLeft = getRemainingRosterSpots({ playersRostered, config });
    if (spotsLeft <= 0) return 0;
    const reserveForOtherSpots = Math.max(0, spotsLeft - 1) * config.minimumBid;
    return Math.max(0, remainingBudget - reserveForOtherSpots);
  }
  function getDiscretionaryBudget({
    remainingBudget,
    playersRostered = 0,
    config = AUCTION_LEAGUE_CONFIG
  }) {
    const spotsLeft = getRemainingRosterSpots({ playersRostered, config });
    const minimumRequired = spotsLeft * config.minimumBid;
    return Math.max(0, remainingBudget - minimumRequired);
  }

  // src/auction/marketContext.js
  function positionCounts(players = []) {
    return players.reduce((counts, player) => {
      const position = player?.position;
      if (!position) return counts;
      counts[position] = (counts[position] ?? 0) + 1;
      return counts;
    }, {});
  }
  function starterRequirements(config) {
    return {
      QB: config.roster.QB ?? 0,
      RB: config.roster.RB ?? 0,
      WR: config.roster.WR ?? 0,
      TE: config.roster.TE ?? 0,
      DP: config.roster.DP ?? 0,
      DST: config.roster.DST ?? 0,
      K: config.roster.K ?? 0
    };
  }
  function flexFilled(counts, config) {
    const requirements = starterRequirements(config);
    const flexPositions = config.auctionStrategy?.flexPositions ?? ["RB", "WR", "TE"];
    const surplus = flexPositions.reduce(
      (total, position) => total + Math.max(0, (counts[position] ?? 0) - (requirements[position] ?? 0)),
      0
    );
    return surplus >= (config.roster.FLEX ?? 0);
  }
  function demandWeightForPosition(position, roster, config) {
    const counts = positionCounts(roster);
    const requirements = starterRequirements(config);
    const have = counts[position] ?? 0;
    const required = requirements[position] ?? 0;
    if (have < required) return 1;
    const flexPositions = config.auctionStrategy?.flexPositions ?? ["RB", "WR", "TE"];
    if (flexPositions.includes(position) && !flexFilled(counts, config)) return 0.55;
    const positionLimit = config.positionLimits?.[position];
    if (!Number.isFinite(positionLimit) || have < positionLimit) return 0.15;
    return 0;
  }
  function groupOpponentSales(sales, config) {
    const grouped = /* @__PURE__ */ new Map();
    for (const sale of sales ?? []) {
      if (!sale?.fantasyTeam || sale.fantasyTeam === config.myTeamName) continue;
      const team = grouped.get(sale.fantasyTeam) ?? { teamName: sale.fantasyTeam, spent: 0, roster: [] };
      team.spent += Number(sale.price || 0);
      team.roster.push(sale);
      grouped.set(sale.fantasyTeam, team);
    }
    return [...grouped.values()];
  }
  function buildOpponentDemand({
    position,
    marketValue,
    sales = [],
    config = AUCTION_LEAGUE_CONFIG
  } = {}) {
    if (!position) return null;
    const opponents = groupOpponentSales(sales, config);
    const observedOpponentCount = opponents.length;
    const unknownOpponentCount = Math.max(0, (config.teams ?? 1) - 1 - observedOpponentCount);
    const targetValue = Math.max(config.minimumBid, Number(marketValue) || config.minimumBid);
    let effectiveDemand = unknownOpponentCount;
    let starterNeedTeams = unknownOpponentCount;
    let flexNeedTeams = 0;
    let capableBidderCount = unknownOpponentCount;
    const details = opponents.map((team) => {
      const playersRostered = team.roster.length;
      const remainingBudget = Math.max(0, config.salaryCap - team.spent);
      const maxBid = getMaximumBid({ remainingBudget, playersRostered, config });
      const demandWeight = demandWeightForPosition(position, team.roster, config);
      const abilityWeight = Math.min(1, maxBid / targetValue);
      const weightedDemand = demandWeight * abilityWeight;
      const counts = positionCounts(team.roster);
      const required = starterRequirements(config)[position] ?? 0;
      if ((counts[position] ?? 0) < required) starterNeedTeams += 1;
      else if (demandWeight >= 0.5) flexNeedTeams += 1;
      if (demandWeight >= 0.5 && maxBid >= Math.max(config.minimumBid, targetValue * 0.7)) {
        capableBidderCount += 1;
      }
      effectiveDemand += weightedDemand;
      return {
        teamName: team.teamName,
        maxBid,
        demandWeight,
        abilityWeight: Number(abilityWeight.toFixed(3)),
        weightedDemand: Number(weightedDemand.toFixed(3))
      };
    });
    return {
      position,
      observedOpponentCount,
      unknownOpponentCount,
      effectiveDemand: Number(effectiveDemand.toFixed(3)),
      starterNeedTeams,
      flexNeedTeams,
      capableBidderCount,
      details
    };
  }
  function normalizeName2(value = "") {
    return String(value).trim().toLowerCase();
  }
  function buildRemainingSupply({
    nomination,
    playerPool = [],
    sales = [],
    config = AUCTION_LEAGUE_CONFIG
  } = {}) {
    const position = nomination?.position;
    const projectedPoints2 = Number(nomination?.projectedPoints);
    if (!position || !Number.isFinite(projectedPoints2) || projectedPoints2 <= 0 || !playerPool?.length) {
      return null;
    }
    const soldIds = new Set((sales ?? []).map((sale) => Number(sale?.playerId)).filter(Number.isFinite));
    const soldNames = new Set((sales ?? []).map((sale) => normalizeName2(sale?.playerName)).filter(Boolean));
    const keeperNames = new Set((config.myKeepers ?? []).map((keeper) => normalizeName2(keeper.playerName)));
    const nomineeName = normalizeName2(nomination.playerName);
    const remainingAtPosition = playerPool.filter((player) => {
      if (player?.position !== position) return false;
      if (soldIds.has(Number(player.id))) return false;
      if (soldNames.has(normalizeName2(player.name))) return false;
      if (keeperNames.has(normalizeName2(player.name))) return false;
      if (Number(player.raw?.onTeamId) > 0) return false;
      if (normalizeName2(player.name) === nomineeName) return false;
      return Number.isFinite(Number(player.projectedPoints));
    });
    const comparableFloor = projectedPoints2 * 0.9;
    const nearFloor = projectedPoints2 * 0.9;
    const nearCeiling = projectedPoints2 * 1.05;
    const comparable = remainingAtPosition.filter(
      (player) => Number(player.projectedPoints) >= comparableFloor
    );
    const nearPeers = remainingAtPosition.filter((player) => {
      const points = Number(player.projectedPoints);
      return points >= nearFloor && points <= nearCeiling;
    });
    const superior = remainingAtPosition.filter(
      (player) => Number(player.projectedPoints) > projectedPoints2 * 1.02
    );
    return {
      position,
      projectedPoints: projectedPoints2,
      remainingAtPosition: remainingAtPosition.length,
      comparableCount: comparable.length,
      nearPeerCount: nearPeers.length,
      superiorCount: superior.length
    };
  }
  function marketPressureFactor({ demand, supply } = {}) {
    const effectiveDemand = Math.max(0, Number(demand?.effectiveDemand) || 0);
    if (supply && Number.isFinite(Number(supply.comparableCount))) {
      const comparableSupply = Math.max(1, Number(supply.comparableCount));
      const competitionScore = effectiveDemand / (effectiveDemand + comparableSupply * 0.75);
      return Number(Math.min(1.02, Math.max(0.72, 0.72 + 0.34 * competitionScore)).toFixed(3));
    }
    if (effectiveDemand >= 8) return 1;
    if (effectiveDemand >= 5) return 0.96;
    if (effectiveDemand >= 3) return 0.9;
    if (effectiveDemand >= 1.5) return 0.82;
    if (effectiveDemand > 0) return 0.76;
    return 0.72;
  }
  function buildMarketContext({
    nomination,
    sales = [],
    playerPool = [],
    config = AUCTION_LEAGUE_CONFIG
  } = {}) {
    const demand = buildOpponentDemand({
      position: nomination?.position,
      marketValue: nomination?.marketValue,
      sales,
      config
    });
    const supply = buildRemainingSupply({ nomination, playerPool, sales, config });
    const pressureFactor = marketPressureFactor({ demand, supply });
    return { demand, supply, pressureFactor };
  }

  // src/auction/bidRecommendation.js
  function positionCounts2(players = []) {
    return players.reduce((counts, player) => {
      const position = player?.position;
      if (!position) return counts;
      counts[position] = (counts[position] ?? 0) + 1;
      return counts;
    }, {});
  }
  function baseStarterRequirements(config) {
    return {
      QB: config.roster.QB ?? 0,
      RB: config.roster.RB ?? 0,
      WR: config.roster.WR ?? 0,
      TE: config.roster.TE ?? 0,
      DP: config.roster.DP ?? 0,
      DST: config.roster.DST ?? 0,
      K: config.roster.K ?? 0
    };
  }
  function flexFilled2(counts, config) {
    const requirements = baseStarterRequirements(config);
    const flexPositions = config.auctionStrategy?.flexPositions ?? ["RB", "WR", "TE"];
    const surplus = flexPositions.reduce(
      (total, position) => total + Math.max(0, (counts[position] ?? 0) - (requirements[position] ?? 0)),
      0
    );
    return surplus >= (config.roster.FLEX ?? 0);
  }
  function candidateRole(position, players, config) {
    const counts = positionCounts2(players);
    const requirements = baseStarterRequirements(config);
    if ((counts[position] ?? 0) < (requirements[position] ?? 0)) return "STARTER";
    const flexPositions = config.auctionStrategy?.flexPositions ?? ["RB", "WR", "TE"];
    if (flexPositions.includes(position) && !flexFilled2(counts, config)) return "FLEX";
    return "BENCH";
  }
  function reserveTargetForMissingStarters(counts, config) {
    const requirements = baseStarterRequirements(config);
    const reserveConfig = config.auctionStrategy?.starterReserve ?? {};
    let premiumReserve = 0;
    for (const [position, required] of Object.entries(requirements)) {
      const have = counts[position] ?? 0;
      const missing = Math.max(0, required - have);
      if (!missing) continue;
      const targets = reserveConfig[position] ?? [];
      for (let index = 0; index < missing; index += 1) {
        const targetIndex = have + index;
        const fallback = targets.length ? targets[targets.length - 1] : config.minimumBid;
        const target = Number(targets[targetIndex] ?? fallback ?? config.minimumBid);
        premiumReserve += Math.max(0, target - config.minimumBid);
      }
    }
    if ((config.roster.FLEX ?? 0) > 0 && !flexFilled2(counts, config)) {
      premiumReserve += Math.max(0, Number(config.auctionStrategy?.flexReserve ?? config.minimumBid) - config.minimumBid);
    }
    return premiumReserve;
  }
  function clearingBuffer(value, config) {
    const strategy = config.auctionStrategy?.market ?? {};
    const pct = Number(strategy.clearingBufferPct ?? 0.05);
    const minBuffer = Number(strategy.minimumClearingBuffer ?? 2);
    const maxBuffer = Number(strategy.maximumClearingBuffer ?? 5);
    return Math.max(minBuffer, Math.min(maxBuffer, Math.ceil(value * pct)));
  }
  function buildMyBudgetState({
    purchases = [],
    config = AUCTION_LEAGUE_CONFIG
  } = {}) {
    const keepers = config.myKeepers ?? [];
    const keeperSpend = keepers.reduce((sum, keeper) => sum + Number(keeper.price || 0), 0);
    const purchaseSpend = purchases.reduce((sum, purchase) => sum + Number(purchase.price || 0), 0);
    const playersRostered = keepers.length + purchases.length;
    const remainingBudget = Math.max(0, config.salaryCap - keeperSpend - purchaseSpend);
    const rosterSize = getActiveRosterSize(config);
    const spotsLeft = Math.max(0, rosterSize - playersRostered);
    const minimumFillReserve = Math.max(0, spotsLeft - 1) * config.minimumBid;
    const maximumLegalBid = getMaximumBid({ remainingBudget, playersRostered, config });
    return {
      keeperSpend,
      purchaseSpend,
      totalSpent: keeperSpend + purchaseSpend,
      remainingBudget,
      playersRostered,
      rosterSize,
      spotsLeft,
      minimumFillReserve,
      maximumLegalBid,
      roster: [...keepers, ...purchases]
    };
  }
  function recommendBid({
    nomination,
    purchases = [],
    sales = [],
    playerPool = [],
    config = AUCTION_LEAGUE_CONFIG
  } = {}) {
    if (!nomination?.playerName) return null;
    const budget = buildMyBudgetState({ purchases, config });
    const currentRoster = budget.roster;
    const position = nomination.position ?? null;
    const currentCounts = positionCounts2(currentRoster);
    const positionLimit = position ? config.positionLimits?.[position] : null;
    const atPositionLimit = Number.isFinite(positionLimit) && (currentCounts[position] ?? 0) >= positionLimit;
    const marketValue = Number(nomination.marketValue);
    const hasMarketValue = Number.isFinite(marketValue) && marketValue >= config.minimumBid;
    const currentBid = Number(nomination.currentBid);
    const hasCurrentBid = Number.isFinite(currentBid) && currentBid >= 0;
    const role = atPositionLimit ? "FULL" : candidateRole(position, currentRoster, config);
    const hypotheticalRoster = atPositionLimit ? currentRoster : [...currentRoster, { playerName: nomination.playerName, position }];
    const countsAfterWin = positionCounts2(hypotheticalRoster);
    const spotsAfterWin = Math.max(0, budget.spotsLeft - (atPositionLimit ? 0 : 1));
    const baseReserveAfterWin = spotsAfterWin * config.minimumBid;
    const starterPremiumReserveAfterWin = reserveTargetForMissingStarters(countsAfterWin, config);
    const strategicReserveAfterWin = baseReserveAfterWin + starterPremiumReserveAfterWin;
    const strategicMaximumBid = atPositionLimit ? 0 : Math.max(0, budget.remainingBudget - strategicReserveAfterWin);
    const roleMultiplier = Number(config.auctionStrategy?.roleValueMultiplier?.[role] ?? 1);
    const roleAdjustedMarketValue = hasMarketValue ? Math.floor(marketValue * Math.max(0, roleMultiplier)) : null;
    const cheatSheetContext = buildCheatSheetContext({
      playerName: nomination.playerName,
      position,
      roster: currentRoster,
      remainingBudget: budget.remainingBudget
    });
    const preferenceMultiplier = Number(cheatSheetContext?.preferenceMultiplier ?? 1);
    const cheatSheetMaximumBid = Number(cheatSheetContext?.maximumCheatSheetBid);
    const hasCheatSheetMaximum = Number.isFinite(cheatSheetMaximumBid) && cheatSheetMaximumBid >= config.minimumBid;
    const intrinsicPreferredValue = hasMarketValue ? Math.max(config.minimumBid, Math.floor(roleAdjustedMarketValue * preferenceMultiplier)) : null;
    const marketContext = buildMarketContext({ nomination, sales, playerPool, config });
    const pressureFactor = Number(marketContext?.pressureFactor ?? 1);
    const expectedClearingValue = hasMarketValue ? Math.max(config.minimumBid, Math.floor(intrinsicPreferredValue * pressureFactor)) : null;
    const marketAwareValue = hasMarketValue ? Math.min(
      intrinsicPreferredValue,
      expectedClearingValue + clearingBuffer(expectedClearingValue, config)
    ) : strategicMaximumBid;
    const buyAtOrBelow = atPositionLimit ? 0 : Math.max(
      config.minimumBid,
      Math.min(
        budget.maximumLegalBid,
        strategicMaximumBid,
        marketAwareValue,
        hasCheatSheetMaximum ? cheatSheetMaximumBid : Number.POSITIVE_INFINITY
      )
    );
    const action = atPositionLimit ? "PASS" : hasCurrentBid ? currentBid <= buyAtOrBelow ? "BUY" : "PASS" : "WATCH";
    return {
      playerName: nomination.playerName,
      position,
      currentBid: hasCurrentBid ? currentBid : null,
      marketValue: hasMarketValue ? marketValue : null,
      marketValueSource: nomination.marketValueSource ?? (hasMarketValue ? "espn-practice" : null),
      projectedPoints: Number.isFinite(Number(nomination.projectedPoints)) ? Number(nomination.projectedPoints) : null,
      role,
      positionHave: position ? currentCounts[position] ?? 0 : null,
      positionLimit: Number.isFinite(positionLimit) ? positionLimit : null,
      roleAdjustedMarketValue,
      cheatSheetTier: cheatSheetContext?.tier ?? "UNRATED",
      cheatSheetTargetRole: cheatSheetContext?.targetRole ?? null,
      cheatSheetPreferenceMultiplier: preferenceMultiplier,
      cheatSheetMaximumBid: hasCheatSheetMaximum ? cheatSheetMaximumBid : null,
      cheatSheetReason: cheatSheetContext?.reason ?? null,
      cheatSheetState: cheatSheetContext?.state ?? null,
      intrinsicPreferredValue,
      expectedClearingValue,
      marketPressureFactor: pressureFactor,
      marketAwareValue,
      opponentDemand: marketContext?.demand ?? null,
      remainingSupply: marketContext?.supply ?? null,
      buyAtOrBelow,
      action,
      remainingBudget: budget.remainingBudget,
      maximumLegalBid: budget.maximumLegalBid,
      strategicMaximumBid,
      strategicReserveAfterWin,
      minimumFillReserve: budget.minimumFillReserve,
      spotsLeft: budget.spotsLeft
    };
  }

  // src/auction/index.js
  var HELPER_VERSION = "0.5.0-cheat-sheet-auction";
  function createTeamState(teamName, config = AUCTION_LEAGUE_CONFIG) {
    return {
      teamName,
      spent: 0,
      remainingBudget: config.salaryCap,
      playersRostered: 0,
      maxBid: config.salaryCap - (getActiveRosterSize(config) - 1) * config.minimumBid,
      discretionaryBudget: config.salaryCap - getActiveRosterSize(config) * config.minimumBid,
      roster: []
    };
  }
  function buildAuctionState(sales = [], config = AUCTION_LEAGUE_CONFIG) {
    const teams = /* @__PURE__ */ new Map();
    for (const sale of sales) {
      if (!sale?.fantasyTeam || !Number.isFinite(Number(sale.price))) continue;
      const team = teams.get(sale.fantasyTeam) ?? createTeamState(sale.fantasyTeam, config);
      team.spent += Number(sale.price);
      team.remainingBudget = Math.max(0, config.salaryCap - team.spent);
      team.playersRostered += 1;
      team.roster.push({
        playerId: sale.playerId ?? null,
        playerName: sale.playerName,
        position: sale.position,
        price: Number(sale.price)
      });
      team.maxBid = getMaximumBid({
        remainingBudget: team.remainingBudget,
        playersRostered: team.playersRostered,
        config
      });
      team.discretionaryBudget = getDiscretionaryBudget({
        remainingBudget: team.remainingBudget,
        playersRostered: team.playersRostered,
        config
      });
      teams.set(sale.fantasyTeam, team);
    }
    return [...teams.values()].sort((a, b) => b.remainingBudget - a.remainingBudget);
  }
  function myPurchases(sales, config) {
    return sales.filter((sale) => sale?.fantasyTeam === config.myTeamName);
  }
  function printRecommendation(recommendation) {
    if (!recommendation) return;
    const label = recommendation.action === "BUY" ? "\u2705 BUY" : recommendation.action === "PASS" ? "\u26D4 PASS" : "\u{1F440} WATCH";
    console.group(`${label}: ${recommendation.playerName} \u2014 ${recommendation.position ?? "?"} / ${recommendation.role}`);
    console.table([{
      player: recommendation.playerName,
      position: recommendation.position,
      rosterRole: recommendation.role,
      cheatTier: recommendation.cheatSheetTier,
      targetRole: recommendation.cheatSheetTargetRole,
      preference: recommendation.cheatSheetPreferenceMultiplier,
      cheatCap: recommendation.cheatSheetMaximumBid,
      bidWhenNominated: recommendation.currentBid,
      espnValue: recommendation.marketValue,
      roleAdjustedValue: recommendation.roleAdjustedMarketValue,
      preferredValue: recommendation.intrinsicPreferredValue,
      expectedClearing: recommendation.expectedClearingValue,
      marketPressure: recommendation.marketPressureFactor,
      buyAtOrBelow: recommendation.buyAtOrBelow,
      strategicMax: recommendation.strategicMaximumBid,
      remainingBudget: recommendation.remainingBudget,
      reserveAfterWin: recommendation.strategicReserveAfterWin,
      maxLegalBid: recommendation.maximumLegalBid,
      capableOpponents: recommendation.opponentDemand?.capableBidderCount ?? null,
      effectiveDemand: recommendation.opponentDemand?.effectiveDemand ?? null,
      comparableLeft: recommendation.remainingSupply?.comparableCount ?? null,
      nearPeersLeft: recommendation.remainingSupply?.nearPeerCount ?? null
    }]);
    const roleText = recommendation.role === "STARTER" ? "fills an open starter" : recommendation.role === "FLEX" ? "would fill FLEX" : recommendation.role === "BENCH" ? "would be depth/bench" : "position is already full";
    const marketText = recommendation.remainingSupply ? `${recommendation.opponentDemand?.capableBidderCount ?? 0} capable opponents and ${recommendation.remainingSupply.comparableCount} comparable ${recommendation.position}s remain` : `${recommendation.opponentDemand?.capableBidderCount ?? 0} capable opponents; player-pool supply unavailable`;
    console.log(
      `${recommendation.playerName}: recommended ceiling is $${recommendation.buyAtOrBelow} \u2014 ${roleText}; ${recommendation.cheatSheetTier} target. ${marketText}. $${recommendation.strategicReserveAfterWin} remains protected after a win. This ceiling is fixed for the nomination and will not move with live bids.`
    );
    if (recommendation.cheatSheetReason) console.log(`Cheat sheet: ${recommendation.cheatSheetReason}`);
    console.groupEnd();
  }
  function printState(sales, config = AUCTION_LEAGUE_CONFIG) {
    const teams = buildAuctionState(sales, config);
    const budget = buildMyBudgetState({ purchases: myPurchases(sales, config), config });
    console.group(`Fantasy Auction Helper ${HELPER_VERSION}`);
    console.log(`${sales.length} completed salary-cap sales detected.`);
    console.log(
      `${config.myTeamName}: $${budget.remainingBudget} remaining, ${budget.spotsLeft} roster spots left, max legal bid $${budget.maximumLegalBid}.`
    );
    if (sales.length) {
      console.log("Recent sales");
      console.table(
        sales.slice(-10).map((sale) => ({
          sale: sale.saleNumber,
          player: sale.playerName,
          position: sale.position,
          price: sale.price,
          team: sale.fantasyTeam
        }))
      );
    }
    if (teams.length) {
      console.log("Observed team budgets");
      console.table(
        teams.map((team) => ({
          team: team.teamName,
          rostered: team.playersRostered,
          spent: team.spent,
          remaining: team.remainingBudget,
          maxBid: team.maxBid,
          discretionary: team.discretionaryBudget
        }))
      );
    }
    console.groupEnd();
    return { sales: [...sales], teams, myBudget: budget };
  }
  function downloadJson(filename, value) {
    const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1e3);
  }
  function startAuctionPracticeHelper({ config = AUCTION_LEAGUE_CONFIG } = {}) {
    let latest = { sales: [], teams: [], myBudget: buildMyBudgetState({ config }) };
    let latestNomination = null;
    let latestRecommendation = null;
    let playerPool = [];
    let playerPoolStatus = "loading";
    const sessionLog = [];
    function logEvent(type, payload) {
      sessionLog.push({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        type,
        payload
      });
    }
    function createRecommendation(nomination, sales) {
      if (!nomination) return null;
      latestNomination = nomination;
      latestRecommendation = recommendBid({
        nomination,
        purchases: myPurchases(sales, config),
        sales,
        playerPool,
        config
      });
      logEvent("recommendation", latestRecommendation);
      printRecommendation(latestRecommendation);
      return latestRecommendation;
    }
    const watcher = createEspnAuctionWatcher({
      onSale: (sale, sales) => {
        latest = printState(sales, config);
        logEvent("sale", sale);
      }
    });
    const nominationWatcher = createNominationWatcher({
      onNomination: (nomination) => {
        logEvent("nomination", nomination);
        createRecommendation(nomination, watcher.getSales());
      }
    });
    const initialSales = watcher.start();
    latest = printState(initialSales, config);
    nominationWatcher.start();
    fetchEspnPlayerPool({ leagueId: config.leagueId, season: config.season }).then((pool) => {
      playerPool = pool;
      playerPoolStatus = "loaded";
      logEvent("player-pool-loaded", { count: pool.length });
      console.log(`Auction player pool loaded: ${pool.length} players available for supply analysis.`);
    }).catch((error) => {
      playerPoolStatus = "error";
      logEvent("player-pool-error", { message: String(error?.message ?? error) });
      console.warn("Auction player pool could not be loaded; recommendations will use opponent demand without supply.", error);
    });
    logEvent("session-start", {
      version: HELPER_VERSION,
      config,
      cheatSheetVersion: AUCTION_CHEAT_SHEET.version,
      myBudget: latest.myBudget
    });
    const session = {
      version: HELPER_VERSION,
      config,
      cheatSheet: AUCTION_CHEAT_SHEET,
      watcher,
      nominationWatcher,
      getState: () => latest,
      getNomination: () => latestNomination,
      getRecommendation: () => latestRecommendation,
      getLogs: () => [...sessionLog],
      getPlayerPoolStatus: () => ({ status: playerPoolStatus, count: playerPool.length }),
      printState: () => printState(watcher.getSales(), config),
      exportLogs: () => {
        const snapshot = {
          exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
          version: HELPER_VERSION,
          config,
          cheatSheet: AUCTION_CHEAT_SHEET,
          sales: watcher.getSales(),
          state: printState(watcher.getSales(), config),
          playerPoolStatus: { status: playerPoolStatus, count: playerPool.length },
          nomination: latestNomination,
          recommendation: latestRecommendation,
          events: [...sessionLog]
        };
        const stamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
        downloadJson(`fantasy-auction-${stamp}.json`, snapshot);
        return snapshot;
      },
      stop: () => {
        watcher.stop();
        nominationWatcher.stop();
        logEvent("session-stop", {});
      }
    };
    if (typeof window !== "undefined") window.FantasyAuctionSession = session;
    return session;
  }
  if (typeof window !== "undefined") {
    window.FantasyAuctionHelper = {
      version: HELPER_VERSION,
      config: AUCTION_LEAGUE_CONFIG,
      cheatSheet: AUCTION_CHEAT_SHEET,
      buildAuctionState,
      buildMyBudgetState,
      recommendBid,
      start: startAuctionPracticeHelper
    };
    console.log(
      `Fantasy Auction Helper ${HELPER_VERSION} loaded. Run FantasyAuctionHelper.start() in the console to begin.`
    );
  }
  return __toCommonJS(index_exports);
})();
