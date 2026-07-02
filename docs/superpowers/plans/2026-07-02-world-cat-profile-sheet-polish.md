# World Cat Profile Sheet Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish `WorldCatProfileSheet` into a photo-first, low-density cat profile sheet.

**Architecture:** Keep existing props and behavior. Update only presentation, deterministic copy, and tests in the sheet component.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, lucide-react, Tailwind utilities.

---

## Files

- Modify: `src/components/catdex/WorldCatProfileSheet.tsx`
- Modify: `src/components/catdex/WorldCatProfileSheet.test.tsx`

### Task 1: Photo-First Profile Sheet

**Files:**
- Modify: `src/components/catdex/WorldCatProfileSheet.test.tsx`
- Modify: `src/components/catdex/WorldCatProfileSheet.tsx`

- [ ] **Step 1: Write failing tests**

Update the filled-profile test to assert:

```tsx
expect(screen.getByTestId('world-cat-photo-frame')).toHaveClass('h-[clamp(190px,36dvh,280px)]');
expect(screen.getByTestId('world-cat-profile-summary')).toHaveTextContent('親人');
expect(screen.getByTestId('world-cat-profile-summary')).toHaveTextContent('貪吃');
expect(screen.getByTestId('world-cat-location-pill')).toHaveTextContent('泰國 清邁');
```

Update the sparse-profile test to assert:

```tsx
expect(screen.getByTestId('world-cat-photo-frame')).toHaveClass('h-[clamp(190px,36dvh,280px)]');
expect(screen.getByTestId('world-cat-profile-summary')).toHaveTextContent('這隻貓還很神秘。');
expect(dialog).not.toHaveTextContent('等你補充');
expect(dialog).not.toHaveTextContent('下一步');
```

- [ ] **Step 2: Run focused test and verify it fails**

Run:

```bash
npm test -- src/components/catdex/WorldCatProfileSheet.test.tsx
```

Expected: FAIL because the photo frame and profile summary test ids do not exist yet.

- [ ] **Step 3: Implement photo-first layout**

In `WorldCatProfileSheet.tsx`:

- Add copy key:

```tsx
summary: language === 'zh' ? '檔案摘要' : 'Profile note',
```

- Add helper:

```tsx
function getProfileSummary(copy: ReturnType<typeof copyFor>, labels: string[], hasProfileDetails: boolean) {
  if (labels.length > 0) return labels.slice(0, 2).join(' / ');
  if (hasProfileDetails) return copy.knownFact;
  return copy.mystery;
}
```

- Replace the old 96px grid with:

```tsx
<div className="mt-4">
  <div
    data-testid="world-cat-photo-frame"
    className="relative h-[clamp(190px,36dvh,280px)] overflow-hidden rounded-[24px] border-2 border-[#221915] bg-[#f7c948] shadow-[5px_5px_0_rgba(47,95,179,0.20)]"
  >
    ...
  </div>
  <div className="mt-3 flex flex-wrap items-center gap-2">
    <span className="rounded-full bg-[#2f5fb3] px-3 py-1 text-[11px] font-black text-white">
      {formatCatCardNumberForItem(item)}
    </span>
    <span
      data-testid="world-cat-location-pill"
      className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full border border-[#2f5fb3]/18 bg-[#d9ecff]/72 px-3 py-1.5 text-xs font-black text-[#1d1714]"
    >
      <MapPin size={13} className="shrink-0" strokeWidth={2.5} />
      <span className="truncate">{getReadableLocationName(item, language)}</span>
    </span>
  </div>
</div>
```

- Add summary block before details:

```tsx
<section
  data-testid="world-cat-profile-summary"
  className="rounded-[18px] border border-[#221915]/12 bg-[#fff8e7] px-3 py-2.5"
>
  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2f5fb3]">{copy.summary}</p>
  <p className="mt-1 text-sm font-black leading-6 text-[#1d1714]">
    {getProfileSummary(copy, personalityLabels, hasProfileDetails)}
  </p>
</section>
```

- Replace sparse `MysteryState` with a single intentional paragraph:

```tsx
{!hasProfileDetails ? (
  <p className="rounded-[18px] border border-[#221915]/12 bg-white/62 px-3 py-2.5 text-sm font-bold leading-6 text-[#6d5f52]">
    {copy.knownFact}
  </p>
) : null}
```

- [ ] **Step 4: Run focused test and verify it passes**

Run:

```bash
npm test -- src/components/catdex/WorldCatProfileSheet.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/catdex/WorldCatProfileSheet.tsx src/components/catdex/WorldCatProfileSheet.test.tsx docs/superpowers/specs/2026-07-02-world-cat-profile-sheet-polish-design.md docs/superpowers/plans/2026-07-02-world-cat-profile-sheet-polish.md
git commit -m "Polish world cat profile sheet"
```

### Task 2: Full Verification and Deploy

- [ ] **Step 1: Run full verification**

```bash
npm test
npm run check
npm run build
```

- [ ] **Step 2: Push**

```bash
git push origin HEAD:main
vercel ls --prod --scope kelsidreamlands-projects
```
