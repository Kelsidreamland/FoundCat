# Cat Profile After Collect Design

## Goal

When a user swipes left to collect a public world cat card, FOUND CAT should feel more like a playful cat-social app: the app saves the cat, then opens a compact cat profile sheet where the cat "responds" and shows friendly, non-sensitive profile details.

## Scope

- Trigger only after successfully collecting a public world cat from the home deck.
- Keep right swipe as "next cat" with no profile sheet.
- Use existing local fields only: cat name, public number, photo, fur color, breed, personality tags, feature note, spot note, care status, and location metadata.
- Do not add an AI/chat backend yet. Cat speech is deterministic local copy based on existing tags.
- Do not change database schema, public map logic, auth, or share poster flow.

## UX

- Show a fixed modal/bottom sheet above the tab bar after collection.
- The sheet title is `貓咪個人檔案` / `Cat Profile`.
- The cat says a short line such as `喵，謝謝你收藏我。`.
- Profile details are short chips/sections:
  - personality
  - fur color and breed when available
  - feature note
  - spot clues
  - broad place only
- Do not expose exact address text or raw coordinates in this sheet.
- Primary action closes the sheet and continues swiping.
- Secondary action links to `/catdex` for saved cards.

## Acceptance

- Left swipe on a public cat saves it and opens the profile sheet.
- Right swipe does not open the profile sheet.
- Profile sheet shows existing cat info in a cute, readable format.
- Full address strings are not rendered in the profile sheet.
- Existing home deck collection tests continue to pass.
