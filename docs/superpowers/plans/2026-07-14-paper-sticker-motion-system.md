# FOUND CAT Paper Sticker Motion System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the approved balanced paper-sticker motion from the interactive demo into the production Home deck, profile sheets, Map cat sheet, and bottom navigation without changing routes, card data, copy, swipe outcomes, or responsive layout.

**Architecture:** Add one typed motion-preset module that owns shared durations, easing, spring values, reduced-motion branches, and sheet/nav presets. Keep gesture thresholds and swipe business behavior inside `CatCardDeck`; use Framer Motion values for frame-by-frame drag styling so React state only changes at gesture boundaries. Each affected surface exposes a small `data-motion-*` contract for regression tests while retaining its existing DOM semantics and callbacks.

**Tech Stack:** React 18, TypeScript, Framer Motion 12, React Router 7, Vitest, Testing Library, Tailwind CSS, Vite.

---

## File Map

- Create `src/lib/uiMotion.ts`: shared motion durations, easing, spring, reduced-motion-aware sheet and navigation presets.
- Create `src/lib/uiMotion.test.ts`: pure tests for normal and reduced presets.
- Modify `src/components/catdex/CatCardDeck.tsx`: motion values for directional drag, paper shadow, exit timing, reduced-motion behavior, and collection stamp.
- Modify `src/components/catdex/CatCardDeck.test.tsx`: regress swipe outcomes, motion states, and reduced-motion state.
- Modify `src/components/catdex/WorldCatProfileSheet.tsx`: shared backdrop/sheet motion.
- Modify `src/components/catdex/WorldCatProfileSheet.test.tsx`: shared motion contract and actions.
- Modify `src/components/catdex/CollectedCatProfileSheet.tsx`: shared backdrop/sheet motion.
- Create `src/components/catdex/CollectedCatProfileSheet.test.tsx`: shared motion contract and existing navigation/close actions.
- Modify `src/pages/Map.tsx`: shared motion on the selected-cat sheet while preserving dimensions and scrolling.
- Modify `src/pages/Map.test.tsx`: Map sheet motion contract and action regression.
- Modify `src/components/catdex/CatActionNav.tsx`: immediate paper-button press motion on all three actions.
- Modify `src/components/catdex/CatActionNav.test.tsx`: routes, `aria-current`, no labels, and motion roles.

### Task 1: Shared Motion Presets

**Files:**
- Create: `src/lib/uiMotion.ts`
- Test: `src/lib/uiMotion.test.ts`

- [ ] **Step 1: Write failing preset tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  getPaperNavPress,
  getPaperSheetMotion,
  paperMotion,
} from './uiMotion';

describe('paper motion presets', () => {
  it('uses the approved restrained timing and paper spring', () => {
    expect(paperMotion.duration).toEqual({ instant: 0.12, quick: 0.18, standard: 0.24 });
    expect(paperMotion.spring).toMatchObject({ stiffness: 420, damping: 34, mass: 0.72 });
  });

  it('removes decorative transforms when reduced motion is active', () => {
    const preset = getPaperSheetMotion(true);
    expect(preset.sheet.initial).toEqual({ opacity: 0 });
    expect(preset.sheet.animate).toEqual({ opacity: 1 });
    expect(getPaperNavPress(true, 'side')).toEqual({});
  });
});
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `npm test -- src/lib/uiMotion.test.ts`

Expected: FAIL because `src/lib/uiMotion.ts` does not exist.

- [ ] **Step 3: Implement the focused shared module**

```ts
export const paperMotion = {
  duration: { instant: 0.12, quick: 0.18, standard: 0.24 },
  easeOut: [0.22, 1, 0.36, 1] as const,
  spring: { type: 'spring' as const, stiffness: 420, damping: 34, mass: 0.72 },
};

export function getPaperSheetMotion(reduced: boolean | null) {
  if (reduced) {
    return {
      backdrop: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: paperMotion.duration.instant } },
      sheet: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: paperMotion.duration.instant } },
    };
  }
  return {
    backdrop: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: paperMotion.duration.quick, ease: paperMotion.easeOut } },
    sheet: {
      initial: { opacity: 0, y: 26, rotate: -0.8, scale: 0.98 },
      animate: { opacity: 1, y: 0, rotate: -0.35, scale: 1 },
      exit: { opacity: 0, y: 18, rotate: 0, scale: 0.98 },
      transition: paperMotion.spring,
    },
  };
}

export function getPaperNavPress(reduced: boolean | null, role: 'side' | 'capture') {
  if (reduced) return {};
  return role === 'capture' ? { y: 2, scale: 0.97 } : { y: 2, scale: 0.96 };
}
```

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run: `npm test -- src/lib/uiMotion.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the shared preset**

```bash
git add src/lib/uiMotion.ts src/lib/uiMotion.test.ts
git commit -m "feat: add paper motion presets"
```

### Task 2: Home Card Deck Motion

**Files:**
- Modify: `src/components/catdex/CatCardDeck.test.tsx`
- Modify: `src/components/catdex/CatCardDeck.tsx`

- [ ] **Step 1: Add failing behavior contracts**

```ts
it('marks the deck with the paper drag motion contract', () => {
  render(<CatCardDeck {...propsWithTwoCards} />);
  expect(screen.getByTestId('active-cat-card')).toHaveAttribute('data-motion-surface', 'paper-card');
  expect(screen.getByTestId('active-cat-card')).toHaveAttribute('data-motion-reduced', 'false');
  expect(screen.getByTestId('card-stack-next')).toHaveAttribute('data-motion-role', 'stack-next');
});

