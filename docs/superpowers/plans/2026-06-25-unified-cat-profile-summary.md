# Unified Cat Profile Summary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reuse one cat profile summary display across Home collection, Detail, and Map.

**Architecture:** Extract profile display helpers and sections from the collection sheet into a shared `CatProfileSummary` component. Keep `CollectedCatProfileSheet` as the modal shell and use the summary component inside Detail and Map compact surfaces.

**Tech Stack:** React, TypeScript, Framer Motion, Vitest, Testing Library, Tailwind.

---

### Task 1: Test Shared Profile Expectations

**Files:**
- Modify: `src/pages/Detail.test.tsx`
- Modify: `src/pages/Map.test.tsx`

- [x] Add/adjust Detail assertions so the page shows `貓咪個人檔案`, cat speech, personality, color, feature note, spot clue, care status, and broad place while hiding full address.
- [x] Add/adjust Map assertions so the map selected-cat sheet shows the same profile labels and values while keeping action buttons available.
- [x] Run focused tests and verify they fail before implementation.

### Task 2: Extract Profile Summary

**Files:**
- Create: `src/components/catdex/CatProfileSummary.tsx`
- Modify: `src/components/catdex/CollectedCatProfileSheet.tsx`

- [x] Move profile copy, deterministic cat speech, broad place label, chips, and sections into `CatProfileSummary`.
- [x] Support `variant="full"` for Home modal and `variant="compact"` for Detail/Map.
- [x] Keep Home modal photo/actions inside `CollectedCatProfileSheet`.

### Task 3: Integrate Detail And Map

**Files:**
- Modify: `src/pages/Detail.tsx`
- Modify: `src/pages/Map.tsx`

- [x] Replace Detail's duplicated read-only info block with `CatProfileSummary`.
- [x] Replace Map selected-cat duplicated trait/note/care/optional fact display with `CatProfileSummary`.
- [x] Keep edit forms, share actions, map navigation, public publish prompts, and same-location switching unchanged.

### Task 4: Verify And Ship

**Files:**
- Local-only update: `.omx/logs/execution-ledger.md`

- [x] Run focused Detail, Map, Home, CatProfileSummary, and CatCardDeck tests.
- [x] Run full test suite, typecheck, production build, and cloud readiness.
- [x] Commit, push to main, and rely on Vercel/GitHub deployment status.
