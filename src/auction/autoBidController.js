import { detectCurrentNomination, nominationIdentity } from './nominationWatcher.js';

function normalizeText(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

export function isNominationWinning(nomination) {
  return /\bWINNING\b/i.test(nomination?.rawText ?? '');
}

export function decideAutoBid({ nomination, recommendation } = {}) {
  if (!nomination?.playerName || !recommendation?.playerName) {
    return { shouldBid: false, reason: 'missing-nomination-or-recommendation', nextBid: null };
  }

  const nominationKey = nominationIdentity(nomination);
  const recommendationKey = nominationIdentity(recommendation);
  if (!nominationKey || nominationKey !== recommendationKey) {
    return { shouldBid: false, reason: 'recommendation-does-not-match-current-nominee', nextBid: null };
  }

  const currentBid = Number(nomination.currentBid);
  const ceiling = Number(recommendation.buyAtOrBelow);
  if (!Number.isFinite(currentBid) || !Number.isFinite(ceiling)) {
    return { shouldBid: false, reason: 'missing-current-bid-or-ceiling', nextBid: null };
  }

  if (recommendation.action === 'PASS' || ceiling < 1) {
    return { shouldBid: false, reason: 'recommendation-is-pass', nextBid: null };
  }

  if (isNominationWinning(nomination)) {
    return { shouldBid: false, reason: 'already-winning', nextBid: null };
  }

  const nextBid = currentBid + 1;
  if (nextBid > ceiling) {
    return { shouldBid: false, reason: 'ceiling-reached', nextBid };
  }

  return {
    shouldBid: true,
    reason: 'bid-to-fixed-ceiling',
    nextBid,
    currentBid,
    ceiling,
    nominationKey,
  };
}

function getBidRoot(root = document) {
  const card = root.querySelector?.('.player-selected');
  if (!card) return null;
  return card.querySelector?.('[class*="player-nominated-form-container"]')
    ?? card.closest?.('.pickArea')
    ?? card.parentElement
    ?? card;
}

export function findIncrementOfferButton(nextBid, root = document) {
  if (!Number.isFinite(Number(nextBid))) return null;
  const bidRoot = getBidRoot(root);
  if (!bidRoot) return null;

  const expected = `OFFER $${Number(nextBid)}`;
  const controls = [...bidRoot.querySelectorAll('button, [role="button"]')]
    .filter((element) => !element.disabled && element.getAttribute?.('aria-disabled') !== 'true')
    .filter((element) => normalizeText(element.innerText || element.textContent || '').toUpperCase() === expected);

  return controls.length === 1 ? controls[0] : null;
}

export function createAutoBidController({
  enabled = false,
  intervalMs = 300,
  getRecommendation = () => null,
  getCurrentNomination = detectCurrentNomination,
  findBidButton = findIncrementOfferButton,
  onBid = null,
  onStateChange = null,
} = {}) {
  let timer = null;
  let active = Boolean(enabled);
  let lastAttemptKey = null;
  let lastStateSignature = null;
  const history = [];

  let state = {
    enabled: active,
    status: active ? 'waiting' : 'disabled',
    playerName: null,
    currentBid: null,
    nextBid: null,
    ceiling: null,
    bidsSubmitted: 0,
    reason: active ? 'waiting-for-nomination' : 'auto-bid-disabled',
  };

  function publish(next) {
    state = { ...state, ...next, enabled: active };
    const signature = JSON.stringify([
      state.enabled,
      state.status,
      state.playerName,
      state.currentBid,
      state.nextBid,
      state.ceiling,
      state.reason,
      state.bidsSubmitted,
    ]);
    if (signature !== lastStateSignature) {
      lastStateSignature = signature;
      onStateChange?.({ ...state });
    }
  }

  function tick() {
    if (!active) return { ...state };

    const nomination = getCurrentNomination?.();
    const recommendation = getRecommendation?.();
    const decision = decideAutoBid({ nomination, recommendation });

    if (!decision.shouldBid) {
      lastAttemptKey = null;
      publish({
        status: decision.reason === 'already-winning' ? 'winning'
          : decision.reason === 'ceiling-reached' ? 'ceiling-reached'
            : 'waiting',
        playerName: nomination?.playerName ?? recommendation?.playerName ?? null,
        currentBid: Number.isFinite(Number(nomination?.currentBid)) ? Number(nomination.currentBid) : null,
        nextBid: decision.nextBid ?? null,
        ceiling: Number.isFinite(Number(recommendation?.buyAtOrBelow)) ? Number(recommendation.buyAtOrBelow) : null,
        reason: decision.reason,
      });
      return { ...state };
    }

    const attemptKey = `${decision.nominationKey}|${decision.nextBid}`;
    if (attemptKey === lastAttemptKey) {
      publish({
        status: 'awaiting-bid-update',
        playerName: nomination.playerName,
        currentBid: decision.currentBid,
        nextBid: decision.nextBid,
        ceiling: decision.ceiling,
        reason: 'bid-already-submitted-for-this-price',
      });
      return { ...state };
    }

    const button = findBidButton?.(decision.nextBid);
    if (!button) {
      publish({
        status: 'waiting-for-bid-control',
        playerName: nomination.playerName,
        currentBid: decision.currentBid,
        nextBid: decision.nextBid,
        ceiling: decision.ceiling,
        reason: 'exact-increment-offer-button-not-found',
      });
      return { ...state };
    }

    lastAttemptKey = attemptKey;
    button.click();
    const bidEvent = {
      timestamp: new Date().toISOString(),
      playerName: nomination.playerName,
      nflTeam: nomination.nflTeam ?? null,
      position: nomination.position ?? null,
      currentBid: decision.currentBid,
      submittedBid: decision.nextBid,
      ceiling: decision.ceiling,
      recommendationTier: recommendation.cheatSheetTier ?? null,
      recommendationRole: recommendation.role ?? null,
    };
    history.push(bidEvent);
    onBid?.(bidEvent);

    publish({
      status: 'bid-submitted',
      playerName: nomination.playerName,
      currentBid: decision.currentBid,
      nextBid: decision.nextBid,
      ceiling: decision.ceiling,
      bidsSubmitted: history.length,
      reason: 'bid-to-fixed-ceiling',
    });
    return { ...state };
  }

  function start() {
    stop();
    active = true;
    publish({ status: 'waiting', reason: 'waiting-for-nomination' });
    timer = setInterval(tick, intervalMs);
    return { ...state };
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
    if (active) {
      active = false;
      publish({ status: 'disabled', reason: 'auto-bid-disabled' });
    }
    return { ...state };
  }

  function enable() {
    return start();
  }

  return {
    start,
    stop,
    enable,
    tick,
    getState: () => ({ ...state }),
    getHistory: () => [...history],
  };
}
