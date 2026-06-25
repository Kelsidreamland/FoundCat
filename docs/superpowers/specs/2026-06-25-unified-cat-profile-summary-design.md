# Unified Cat Profile Summary Design

## Goal

Make cat information feel like one consistent FOUND CAT profile across home collection, my cat-card detail, and map cat cards.

## Scope

- Reuse the same profile summary display for:
  - the collection-success profile sheet on Home
  - the Detail page cat information block
  - the Map selected-cat sheet
- Keep existing edit flows, share flows, map navigation, and database schema unchanged.
- Continue hiding exact addresses, raw coordinates, Google Maps labels, and unreadable map URLs from the profile summary.

## Profile Information

Use existing fields only:

- cat name
- public/private card number
- local deterministic cat speech
- personality tags
- fur color
- breed
- feature note
- spot clue
- care status
- broad readable place

## UI Direction

- Compact profile-card section, not a long form.
- Small blue/yellow brand accents with the existing paper-card style.
- Section labels stay short: `貓咪個人檔案`, `牠給人的感覺`, `外型小檔案`, `特徵`, `喜歡出沒`, `照護狀態`, `出沒城市`.
- Detail and Map may use a compact variant without duplicating the large photo.

## Acceptance

- Detail shows a `貓咪個人檔案` section with personality, color, feature note, spot clue, care status, and broad place.
- Map selected-cat sheet shows the same section labels and values.
- Full address text remains hidden in both Detail and Map summaries.
- Existing edit buttons and `去找這隻貓` CTA remain available.
