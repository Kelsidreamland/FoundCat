# Home Swipe Profile Flow Design

## Goal

Make the home deck feel more like a light cat-dating flow: the card stays visually quiet while swiping, and the richer cat profile appears only after the user collects or opens a cat.

## Approved Behavior

- The home card remains simple: photo, cat name, number, broad location, and up to two personality chips.
- Swiping left collects the world cat and immediately opens the world cat profile sheet for that same cat.
- The profile sheet is the place for richer details: vibe, features, encounter clues, care, city, and the icon-first actions.
- The sheet keeps the GPS action labeled `去找這隻喵`, so the path from collecting to map navigation is direct.
- The old large first-save guidance banner should not compete with the profile sheet after a swipe collect.

## Non-Goals

- Do not add cat chat or AI-generated replies in this slice.
- Do not add new profile fields.
- Do not change the database or cloud save behavior.
- Do not redesign the full home card visual system.

## Acceptance

- A public cat collected from the home deck is still saved into local cards with its public number and source public id.
- After left-swipe collection, the world cat profile sheet opens for the collected cat.
- The sheet shows the cat profile and includes the accessible `去找這隻喵` action.
- If the cat is already saved, the sheet shows `已收藏`.
- The first-save guidance banner does not appear over the newly opened profile sheet.
