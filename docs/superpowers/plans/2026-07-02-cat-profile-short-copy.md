# Cat Profile Short Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved B+C hybrid cat profile design with short copy, intentional mystery empty states, and icon-first profile actions.

**Architecture:** Reuse the existing `CatProfileSummary` as the shared profile information component and update `WorldCatProfileSheet` for icon-first actions. Keep data shape and persistence unchanged; this slice only changes presentation and deterministic copy.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, lucide-react, Tailwind utility classes.

---

## Files

- Modify: `src/components/catdex/CatProfileSummary.tsx`
  - Shorten labels and empty-state copy.
  - Render a complete mystery state for sparse profiles.
- Modify: `src/components/catdex/CatProfileSummary.test.tsx`
  - Update tests for short copy and no skeleton/blank states.
- Modify: `src/components/catdex/WorldCatProfileSheet.tsx`
  - Use short empty-state copy.
  - Change find/save buttons to icon-first while keeping accessible labels.
- Modify: `src/components/catdex/WorldCatProfileSheet.test.tsx`
  - Update expectations for short labels, mystery state, and accessible icon buttons.
- Review only: `src/pages/Map.tsx`, `src/pages/Detail.tsx`, `src/components/catdex/CollectedCatProfileSheet.tsx`
  - They already consume `CatProfileSummary`; only adjust if tests reveal text assumptions.

---

### Task 1: Update Shared Profile Copy Contract

**Files:**
- Modify: `src/components/catdex/CatProfileSummary.test.tsx`
- Modify: `src/components/catdex/CatProfileSummary.tsx`

- [ ] **Step 1: Write failing tests for short labels and mystery copy**

Replace the sparse profile test and add assertions for the new copy:

```tsx
it('shows a compact mystery profile when users only saved a photo and location', () => {
  render(
    <CatProfileSummary
      item={makeItem({ location: { lat: 25.033, lng: 121.565, name: '東京' } })}
      language="zh"
    />
  );

  expect(screen.getByText('貓咪個人檔案')).toBeInTheDocument();
  expect(screen.getByText('這隻貓還很神秘。')).toBeInTheDocument();
  expect(screen.getByText('目前知道')).toBeInTheDocument();
  expect(screen.getByText('牠曾經在這裡出現。')).toBeInTheDocument();
  expect(screen.getByText('下一步')).toBeInTheDocument();
  expect(screen.getByText('去地圖看看牠在哪裡。')).toBeInTheDocument();
  expect(screen.getByText('感覺')).toBeInTheDocument();
  expect(screen.getByText('線索')).toBeInTheDocument();
  expect(screen.getAllByText('等你補充')).toHaveLength(2);
  expect(screen.queryByText('牠還很神秘，等下一位貓奴補充。')).not.toBeInTheDocument();
});
```

Update the label test:

```tsx
it('uses short profile labels for filled cat details', () => {
  render(
    <CatProfileSummary
      item={makeItem({
        personalityTags: ['friendly'],
        spotNote: '早上在咖啡店門口',
        catFeatureNote: '橘白色，尾巴末端有白點',
        careStatusTags: ['fed'],
      })}
      language="zh"
      showPlace={false}
    />
  );

  expect(screen.getByText('感覺')).toBeInTheDocument();
  expect(screen.getByText('偶遇線索')).toBeInTheDocument();
  expect(screen.getByText('特徵')).toBeInTheDocument();
  expect(screen.getByText('照護')).toBeInTheDocument();
  expect(screen.queryByText('牠給人的感覺')).not.toBeInTheDocument();
  expect(screen.queryByText('外型小檔案')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
npm test -- src/components/catdex/CatProfileSummary.test.tsx
```

Expected: FAIL because `CatProfileSummary` still uses old labels and old mystery copy.

- [ ] **Step 3: Implement the copy changes**

In `src/components/catdex/CatProfileSummary.tsx`, update `getCatProfileCopy`:

