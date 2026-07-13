# FOUND CAT Rounded POP Typography

## Decision

Use the approved B direction, Chill Round Gothic, as a restrained display face. The system should feel rounded and poster-like without reducing legibility.

## Type Roles

- `FoundCat Round`: cat names, profile section labels, encounter-clue labels, and Chinese poster titles.
- `FoundCat Number`: card numbers and short English artifact labels such as `WORLD CAT` and `FOUND CAT`.
- Existing system Traditional Chinese stack: body copy, forms, notes, addresses, and all long text.

## Scope

Apply the display roles consistently to:

- the Home swipe card;
- world and collected cat profile sheets;
- map cat details;
- My Cat Cards entries;
- single-cat share pages and generated poster canvases.

Do not change the approved Moodboard V1 logo art, card layout, color palette, or body font.

## Loading

- Self-host the complete Unicode-split WOFF2 set so user-written cat names do not mix typefaces.
- Keep `font-display: swap` so text is always visible.
- Let the browser fetch only the Unicode shards required by visible text; do not preload the full Chinese font.
- Canvas poster generation waits for the display and number fonts before drawing.
- If a font shard is unavailable offline, canvas posters fall back to the existing system Traditional Chinese stack instead of blocking sharing.

## Verification

- Typography contract tests cover local assets, semantic classes, and canvas font readiness.
- Run the full test, TypeScript, and build suites.
- Check Home and profile sheets at 390 x 844 with no text overlap or horizontal overflow.