it('uses one sticker stamp for collection feedback', () => {
  vi.useFakeTimers();
  render(<CatCardDeck {...propsWithTwoCards} onCollectCard={vi.fn()} />);
  fireEvent.keyDown(screen.getByTestId('active-cat-card'), { key: 'ArrowLeft' });
  expect(screen.getByRole('status')).toHaveAttribute('data-motion-surface', 'collection-stamp');
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `npm test -- src/components/catdex/CatCardDeck.test.tsx`

Expected: FAIL because the new motion attributes and stack test id are absent.

- [ ] **Step 3: Implement drag values and reduced-motion branching**

Use `useMotionValue`, `useTransform`, `useReducedMotion`, and imperative `animate` from Framer Motion. Bind the active article's `x`, `rotate`, `scale`, and paper-blue shadow to motion values. Keep `swipeDirection` as the gesture-boundary state, keep left collect/right next exactly as-is, use a zero-delay completion in reduced motion, and clean up the imperative animation control on unmount. Add only these stable contracts:

```tsx
data-motion-surface="paper-card"
data-motion-reduced={prefersReducedMotion ? 'true' : 'false'}
```

Render collection feedback through `motion.div` using a single compact stamp transition. Do not add buttons, copy, hints, photos, dependencies, or layout dimensions.

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run: `npm test -- src/components/catdex/CatCardDeck.test.tsx`

Expected: all deck tests PASS, including left collect, right next, tap open, duplicate guard, and source-change reset.

- [ ] **Step 5: Commit the deck slice**

```bash
git add src/components/catdex/CatCardDeck.tsx src/components/catdex/CatCardDeck.test.tsx
git commit -m "feat: refine cat card paper motion"
```

### Task 3: Profile Sheet Motion

**Files:**
- Modify: `src/components/catdex/WorldCatProfileSheet.test.tsx`
- Modify: `src/components/catdex/WorldCatProfileSheet.tsx`
- Create: `src/components/catdex/CollectedCatProfileSheet.test.tsx`
- Modify: `src/components/catdex/CollectedCatProfileSheet.tsx`

- [ ] **Step 1: Add failing shared-sheet contracts**

```ts
expect(screen.getByRole('presentation')).toHaveAttribute('data-motion-surface', 'paper-sheet-backdrop');
expect(screen.getByRole('dialog')).toHaveAttribute('data-motion-surface', 'paper-sheet');
expect(screen.getByRole('dialog')).toHaveAttribute('data-motion-reduced', 'false');
```

The collected-sheet test must also click close, verify `onClose`, and verify the `/catdex` link remains present.

- [ ] **Step 2: Run both tests and confirm RED**

Run: `npm test -- src/components/catdex/WorldCatProfileSheet.test.tsx src/components/catdex/CollectedCatProfileSheet.test.tsx`

Expected: FAIL because the shared motion contracts are absent and the collected test file is new.

- [ ] **Step 3: Apply the shared preset**

In each component, call `useReducedMotion()` and `getPaperSheetMotion(prefersReducedMotion)`. Change the presentation backdrop to `motion.div`, spread `sheetMotion.backdrop` on it, spread `sheetMotion.sheet` on the dialog section, and add the stable attributes. Keep all copy, profile fields, photo sizes, sticky actions, links, and callbacks unchanged.

- [ ] **Step 4: Run both tests and confirm GREEN**

Run: `npm test -- src/components/catdex/WorldCatProfileSheet.test.tsx src/components/catdex/CollectedCatProfileSheet.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the profile sheets**

```bash
git add src/components/catdex/WorldCatProfileSheet.tsx src/components/catdex/WorldCatProfileSheet.test.tsx src/components/catdex/CollectedCatProfileSheet.tsx src/components/catdex/CollectedCatProfileSheet.test.tsx
git commit -m "feat: unify cat profile sheet motion"
```

### Task 4: Map Selected-Cat Sheet Motion

**Files:**
- Modify: `src/pages/Map.test.tsx`
- Modify: `src/pages/Map.tsx`

- [ ] **Step 1: Add the failing Map motion assertions**

```ts
expect(screen.getByTestId('map-cat-detail-sheet')).toHaveAttribute('data-motion-surface', 'paper-sheet');
expect(screen.getByTestId('map-cat-detail-sheet')).toHaveAttribute('data-motion-context', 'map-cat');
expect(screen.getByTestId('map-cat-detail-sheet')).toHaveAttribute('data-motion-reduced', 'false');
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `npm test -- src/pages/Map.test.tsx`

Expected: FAIL because Map still exposes the legacy `map-cat-sheet` motion surface.

- [ ] **Step 3: Apply the paper sheet preset to Map**

Call `useReducedMotion()` once in `Map`, derive the shared sheet preset, and spread its sheet values on the selected-cat `motion.div`. Preserve `maxHeight`, `transformOrigin`, photo height, scroll container, selection behavior, sibling navigation, publish controls, and all map actions. Do not alter the separate encounter editor or image viewer in this slice.

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run: `npm test -- src/pages/Map.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the Map slice**

```bash
git add src/pages/Map.tsx src/pages/Map.test.tsx
git commit -m "feat: align map cat sheet motion"
```

### Task 5: Bottom Navigation Motion

**Files:**
- Modify: `src/components/catdex/CatActionNav.test.tsx`
- Modify: `src/components/catdex/CatActionNav.tsx`

- [ ] **Step 1: Add failing navigation motion contracts**

```ts
expect(screen.getByRole('link', { name: '我的貓卡' })).toHaveAttribute('data-motion-role', 'side-action');
expect(screen.getByRole('link', { name: '拍貓' })).toHaveAttribute('data-motion-role', 'capture-action');
expect(screen.getByRole('link', { name: '貓咪地圖' })).toHaveAttribute('data-motion-role', 'side-action');
expect(screen.queryByText('我的貓卡')).not.toBeInTheDocument();
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `npm test -- src/components/catdex/CatActionNav.test.tsx`

Expected: FAIL because the motion roles are absent.

- [ ] **Step 3: Implement immediate press feedback**

Create a `MotionLink` with `motion.create(Link)`, call `useReducedMotion()`, and apply `getPaperNavPress()` through `whileTap`. Preserve all `to`, `aria-label`, and `aria-current` values. Remove duplicate CSS active translation only where it would conflict with Framer Motion; retain focus styling, icons, active colors, and the center button's resting elevation.

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run: `npm test -- src/components/catdex/CatActionNav.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the navigation slice**

```bash
git add src/components/catdex/CatActionNav.tsx src/components/catdex/CatActionNav.test.tsx
git commit -m "feat: add tactile bottom navigation motion"
```

### Task 6: Full Verification And Mobile Smoke

**Files:**
- Modify only if verification finds a regression in the files above.

- [ ] **Step 1: Run all automated verification**

```bash
npm test
npm run check
npm run build
npm run check:cloud
```

Expected: all commands exit `0` with no test failures or TypeScript errors.

- [ ] **Step 2: Run a managed local preview**

Start Vite through the process-guard managed-process scripts on an available localhost port, verify readiness, and record the PID/log path. Do not leave an unmanaged server running.

- [ ] **Step 3: Smoke test at 390 x 844**

Verify in a real browser:

- Home has no horizontal overflow and the card photo remains dominant.
- Dragging left collects once and advances; dragging right advances without collecting.
- Tapping a card opens the paper profile sheet with an unclipped close button.
- Map selected-cat sheet keeps internal scrolling and does not overlap bottom navigation.
- All three bottom actions respond immediately, including the current destination.
- Emulated `prefers-reduced-motion: reduce` removes decorative rotation/scale while preserving all outcomes.

- [ ] **Step 4: Stop the managed preview and confirm cleanup**

Run the process-guard stop/status scripts and verify no task-owned process remains.

- [ ] **Step 5: Review and ship**

Review the final diff findings-first, confirm every design-spec requirement maps to code or a test, then commit any verification-only adjustments. Push `HEAD:main`, confirm the Vercel production deployment reaches Ready, and smoke-check `https://found-cat.vercel.app/`.

---

## Self-Review

- Spec coverage: all three scoped surfaces, reduced motion, responsive behavior, performance constraint, and unchanged business behavior are mapped to tasks.
- Placeholder scan: no TBD or deferred implementation remains; every code change names an exact file, behavior, command, and expected result.
- Type consistency: shared helpers consistently accept `boolean | null`; surface attributes use `paper-card`, `paper-sheet`, `paper-sheet-backdrop`, `collection-stamp`, and the two navigation roles.

