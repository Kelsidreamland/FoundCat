# Home Swipe Profile Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open the world cat profile sheet immediately after a home-deck left-swipe collect, keeping the home card simple and the map CTA inside the sheet.

**Architecture:** Reuse `WorldCatProfileSheet` as the richer post-collect profile surface. Change only `Home.tsx` collection orchestration so a swipe collect saves the cat, opens the sheet for that same public cat, and suppresses the old large first-save guidance banner.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, React Router.

---

## Files

- Modify: `src/pages/Home.test.tsx`
  - Add/adjust tests for post-swipe sheet behavior.
- Modify: `src/pages/Home.tsx`
  - Open `WorldCatProfileSheet` after swipe collect.
  - Suppress the old first-save guidance banner for swipe collect.

### Task 1: Open Profile Sheet After Swipe Collect

**Files:**
- Modify: `src/pages/Home.test.tsx`
- Modify: `src/pages/Home.tsx`

- [ ] **Step 1: Write the failing test**

Add a home page test that loads two public cards, left-swipes the first card, and expects the profile sheet for that same first card to open:

```tsx
it('opens the collected world cat profile sheet after a left-swipe collect', async () => {
  vi.mocked(loadPublicCatCards).mockResolvedValue({
    ok: true,
    items: [
      makeItem({
        id: 'public-cat-88',
        publicNumber: 88,
        catName: '首爾店長貓',
        catFeatureNote: '左耳白毛，尾巴短短',
        personalityTags: ['friendly'],
        spotNote: '下午常在窗邊睡覺',
        careStatusTags: ['fed'],
        location: { lat: 37.5665, lng: 126.978, name: '首爾咖啡店' },
        isPublic: true,
      }),
      makeItem({
        id: 'public-cat-89',
        publicNumber: 89,
        catName: '曼谷小橘',
        location: { lat: 13.7563, lng: 100.5018, name: '曼谷街角咖啡' },
        isPublic: true,
      }),
    ],
  });

  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/map" element={<CurrentRoute />} />
      </Routes>
    </MemoryRouter>
  );

  await screen.findByText('首爾店長貓');
  fireEvent.keyDown(screen.getByTestId('active-cat-card'), { key: 'ArrowLeft' });

  const dialog = await screen.findByRole('dialog', { name: '首爾店長貓 世界貓咪檔案' });
  expect(dialog).toHaveTextContent('W-088');
  expect(dialog).toHaveTextContent('感覺');
  expect(dialog).toHaveTextContent('親人');
  expect(dialog).toHaveTextContent('特徵');
  expect(dialog).toHaveTextContent('左耳白毛，尾巴短短');
  expect(dialog).toHaveTextContent('偶遇線索');
  expect(dialog).toHaveTextContent('下午常在窗邊睡覺');
  expect(dialog).toHaveTextContent('照護');
  expect(dialog).toHaveTextContent('固定餵養');
  expect(screen.getByRole('button', { name: '已收藏' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '去找這隻喵' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: '去找這隻喵' })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: '去找這隻喵' }));

  expect(await screen.findByTestId('current-route')).toHaveTextContent('/map?mode=public&cat=public-cat-88');
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
npm test -- src/pages/Home.test.tsx
```

Expected: FAIL because left-swipe collect currently shows the old first-save guidance banner instead of the world profile sheet.

- [ ] **Step 3: Implement the minimal home flow change**

In `src/pages/Home.tsx`, update `handleCollectCard` so it suppresses the old save prompt and opens the profile sheet:

```tsx
const handleCollectCard = useCallback(async (item: ScrapbookItem) => {
  await collectPublicCat(item, { showCollectedProfile: false, showSavePrompt: false });
  setSavePrompt(null);
  setProfileSheetItem(item);
}, [collectPublicCat]);
```

- [ ] **Step 4: Run the focused test and update stale expectations**

Run:

```bash
npm test -- src/pages/Home.test.tsx
```

Expected: The new test passes. If existing tests still expect the old first-save guidance banner after swipe collect, update them to assert the profile sheet instead.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Home.tsx src/pages/Home.test.tsx docs/superpowers/specs/2026-07-02-home-swipe-profile-flow-design.md docs/superpowers/plans/2026-07-02-home-swipe-profile-flow.md
git commit -m "Open cat profile after home swipe collect"
```

### Task 2: Verification and Deploy

**Files:**
- Review only: project-wide

- [ ] **Step 1: Run full verification**

Run:

```bash
npm test
npm run check
npm run build
```

Expected: all commands pass. Existing Vite chunk-size warnings are acceptable if build completes.

- [ ] **Step 2: Push to production**

Run:

```bash
git push origin HEAD:main
vercel ls --prod --scope kelsidreamlands-projects
```

Expected: Git push succeeds and Vercel production deployment reaches `Ready`.
