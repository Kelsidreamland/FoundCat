# FOUND CAT Paper Sticker Motion System

## Goal

Unify motion across FOUND CAT's three highest-frequency interaction surfaces so the app feels like paper cards and stickers handled by hand. Motion should make gestures and state changes easier to understand without adding visual noise, slowing repeated use, or changing product behavior.

## Approved Direction

Use **A: paper sticker tactility**.

- Quick, restrained, and slightly handmade.
- Hard ink and blue offset shadows provide the tactile cue.
- No elastic bounce, decorative loops, parallax, or scroll-driven effects.
- Cat photos remain visually dominant; motion must not compete with them.
- Existing Moodboard V1 logo art, colors, typography, layout, routes, and data behavior remain unchanged.

## Scope

This slice covers:

1. Home world-cat swipe deck.
2. Cat profile/detail sheets opened from Home, collection success, and Map.
3. The three-action bottom navigation.

This slice does not cover:

- create/upload flow animation;
- map marker clustering or map camera animation;
- sharing, authentication, backup, or cloud behavior;
- card information architecture or visible copy;
- logo, icon artwork, colors, or page layout;
- new onboarding or persistent motion hints.

## Motion Tokens

Add a small shared motion module for values used by at least two surfaces. Keep component-specific gesture thresholds beside the component that owns them.

| Token | Value | Use |
| --- | --- | --- |
| `instant` | 120ms | pressed-state recovery and small opacity changes |
| `quick` | 180ms | backdrop fade, active navigation response |
| `standard` | 240ms | card settle and sheet entrance/exit |
| `easeOut` | `[0.22, 1, 0.36, 1]` | non-spring entrances and exits |
| `paperSpring` | stiffness 420, damping 34, mass 0.72 | short card/sheet settling without visible bounce |

Rules:

- Keep visual motion between 120ms and 260ms.
- Animate only transform, opacity, and the existing shadow treatment.
- Never animate layout dimensions, scroll position, large blur values, or cat photos continuously.
- No more than two motion layers should start together on one surface.

## Home Swipe Deck

Preserve the existing swipe contract exactly:

- left swipe collects and advances;
- right swipe advances;
- tap opens the profile sheet;
- keyboard arrows and current drag thresholds remain available;
- collection and duplicate guards remain unchanged.

Refinement:

- The active card keeps a small resting paper rotation.
- While dragging, the card lifts by at most 1.5%, its rotation follows direction within a restrained range, and the hard shadow shifts toward the brand blue treatment.
- A committed swipe exits in 220-240ms and does not bounce back into view.
- The next stacked card settles into place with one short paper spring.
- Collection feedback enters and exits as one compact sticker stamp. It must not create a second modal or delay the next card.
- The existing one-time swipe hint behavior and wording stay unchanged.

The swipe index, card order, save callback timing, and profile-opening behavior must not depend on animation completion beyond the existing guarded timer.

## Cat Profile And Detail Sheets

Apply one consistent sheet rhythm to:

- `WorldCatProfileSheet`;
- `CollectedCatProfileSheet`;
- the selected-cat detail sheet on Map.

Normal motion:

1. Backdrop fades to its existing opacity in 180ms.
2. Sheet enters from 20-28px below with a tiny paper rotation and scale between 0.98 and 1.
3. Sheet settles once using `paperSpring`; there is no overshoot.
4. Exit reverses with a 16-20px downward movement and a short opacity fade.

Only the sheet shell and, where already present, one inner content group may animate. Individual chips, text rows, buttons, and photos must not cascade independently.

Existing max heights, safe-area padding, internal scrolling, sticky actions, focus behavior, and close/save/navigation callbacks remain unchanged.

## Bottom Navigation

Keep the current three destinations and icon artwork:

- My Cat Cards;
- Capture;
- Cat Map.

Refinement:

- Every action gives immediate press feedback even if the destination is already current.
- Side actions move down at most 2px and scale to no less than 0.96 while pressed.
- The center capture action keeps its elevated position and moves down no more than 2px relative to that resting position.
- Active state settles in 180ms using the existing paper fill and blue/ink shadow language.
- Do not add visible labels, notification dots, bounce, or a moving pill behind all three icons.
- Links, accessible names, routes, and `aria-current` semantics remain unchanged.

## Reduced Motion

Use Framer Motion's reduced-motion preference at the affected surfaces.

When `prefers-reduced-motion: reduce` is active:

- keep swipe gestures and their outcomes functional;
- remove decorative rotation, scale, and spring settling;
- use opacity or an immediate state change for sheet and feedback transitions;
- keep press feedback to a color/shadow state without translation;
- do not delay navigation, collection, closing, or map actions.

The reduced-motion branch is a first-class behavior and must have automated coverage.

## Architecture

- Keep Framer Motion, which is already installed and used by these components.
- Add one focused shared motion-token module; do not create a generic animation framework.
- Components continue to own gesture state and business callbacks.
- Add stable `data-motion-*` attributes only where they provide useful regression contracts.
- Avoid changing component props unless a reduced-motion or testing boundary genuinely requires it.

## Testing

Use test-first implementation.

Required regression coverage:

- Home card exposes settled/leaving states and retains left-collect/right-next behavior.
- Reduced motion preserves swipe outcomes without decorative transform presets.
- World, collected, and Map sheets expose the shared paper-sheet preset and retain their existing actions.
- Bottom navigation keeps the three routes and `aria-current`, with stable press-motion roles.
- No new persistent hint or visible navigation label is rendered.

## Responsive And Performance Acceptance

- Validate Home, Home profile sheet, and Map detail sheet at 390 x 844.
- No horizontal overflow, clipped close button, or bottom-navigation overlap.
- A card drag must not trigger React state updates on every pointer frame; use Motion values for continuous gesture visuals.
- No new image, font, network request, or production dependency.
- No infinite animation or active timer after a surface unmounts.

## Completion Criteria

- The three surfaces share one recognizably consistent paper/sticker rhythm.
- Repeated swiping still feels fast and direct.
- Cat photos stay larger and more visually prominent than motion or text.
- All existing behavior tests pass.
- Focused motion tests, full tests, TypeScript, production build, cloud readiness, and mobile browser smoke checks pass.
