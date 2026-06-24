# Location Picker Path Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clarify the three location-entry paths in LocationPicker without changing location data behavior.

**Architecture:** Keep the existing LocationPicker component and tests. Add a small derived helper-state block near the text input and preserve existing Google Maps, search, and manual pin behavior.

**Tech Stack:** React, TypeScript, Tailwind CSS, Vitest, Testing Library.

---

### Task 1: Test Helper Copy States

**Files:**
- Modify: `src/components/LocationPicker.test.tsx`

- [ ] Add a failing test that confirms the default helper line says users can paste Google Maps, search, or tap the map.
- [ ] Add a failing test that confirms a full Google Maps coordinate link shows copy indicating the user can confirm immediately.
- [ ] Add a failing test that confirms a typed place/search input shows copy indicating search or map pin are both acceptable.
- [ ] Run `npm test -- src/components/LocationPicker.test.tsx` and confirm the new tests fail for the missing helper copy.

### Task 2: Implement Helper Copy

**Files:**
- Modify: `src/components/LocationPicker.tsx`

- [ ] Add derived `locationInputHelperCopy` text based on parsed Google Maps link, unresolved short link, or typed query.
- [ ] Render the helper copy under the input with compact brand styling.
- [ ] Keep existing short-link warning, Google Maps parsed panel, search suggestions, and no-result copy working.
- [ ] Run `npm test -- src/components/LocationPicker.test.tsx` and confirm it passes.

### Task 3: Full Verification And Deployment

**Files:**
- Modify: `.omx/logs/execution-ledger.md`

- [ ] Run `npm test`.
- [ ] Run `npm run check`.
- [ ] Run `npm run build`.
- [ ] Run `npm run check:cloud`.
- [ ] Commit the implementation.
- [ ] Push `HEAD:main`.
- [ ] Deploy with `vercel deploy --prod --yes --scope kelsidreamlands-projects`.
- [ ] Verify `curl -I https://found-cat.vercel.app/` returns HTTP 200.
- [ ] Append execution notes to `.omx/logs/execution-ledger.md`.
