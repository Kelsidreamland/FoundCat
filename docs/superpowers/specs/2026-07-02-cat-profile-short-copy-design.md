# Cat Profile Short Copy Design

## Goal

Refresh the cat profile detail experience so it feels like a light cat dating profile without requiring users to fill many fields.

The chosen direction is a B+C hybrid:

- Keep the personality and cat-speech charm from the dating-profile concept.
- Keep the low information density and direct navigation focus from the map-card concept.
- Make lazy/empty user input feel intentional, not broken or unfinished.

## Scope

Apply this design to the shared profile surfaces:

- World cat profile sheet from the home swipe deck.
- Collected cat profile sheet after saving a world cat.
- Map selected-cat card/profile area.
- My cat detail profile summary where the same component already appears.

Do not change the database schema in this slice. AI generation is planned as a later enhancement; this slice uses existing deterministic copy and existing optional fields.

## Information Rules

Required display fields:

- Cat image.
- Card number:
  - world cats keep `W-###`
  - user's own cats keep private card number
- Display name:
  - use `catName` if present
  - otherwise use `神秘貓咪` / `Mystery cat`
- Broad place:
  - city/place label if readable
  - never show raw coordinates, unreadable Google Maps short links, or full address noise

Optional fields:

- personality tags
- feature note
- spot clue
- care status

Optional fields must not create visible empty blocks. If none are present, show a compact mystery state instead.

## Copy Rules

Use short labels and short body copy.

Chinese labels:

- `感覺`
- `偶遇線索`
- `特徵`
- `目前知道`
- `下一步`

Default empty-state copy:

- Main speech: `這隻貓還很神秘。`
- Known fact: `牠曾經在這裡出現。`
- Next step: `去地圖看看牠在哪裡。`
- Missing field chip/text: `等你補充`

Do not use skeleton/loading-style lines for missing cat info.

## Cat Speech

For this slice, cat speech is generated locally from existing data:

- If personality tags exist, use the current deterministic speech helper.
- If no tags/details exist, use `這隻貓還很神秘。`

Future AI behavior should be additive:

- AI may suggest cat name, speech, personality tags, feature summary, and spot clue.
- Users may edit AI suggestions.
- None of these fields become required before publishing a cat.

## Action Buttons

Primary actions in profile sheets should be icon-first:

- GPS / map pin icon = `去找這隻喵`
- Heart icon = `收藏`

The visible UI can be icon-only when space is tight. Accessibility labels, titles, and optional tooltips must preserve the full action names.

Map and detail views may still show text when it helps clarity, but the profile sheet target is icon-only.

## Visual Direction

- Keep the current FOUND CAT paper-card language.
- Reduce decorative density compared with the rough mockup.
- The empty/lazy state should look like a complete "mystery cat" card:
  - one short speech bubble
  - one `目前知道` block
  - optional compact `感覺 / 線索` placeholders using `等你補充`
  - no grey loading bars or blank-looking fields

## Acceptance

- A cat with full details shows name, number, broad place, speech, personality chips, spot clue, feature note, and icon actions.
- A cat with only photo and location shows `神秘貓咪`, number, broad place, `這隻貓還很神秘。`, `牠曾經在這裡出現。`, and icon actions.
- No profile surface shows raw coordinates, unreadable map URLs, or full address noise as the primary place label.
- Empty optional fields do not render as empty cards or skeleton loading UI.
- `去找這隻喵` and `收藏` remain accessible by screen readers even if the visible buttons are icon-only.
