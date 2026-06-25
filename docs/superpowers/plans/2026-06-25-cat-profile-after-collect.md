# Cat Profile After Collect Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open a cute cat profile sheet after a public world cat is collected from the home swipe deck.

**Architecture:** Keep the swipe deck unchanged except for its existing collect callback. Add a focused profile sheet component that reads an already-saved `ScrapbookItem`, derives display labels from existing helpers, and hides exact address/coordinate data.

**Tech Stack:** React, TypeScript, Framer Motion, Vitest, Testing Library, Tailwind.

---

### Task 1: Lock The Collection Profile Behavior

**Files:**
- Modify: `src/pages/Home.test.tsx`

- [ ] Add a failing test that loads two public cards, left-swipes the active card, and expects a `貓咪個人檔案` dialog with cat name, speech, personality, fur color, feature note, spot clues, and a broad place label.
- [ ] Assert that the dialog does not render the full address text.
- [ ] Run `npm test -- src/pages/Home.test.tsx` and verify the new test fails because the dialog does not exist yet.

### Task 2: Add Profile Sheet Display

**Files:**
- Create: `src/components/catdex/CollectedCatProfileSheet.tsx`
- Modify: `src/pages/Home.tsx`

- [ ] Build a fixed modal/bottom sheet rendered above the bottom navigation.
- [ ] Derive labels using `getPersonalityLabels`, `getCareStatusLabels`, `getCatColorLabel`, `getCatBreedLabel`, and `formatCatCardNumberForItem`.
- [ ] Add deterministic cat speech based on personality tags.
- [ ] Derive broad place copy from readable location metadata, avoiding URL, coordinate, and full address display.
- [ ] In `Home.tsx`, store the item returned by `addItem` and render the sheet after collection.
- [ ] Add close and `/catdex` actions.

### Task 3: Verify And Ship

**Files:**
- Modify: `.omx/logs/execution-ledger.md`

- [ ] Run `npm test -- src/pages/Home.test.tsx`.
- [ ] Run `npm test -- src/components/catdex/CatCardDeck.test.tsx`.
- [ ] Run `npm test`.
- [ ] Run `npm run check`.
- [ ] Run `npm run build`.
- [ ] Run `npm run check:cloud`.
- [ ] Commit and deploy to production if all checks pass.
