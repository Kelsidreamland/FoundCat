# FOUND CAT UI Motion Polish Design

## Goal

Make the three most-used FOUND CAT surfaces feel smoother and more refined without changing data, login, map, sharing, numbering, or brand assets.

## Scope

This polish only touches:

- Home cat card deck: swipe and collection feedback.
- Map cat detail sheet: opening motion and lightweight content staging.
- My Cat Cards archive: tab switching between self-found cats and saved world cats.

Out of scope:

- Logo changes.
- Data schema changes.
- Map marker logic.
- Public/private visibility rules.
- Authentication, backup, or sharing flows.

## Design Direction

The motion should feel like a small paper card or sticker moving by hand:

- Quick and light, never slow.
- Slightly tactile, with spring motion and tiny lift/shadow changes.
- Cute but not noisy.
- Respectful of mobile viewport space.
- No persistent explanatory UI beyond existing first-use hints.

## Requirements

1. The home active card should expose a stable "settled / leaving" animation state for tests and use a more refined paper-card transition.
2. The collection feedback should look and behave like a compact sticker badge, not a heavy system toast.
3. The map selected-cat sheet should use a bottom-origin spring entrance and a readable staged content layer, while preserving current sheet sizing and scroll behavior.
4. Catdex tab switching should animate the active collection content without remounting navigation or changing tab semantics.
5. All existing behavior tests for swipe direction, collection, public map edit hiding, and tab accessibility must continue to pass.

## Verification

- `npm test -- src/components/catdex/CatCardDeck.test.tsx`
- `npm test -- src/pages/Map.test.tsx`
- `npm test -- src/pages/Catdex.test.tsx`
- `npm test`
- `npm run check`
- `npm run build`
- `npm run check:cloud`
