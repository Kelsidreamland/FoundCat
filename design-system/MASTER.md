# 轉角遇到貓 Design System

## Status

This is the source of truth for the v0.1 visual redesign.

The approved direction is **E1: layered photo sticker**:

- D1 quiet editorial mood.
- D2 blue border shadow as the memorable brand accent.
- A1 postcard/header identity.
- B2 latest cat photo as the primary visual.
- B3 clipped cutout sticker row.
- B4 quiet corner/map clue.

Do not redesign pages from scratch without checking this file first.

## Product Personality

`轉角遇到貓` is a mobile-first cat encounter archive. The emotional center is not the map or the tool surface. The emotional center is the cat someone just met.

The app should feel like:

- a street-corner postcard;
- a small field journal;
- an artful sticker archive;
- quiet, warm, and memorable;
- playful through materials and composition, not through childish copy.

Avoid:

- generic upload forms;
- dashboard-heavy layouts;
- map-first framing;
- marketing landing-page hero sections;
- emoji icons;
- soft beige-only palettes;
- decorative gradient blobs or generic AI-looking glass cards.

## Visual Concept

### Layered Photo Sticker

The primary visual pattern uses the same uploaded cat photo in two layers:

1. **Base photo layer**
   - Original image remains in the frame.
   - Apply the app photo treatment: warm street-light filter, slightly muted saturation, soft contrast.
   - The photo stays rectangular inside a white/off-white frame.

2. **Cutout sticker layer**
   - AI cutout extracts the cat from the same image.
   - The cutout is slightly enlarged and placed back near the original cat position.
   - It uses an irregular white clipping border and subtle ink outline.
   - It casts a blue offset shadow so the cat feels like it is lifting out of the photo.

The effect should feel like the cat is floating out of the frame, not like a loud 3D gimmick.

## Color System

Use a cream editorial base with strong ink and a controlled blue accent.

| Token | Hex / Value | Usage |
| --- | --- | --- |
| `corner.ink` | `#211915` | Main text, outlines, hard UI borders |
| `corner.paper` | `#FFFDF2` | Cards, sticker fill, framed surfaces |
| `corner.cream` | `#F5EFE4` | App background |
| `corner.photoWarm` | `#D9C6A8` | Photo filter warmth, map surfaces |
| `corner.blue` | `#2F5FB3` | Brand accent, shadows, postal mark, primary action |
| `corner.ringBlue` | `rgba(59,130,246,0.5)` | Focus ring, selected state, map pin halo |
| `corner.muted` | `#6A5F54` | Secondary text |
| `corner.line` | `rgba(33,25,21,0.2)` | Fine borders and quiet dividers |

Rules:

- Blue is the memorable accent, not the whole palette.
- Use blue for key identity moments: postal mark, primary capture action, focus ring, popout shadow, map pin.
- Do not make the UI predominantly beige. The black ink and blue shadow must be visible.
- Do not add purple, neon, or multi-gradient palettes without a new design review.

## Typography

Primary font stack:

```css
"Noto Sans TC", "M PLUS Rounded 1c", "PingFang TC", "Microsoft JhengHei", sans-serif
```

Usage:

- H1/Product: 24-30px on mobile, weight 900, tight line height.
- Section labels: 10-12px, weight 900, uppercase English allowed for artifact labels such as `FOUND CAT ENTRY`.
- Body: 13-15px, weight 600-800, line-height 1.45-1.7.
- Avoid negative letter spacing.
- Do not use viewport-based font scaling.

Tone:

- Chinese copy should be direct and warm.
- Prefer `拍下這隻貓`, `從相簿選貓照`, `最新遇見`, `街角線索`.
- Avoid vague single-character labels like `貼`, `記`.

## Shape And Material

Use print-inspired physical surfaces:

- Postcard frame: 2px ink border, 10-14px radius.
- Sticker: irregular rounded corners, white border, ink outline.
- Postal stamp: square or near-square with ink border and blue mark.
- Action nav: floating off-white container, icon-only actions, stable dimensions.

Standard dimensions:

- Page max phone working width: `max-w-sm`.
- Primary card radius: 10-14px.
- Icon button size: 44-52px.
- Main capture action in bottom nav: 64-72px, elevated but not text-heavy.

Shadows:

- Use hard offset shadows for brand surfaces.
- D2 blue shadow is approved as the signature shadow:

```css
box-shadow: 8px 8px 0 rgba(47, 95, 179, 0.82);
```

- Use softer shadows only for floating nav and modal depth.

## Layout Principles

- Mobile first. Validate at 375px and 390px before desktop.
- The first viewport should communicate: app name, latest cat, capture habit.
- Cat photo/sticker content gets hierarchy over map content.
- Map appears as a quiet location clue unless the user enters the map page.
- Avoid nested cards. A page can have framed modules, but do not put cards inside cards without a functional reason.
- Bottom nav must not cover important content; all scrollable pages need bottom padding.

## Iconography

- Use Lucide icons or repo-native SVG icons.
- No emoji as UI icons.
- Bottom nav remains icon-first:
  - Catdex/archive
  - Capture cat
  - Cat map
- Accessible labels are required even when text is hidden.

## Motion

Motion is restrained.

Use:

- 150-300ms transitions.
- `ease-out` for entry.
- Small press feedback on buttons.
- Loading indicators only when async work is active.

Avoid:

- Infinite decorative animation.
- Bouncy icons.
- Parallax or scroll-jacking.
- Animating more than 1-2 key elements per view.

Respect `prefers-reduced-motion`.

## Accessibility

Required:

- Semantic buttons and links.
- Visible focus states using `corner.ringBlue`.
- Form inputs have labels.
- Images have useful alt text unless decorative.
- Text contrast must pass WCAG AA.
- Color cannot be the only state indicator.
- Touch targets should be at least 44px.

## Page Contracts

Page-specific rules live in `design-system/pages/`.

Read order:

1. Read this `MASTER.md`.
2. Read the specific page file if it exists.
3. Page file overrides this master only for that page.

Initial pages:

- `pages/home.md`
- `pages/create.md`
- `pages/catdex.md`
- `pages/map.md`
- `pages/share.md`

## Implementation Guardrails

- Keep React components small enough to understand.
- Shared visual primitives should be extracted only after two pages need them.
- Do not port Daily Scrapbook screens wholesale.
- Keep `轉角遇到貓` as the official product name.
- Keep PWA short name `遇到貓`.
- Keep GitHub project separate from the original Daily Scrapbook project.

## Verification Checklist

Before shipping visual changes:

- `npm run test`
- `npm run check`
- `npm run build`
- Playwright smoke at 390x844 for changed pages.
- Confirm no old brand copy appears:
  - `貓遇`
  - `maoyu`
  - `Daily Scrapbook`
  - `Cat Scrapbook`
- Confirm no visible text overlap.
- Confirm bottom nav does not cover primary actions.
