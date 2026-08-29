# Fantasy Football Draft Helper

Browser-based ESPN fantasy football draft assistant. The first milestone targets the 2026 snake draft for league `299923`, with live draft ingestion from the ESPN draft room and league-aware player recommendations.

## Current scope

- ESPN snake draft only
- 8 teams
- Draft slot 8 (picks 1.08 / 2.01, 3.08 / 4.01, etc.)
- Live completed-pick detection from the rendered ESPN draft DOM
- ESPN player-pool loading via `kona_player_info`
- Recommendation scoring based on:
  - base projected value
  - value over replacement
  - positional scarcity
  - current roster need
  - tier-drop urgency
  - risk a player will not survive to the next turn
- Two-player pair recommendations for turn picks

Auction-draft logic will be handled as a separate valuation layer after the snake-draft workflow is stable.

## Project structure

```text
src/
  config.js                  League and snake-draft configuration
  espnDraftWatcher.js        Proven DOM watcher for completed ESPN picks
  espnPlayerPool.js          ESPN player/projection loader
  recommendationEngine.js    Draft scoring and pair optimizer
  index.js                   Browser entry point

test/
  config.test.js
  recommendationEngine.test.js
```

## Setup

```bash
npm install
npm test
npm run build
```

The build creates:

```text
dist/draft-helper.js
```

## Browser test

1. Open an ESPN practice draft.
2. Open Chrome DevTools -> Console.
3. Paste the contents of `dist/draft-helper.js` into the console.
4. Start the helper:

```javascript
await startFantasyDraftHelper();
```

The helper will:

1. load the ESPN player pool,
2. scan already completed draft picks,
3. watch for new picks with `MutationObserver`,
4. remove drafted players from the available pool,
5. recalculate player scores and best two-player combinations after every selection.

Current state is available at:

```javascript
window.__fantasyDraftHelper.state
```

Stop the watcher with:

```javascript
window.__fantasyDraftHelper.stop();
```

## Verified ESPN draft DOM pattern

Completed picks are identified from elements containing `pick-message`. A card contains text similar to:

```text
Josh Allen / BUF QB
R1, P1 - Duncan Duckbeaters
```

The ESPN player ID is also available in the player headshot URL, for example:

```text
.../headshots/nfl/players/full/3918298.png
```

This lets the helper capture:

- overall pick
- round
- round pick
- ESPN player ID
- player name
- NFL team
- position
- drafting fantasy team

without relying on ESPN's undocumented live WebSocket protocol.

## Next development steps

1. Validate the `kona_player_info` projection/rank extraction against the live 2026 draft page.
2. Confirm all league scoring settings and convert raw projections to league-specific projected fantasy points where necessary.
3. Improve replacement-level calculations for the 2-QB format.
4. Model opponent roster needs for the 14-pick gap between turns.
5. Tune tier detection and turn-survival probabilities using practice drafts.
6. Add an unobtrusive recommendation panel instead of relying only on the DevTools console.
7. After snake drafting is stable, add auction-specific dollar values and nomination strategy.

## Safety / authentication

The draft watcher is read-only. Do not place ESPN access tokens, `espn_s2`, SWID/session cookies, or other authentication secrets in this repository.