```tsx
export const getCatProfileCopy = (language: 'zh' | 'en') => ({
  title: language === 'zh' ? '貓咪個人檔案' : 'Cat Profile',
  catTalkLabel: language === 'zh' ? '貓咪回話' : 'Cat says',
  personality: language === 'zh' ? '感覺' : 'Vibe',
  look: language === 'zh' ? '外型' : 'Look',
  features: language === 'zh' ? '特徵' : 'Features',
  spot: language === 'zh' ? '偶遇線索' : 'Spot clues',
  care: language === 'zh' ? '照護' : 'Care',
  place: language === 'zh' ? '城市' : 'Area',
  known: language === 'zh' ? '目前知道' : 'Known so far',
  nextStep: language === 'zh' ? '下一步' : 'Next step',
  cluePlaceholder: language === 'zh' ? '線索' : 'Clues',
  unknownPlace: language === 'zh' ? '某個可愛街角' : 'A cute corner',
  defaultName: language === 'zh' ? '神秘貓咪' : 'Mystery cat',
  close: language === 'zh' ? '繼續看貓' : 'Keep swiping',
  openCatdex: language === 'zh' ? '查看我的貓卡' : 'View My Cat Cards',
  saved: language === 'zh' ? '已收藏' : 'Saved',
  mysterySpeech: language === 'zh' ? '這隻貓還很神秘。' : 'This cat is still mysterious.',
  knownFact: language === 'zh' ? '牠曾經在這裡出現。' : 'This cat was seen here.',
  nextStepCopy: language === 'zh' ? '去地圖看看牠在哪裡。' : 'Open the map to find this cat.',
  fillLater: language === 'zh' ? '等你補充' : 'Add later',
});
```

Update `getCatSpeech` final fallback:

```tsx
return getCatProfileCopy(language).mysterySpeech;
```

Add a small helper component below `ProfileChips`:

```tsx
function MysteryProfileState({
  copy,
  compact = false,
}: {
  copy: ReturnType<typeof getCatProfileCopy>;
  compact?: boolean;
}) {
  return (
    <div className={compact ? 'space-y-2.5' : 'space-y-3'}>
      <ProfileSection title={copy.known} compact={compact}>
        <p className={`rounded-[16px] border border-[#2f5fb3]/18 bg-[#d9ecff]/52 px-3 py-2 font-bold text-[#3d312a] ${
          compact ? 'text-xs leading-relaxed' : 'text-sm leading-6'
        }`}>
          {copy.knownFact}
        </p>
      </ProfileSection>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-[16px] border border-[#221915]/12 bg-white/64 px-3 py-2">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2f5fb3]">
            {copy.personality}
          </p>
          <p className="mt-1 text-xs font-black text-[#6d5f52]">{copy.fillLater}</p>
        </div>
        <div className="rounded-[16px] border border-[#221915]/12 bg-white/64 px-3 py-2">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2f5fb3]">
            {copy.cluePlaceholder}
          </p>
          <p className="mt-1 text-xs font-black text-[#6d5f52]">{copy.fillLater}</p>
        </div>
      </div>
      <ProfileSection title={copy.nextStep} compact={compact}>
        <p className={`rounded-[16px] border border-[#221915]/12 bg-[#fff2cf]/78 px-3 py-2 font-bold text-[#3d312a] ${
          compact ? 'text-xs leading-relaxed' : 'text-sm leading-6'
        }`}>
          {copy.nextStepCopy}
        </p>
      </ProfileSection>
    </div>
  );
}
```

Replace the final no-detail paragraph with:

```tsx
{!hasAnyProfileDetail ? (
  <MysteryProfileState copy={copy} compact={compact} />
) : null}
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run:

```bash
npm test -- src/components/catdex/CatProfileSummary.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit Task 1**

```bash
git add src/components/catdex/CatProfileSummary.tsx src/components/catdex/CatProfileSummary.test.tsx
git commit -m "Refine cat profile summary copy"
```

---

### Task 2: Make World Cat Profile Sheet Use Icon-First Actions

**Files:**
- Modify: `src/components/catdex/WorldCatProfileSheet.test.tsx`
- Modify: `src/components/catdex/WorldCatProfileSheet.tsx`

- [ ] **Step 1: Write failing tests for icon-first accessible actions and short mystery copy**

Update the sparse profile test:

```tsx
it('shows short mystery copy when optional world cat details are missing', () => {
  const onSave = vi.fn();

  render(
    <WorldCatProfileSheet
      item={makeItem({
        id: 'public-cat-2',
        publicNumber: 2,
        location: { lat: 25, lng: 121, name: '台北' },
        isPublic: true,
      })}
      language="zh"
      isSaved
      onClose={vi.fn()}
      onSave={onSave}
      onFind={vi.fn()}
    />
  );

  const dialog = screen.getByRole('dialog', { name: '神秘貓咪 世界貓咪檔案' });
  expect(dialog).toHaveTextContent('神秘貓咪');
  expect(dialog).toHaveTextContent('台北');
  expect(dialog).toHaveTextContent('W-002');
  expect(dialog).toHaveTextContent('這隻貓還很神秘。');
  expect(dialog).toHaveTextContent('目前知道');
  expect(dialog).toHaveTextContent('牠曾經在這裡出現。');
  expect(dialog).toHaveTextContent('下一步');
  expect(dialog).toHaveTextContent('去地圖看看牠在哪裡。');
  expect(dialog.querySelector('[data-testid="world-cat-find-icon-action"]')).toBeInTheDocument();
  expect(dialog.querySelector('[data-testid="world-cat-save-icon-action"]')).toBeInTheDocument();
});
```

