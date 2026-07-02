# World Cat Profile Sheet Polish Design

## Goal

Make the world cat profile sheet feel like a refined, light cat-dating profile while keeping the interface short, readable, and easy to act on.

## Approved Direction

- Use a photo-first layout: the cat image should be the dominant visual element.
- Keep the title compact: cat name, world number, and broad location near the photo.
- Add one short profile summary line:
  - With personality tags: show up to two translated tags.
  - Without profile details: show `這隻貓還很神秘。`
- Collapse details into a small set of clean blocks:
  - `偶遇線索`
  - `特徵`
  - `照護`
- Avoid empty boxes. Missing details should not reserve blank UI.
- Keep the fixed bottom actions as icon-first buttons:
  - GPS icon: `去找這隻喵`
  - Heart icon: `收藏` / `已收藏`

## Non-Goals

- Do not add AI-generated replies.
- Do not add new editable fields.
- Do not change save, map navigation, or public/private data behavior.
- Do not change the home card deck in this slice.

## Acceptance

- Filled profiles still show name, W-number, location, personality, feature note, spot note, and care labels.
- Sparse profiles show an intentional mystery state and no empty placeholder cards.
- The image frame is visibly larger than the previous 96px square.
- The bottom actions remain accessible by their names.
