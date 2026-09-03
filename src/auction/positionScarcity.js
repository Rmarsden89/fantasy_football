function normalizeName(value = '') {
  return String(value).trim().toLowerCase();
}

function rosterCounts(roster = []) {
  return roster.reduce((counts, player) => {
    const position = player?.position;
    if (!position) return counts;
    counts[position] = (counts[position] ?? 0) + 1;
    return counts;
  }, {});
}

function flexOpen(counts, config) {
  const flexPositions = config?.auctionStrategy?.flexPositions ?? ['RB', 'WR', 'TE'];
  const base = {
    RB: config?.roster?.RB ?? 0,
    WR: config?.roster?.WR ?? 0,
    TE: config?.roster?.TE ?? 0,
  };
  const surplus = flexPositions.reduce(
    (sum, position) => sum + Math.max(0, (counts[position] ?? 0) - (base[position] ?? 0)),
    0,
  );
  return surplus < (config?.roster?.FLEX ?? 0);
}

function remainingAtPosition({ position, playerPool, sales, roster }) {
  const unavailable = new Set(
    [...(sales ?? []), ...(roster ?? [])]
      .map((player) => normalizeName(player?.playerName ?? player?.name))
      .filter(Boolean),
  );

  return (playerPool ?? []).filter((player) => {
    if (player?.position !== position) return false;
    if (!player?.name || unavailable.has(normalizeName(player.name))) return false;
    if (Number(player?.raw?.onTeamId) > 0) return false;
    return true;
  });
}

function supplySummary({ position, playerPool, sales, roster, config }) {
  const settings = config?.auctionStrategy?.positionScarcity ?? {};
  const usableFloor = Number(settings.usableMarketValue ?? 12);
  const strongFloor = Number(settings.strongMarketValue ?? 20);
  const remaining = remainingAtPosition({ position, playerPool, sales, roster });
  const values = remaining
    .map((player) => Number(player?.auctionValueAverage))
    .filter((value) => Number.isFinite(value) && value >= 0)
    .sort((a, b) => b - a);

  return {
    position,
    totalRemaining: remaining.length,
    usableRemaining: values.filter((value) => value >= usableFloor).length,
    strongRemaining: values.filter((value) => value >= strongFloor).length,
    usableFloor,
    strongFloor,
    topRemainingValues: values.slice(0, 8),
  };
}

function urgencyForSupply(summary) {
  if (!summary) return 'NONE';
  if (summary.usableRemaining <= 3 || summary.strongRemaining <= 1) return 'HIGH';
  if (summary.usableRemaining <= 6 || summary.strongRemaining <= 3) return 'MEDIUM';
  if (summary.usableRemaining <= 10 || summary.strongRemaining <= 5) return 'NORMAL';
  return 'LOW';
}

function preferenceFloor({ position, counts, flexIsOpen, supply, otherSupply, config }) {
  const wrStartersOpen = Math.max(0, (config?.roster?.WR ?? 0) - (counts.WR ?? 0));
  const rb2Open = flexIsOpen && (counts.RB ?? 0) === (config?.roster?.RB ?? 0);
  const urgency = urgencyForSupply(supply);

  if (position === 'WR') {
    if (wrStartersOpen > 0) {
      if (urgency === 'HIGH') return 1;
      if (urgency === 'MEDIUM') return 0.98;
      return 0.95;
    }
    if (flexIsOpen) {
      if (urgency === 'HIGH') return 0.97;
      if (urgency === 'MEDIUM') return 0.93;
      return 0.88;
    }
    return 0;
  }

  if (position === 'RB' && rb2Open) {
    let floor = urgency === 'HIGH' ? 1 : urgency === 'MEDIUM' ? 0.97 : 0.93;
    // With WR1/WR2 filled, a usable RB2 is our preferred default FLEX because
    // weekly workload is generally more stable. This is only a small nudge;
    // a thin WR board can still outrank RB through its own scarcity signal.
    if (wrStartersOpen === 0) floor = Math.min(1, floor + 0.03);

    if (
      otherSupply
      && supply.usableRemaining <= otherSupply.usableRemaining / 2
      && supply.usableRemaining <= 8
    ) {
      floor = Math.min(1, floor + 0.03);
    }
    return floor;
  }

  return 0;
}

export function buildPositionScarcitySignal({
  position,
  roster = [],
  sales = [],
  playerPool = [],
  config,
} = {}) {
  if (!['RB', 'WR'].includes(position) || !playerPool.length) {
    return {
      active: false,
      urgency: 'NONE',
      preferenceFloor: 0,
      reason: null,
      supply: null,
      comparisonSupply: null,
    };
  }

  const counts = rosterCounts(roster);
  const flexIsOpen = flexOpen(counts, config);
  const supply = supplySummary({ position, playerPool, sales, roster, config });
  const comparisonPosition = position === 'RB' ? 'WR' : 'RB';
  const comparisonSupply = supplySummary({
    position: comparisonPosition,
    playerPool,
    sales,
    roster,
    config,
  });
  const urgency = urgencyForSupply(supply);
  const floor = preferenceFloor({
    position,
    counts,
    flexIsOpen,
    supply,
    otherSupply: comparisonSupply,
    config,
  });

  const wrStartersOpen = Math.max(0, (config?.roster?.WR ?? 0) - (counts.WR ?? 0));
  const rb2Open = flexIsOpen && (counts.RB ?? 0) === (config?.roster?.RB ?? 0);
  const active = position === 'WR' ? (wrStartersOpen > 0 || flexIsOpen) : rb2Open;

  return {
    active,
    urgency: active ? urgency : 'LOW',
    preferenceFloor: active ? Number(floor.toFixed(3)) : 0,
    flexOpen: flexIsOpen,
    wrStartersOpen,
    rb2Open,
    supply,
    comparisonSupply,
    reason: active
      ? `${position} ${urgency.toLowerCase()} live scarcity: ${supply.strongRemaining} strong / ${supply.usableRemaining} usable remain; ${comparisonPosition} has ${comparisonSupply.strongRemaining} strong / ${comparisonSupply.usableRemaining} usable`
      : null,
  };
}