Add an assertion to the full details test after locating the dialog:

```tsx
expect(screen.getByRole('button', { name: '去找這隻喵' })).toHaveAttribute('title', '去找這隻喵');
expect(screen.getByRole('button', { name: '收藏' })).toHaveAttribute('title', '收藏');
expect(screen.getByTestId('world-cat-find-icon-action')).toBeInTheDocument();
expect(screen.getByTestId('world-cat-save-icon-action')).toBeInTheDocument();
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
npm test -- src/components/catdex/WorldCatProfileSheet.test.tsx
```

Expected: FAIL because old mystery copy and action buttons are still text-first.

- [ ] **Step 3: Implement icon-first actions and short copy**

In `src/components/catdex/WorldCatProfileSheet.tsx`, import `Heart` and `Navigation`:

```tsx
import { Heart, MapPin, Navigation, X } from 'lucide-react';
```

Update `copyFor`:

```tsx
  mystery: language === 'zh' ? '這隻貓還很神秘。' : 'This cat is still mysterious.',
  known: language === 'zh' ? '目前知道' : 'Known so far',
  knownFact: language === 'zh' ? '牠曾經在這裡出現。' : 'This cat was seen here.',
  nextStep: language === 'zh' ? '下一步' : 'Next step',
  nextStepCopy: language === 'zh' ? '去地圖看看牠在哪裡。' : 'Open the map to find this cat.',
```

Replace the no-details paragraph with:

```tsx
{!hasProfileDetails ? (
  <div className="space-y-3">
    <p className="rounded-[16px] border border-[#2f5fb3]/18 bg-[#d9ecff]/52 px-3 py-2 text-sm font-black leading-6 text-[#3d312a]">
      {copy.mystery}
    </p>
    <DetailSection title={copy.known}>
      <p className="rounded-[16px] border border-[#221915]/12 bg-white/64 px-3 py-2 text-sm font-bold leading-6 text-[#3d312a]">
        {copy.knownFact}
      </p>
    </DetailSection>
    <DetailSection title={copy.nextStep}>
      <p className="rounded-[16px] border border-[#221915]/12 bg-[#fff2cf]/78 px-3 py-2 text-sm font-bold leading-6 text-[#3d312a]">
        {copy.nextStepCopy}
      </p>
    </DetailSection>
  </div>
) : null}
```

Replace the sticky action row with icon-first buttons:

```tsx
<div className="sticky bottom-0 -mx-4 mt-5 flex justify-center gap-3 border-t border-[#221915]/10 bg-[#fffdf2]/96 px-4 pt-3 backdrop-blur-sm">
  <button
    type="button"
    onClick={() => onFind(item)}
    aria-label={copy.find}
    title={copy.find}
    data-testid="world-cat-find-icon-action"
    className="grid h-13 w-13 place-items-center rounded-[18px] border-2 border-[#221915] bg-[#f7c948] p-3 text-[#221915] shadow-[3px_3px_0_rgba(29,23,20,0.86)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f5fb3]"
  >
    <Navigation size={22} strokeWidth={2.5} />
  </button>
  <button
    type="button"
    onClick={() => {
      if (isSaveLocked) return;
      setIsSaving(true);
      void Promise.resolve(onSave(item)).catch(() => {
        setIsSaving(false);
      });
    }}
    disabled={isSaveLocked}
    aria-label={isSaved ? copy.saved : copy.save}
    title={isSaved ? copy.saved : copy.save}
    data-testid="world-cat-save-icon-action"
    className="grid h-13 w-13 place-items-center rounded-[18px] border-2 border-[#221915] bg-white p-3 text-[#221915] shadow-[3px_3px_0_rgba(47,95,179,0.18)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f5fb3] disabled:cursor-default disabled:bg-[#fff8e7] disabled:text-[#6d5f52]"
  >
    <Heart size={22} fill={isSaved ? '#f7c948' : 'none'} strokeWidth={2.5} />
  </button>
</div>
```

If Tailwind does not generate `h-13 w-13`, use `h-[52px] w-[52px]`.

