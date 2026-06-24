# UI Motion Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the motion and tactile feedback on the home card deck, map cat detail sheet, and My Cat Cards archive without changing product logic.

**Architecture:** Keep existing React/framer-motion components. Add stable test hooks and small motion wrappers directly where the UI already owns the interaction state.

**Tech Stack:** React, TypeScript, Tailwind CSS classes, framer-motion, Vitest, Testing Library.

---

### Task 1: Home Cat Card Deck Motion

**Files:**
- Modify: `src/components/catdex/CatCardDeck.tsx`
- Test: `src/components/catdex/CatCardDeck.test.tsx`

- [ ] Add a failing test that expects the active cat card to expose `data-motion-state="settled"` before swiping and `data-motion-state="leaving-left"` after a left swipe.
- [ ] Run `npm test -- src/components/catdex/CatCardDeck.test.tsx` and confirm the new assertion fails.
- [ ] Add the `data-motion-state` attribute from `swipeDirection`.
- [ ] Refine card transition values to use a shorter, more paper-like spring/tween while keeping the existing `data-swipe-exit` behavior.
- [ ] Update collection feedback styling only; do not change its role, copy, timeout, or collection behavior.
- [ ] Run `npm test -- src/components/catdex/CatCardDeck.test.tsx` and confirm it passes.

### Task 2: Map Cat Detail Sheet Motion

**Files:**
- Modify: `src/pages/Map.tsx`
- Test: `src/pages/Map.test.tsx`

- [ ] Add a failing test that expects the map cat detail sheet to expose `data-motion-surface="map-cat-sheet"` after opening a marker card.
- [ ] Run `npm test -- src/pages/Map.test.tsx` and confirm the new assertion fails.
- [ ] Add the stable `data-motion-surface` attribute.
- [ ] Refine the selected-cat sheet motion to enter from the bottom with `y`, `scale`, and `opacity`, preserving the current max height and scroll container.
- [ ] Wrap the inner scroll content with a light motion section so card information appears cleanly after the photo.
- [ ] Run `npm test -- src/pages/Map.test.tsx` and confirm it passes.

### Task 3: Catdex Tab Content Motion

**Files:**
- Modify: `src/pages/Catdex.tsx`
- Test: `src/pages/Catdex.test.tsx`

- [ ] Add a failing test that expects the active collection content wrapper to expose `data-motion-surface="catdex-collection"` and `data-active-collection="self"` initially.
- [ ] Extend the existing tab test to expect `data-active-collection="world"` after switching tabs.
- [ ] Run `npm test -- src/pages/Catdex.test.tsx` and confirm the new assertion fails.
- [ ] Add an `AnimatePresence`/`motion.div` wrapper around the active collection section with stable data attributes.
- [ ] Keep the tab buttons and bottom navigation outside this animated wrapper.
- [ ] Run `npm test -- src/pages/Catdex.test.tsx` and confirm it passes.

### Task 4: Full Verification And Deployment

**Files:**
- Modify: `.omx/logs/execution-ledger.md`

- [ ] Run `npm test`.
- [ ] Run `npm run check`.
- [ ] Run `npm run build`.
- [ ] Run `npm run check:cloud`.
- [ ] Commit the implementation.
- [ ] Push `HEAD:main`.
- [ ] Run `vercel deploy --prod --yes --scope kelsidreamlands-projects`.
- [ ] Verify `curl -I https://found-cat.vercel.app/` returns HTTP 200.
- [ ] Append execution notes with commit hash and deployment id to `.omx/logs/execution-ledger.md`.