- [ ] **Step 4: Run the focused test and verify it passes**

Run:

```bash
npm test -- src/components/catdex/WorldCatProfileSheet.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit Task 2**

```bash
git add src/components/catdex/WorldCatProfileSheet.tsx src/components/catdex/WorldCatProfileSheet.test.tsx
git commit -m "Use icon actions in world cat profiles"
```

---

### Task 3: Regression Sweep Across Profile Consumers

**Files:**
- Review test failures in:
  - `src/pages/Detail.test.tsx`
  - `src/pages/Map.test.tsx`
  - `src/pages/Home.test.tsx`
  - `src/pages/Catdex.test.tsx`

- [ ] **Step 1: Run profile-related tests**

Run:

```bash
npm test -- src/components/catdex/CatProfileSummary.test.tsx src/components/catdex/WorldCatProfileSheet.test.tsx src/pages/Detail.test.tsx src/pages/Map.test.tsx src/pages/Home.test.tsx src/pages/Catdex.test.tsx
```

Expected: Some tests may fail only because they assert old labels such as `牠給人的感覺`, `外型小檔案`, or the old mystery copy.

- [ ] **Step 2: Update stale test expectations only**

If tests fail due to old profile copy, update expectations:

```tsx
expect(screen.getByText('感覺')).toBeInTheDocument();
expect(screen.queryByText('牠給人的感覺')).not.toBeInTheDocument();
expect(screen.queryByText('外型小檔案')).not.toBeInTheDocument();
expect(screen.getByText('這隻貓還很神秘。')).toBeInTheDocument();
```

Do not remove assertions that protect behavior:

- full address remains hidden
- raw coordinates remain hidden
- Google Maps labels remain hidden
- `去找這隻喵` remains accessible
- saved-world cats keep W numbers

- [ ] **Step 3: Re-run profile-related tests**

Run:

```bash
npm test -- src/components/catdex/CatProfileSummary.test.tsx src/components/catdex/WorldCatProfileSheet.test.tsx src/pages/Detail.test.tsx src/pages/Map.test.tsx src/pages/Home.test.tsx src/pages/Catdex.test.tsx
```

Expected: PASS.

- [ ] **Step 4: Commit Task 3 if expectations changed**

If files changed:

```bash
git add src/pages/Detail.test.tsx src/pages/Map.test.tsx src/pages/Home.test.tsx src/pages/Catdex.test.tsx
git commit -m "Update cat profile copy expectations"
```

If no files changed, skip this commit.

---

### Task 4: Full Verification and Deploy

**Files:**
- No planned source edits.

- [ ] **Step 1: Run full test suite**

Run:

```bash
npm test
```

Expected: all test files pass.

- [ ] **Step 2: Run TypeScript check**

Run:

```bash
npm run check
```

Expected: exit 0.

- [ ] **Step 3: Run production build**

Run:

```bash
npm run build
```

Expected: exit 0. Existing chunk-size warnings are acceptable.

- [ ] **Step 4: Mobile visual smoke test**

Start a managed production preview:

```bash
/Users/kevinleung/.codex/skills/process-guard/scripts/start-managed-process.sh --name foundcat-profile-preview --command 'npm run preview -- --host 127.0.0.1 --port 4173' --cwd /Users/kevinleung/cat-scrapbook --health-url http://127.0.0.1:4173 --timeout 60
```

Open and inspect:

```bash
open http://127.0.0.1:4173
```

Check on a narrow viewport:

- world cat profile sheet has icon GPS/heart actions
- sparse cat card shows short mystery copy
- no skeleton-looking empty lines
- no full address or raw coordinate noise

Stop preview:

```bash
/Users/kevinleung/.codex/skills/process-guard/scripts/stop-managed-process.sh --name foundcat-profile-preview
```

- [ ] **Step 5: Push to production**

Run:

```bash
git push origin HEAD:main
vercel ls --prod --scope kelsidreamlands-projects
```

Expected: latest production deployment reaches `Ready`.

---

## Self-Review

- Spec coverage:
  - B+C hybrid: Task 1 and Task 2.
  - Short labels/body copy: Task 1.
  - Mystery empty state: Task 1 and Task 2.
  - GPS/heart icon actions: Task 2.
  - Accessibility labels for icon-only actions: Task 2.
  - No schema/AI changes: all tasks are presentation/test only.
- Placeholder scan: no TBD/TODO placeholders.
- Type consistency: all referenced fields already exist on `ScrapbookItem`; all commands use existing npm scripts.
