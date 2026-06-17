# Global Cat Card Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the confirmed FOUND CAT flow: saved cats return directly to the map, the global feed becomes swipe-first, and login appears as backup/public-sharing support instead of a forced entry gate.

**Architecture:** Ship this in small, independently verifiable slices. The first slice changes the create-to-map handoff only: `Create` navigates directly to `/map?cat=<id>&publishHint=1`, while `Map` opens that cat and shows a lightweight public-sharing sign-in prompt only when relevant. Later slices can change homepage feed and card collection structure without blocking this flow.

**Tech Stack:** React, TypeScript, React Router, Zustand stores, Vitest + Testing Library, Tailwind CSS, MapLibre.

---

## File Structure

- `src/pages/Create.tsx`
  - Remove the post-create success panel path for cats that have a picked location.
  - After `LocationPicker` returns a location, update the item and navigate straight to `/map?cat=<id>&publishHint=1`.
- `src/pages/Create.test.tsx`
  - Replace tests that expect the post-create success panel with tests for direct map navigation.
  - Keep poster-preview success-panel tests only if the panel still exists for a separate path; otherwise remove/replace them in the same slice.
- `src/pages/Map.tsx`
  - Read `publishHint=1` from query params.
  - If a local selected cat is open and the user is not signed in, show a subtle prompt below the selected cat card explaining that login is needed to publish to the world map and later edit/remove it.
  - Do not show this prompt on public map mode.
- `src/pages/Map.test.tsx`
  - Add coverage for `/map?cat=<id>&publishHint=1` selecting the cat and rendering the prompt.
  - Add coverage that the prompt is absent for signed-in users and public map mode.
- `docs/product/found-cat-world-map-brainstorm.md`
  - Already updated in commit `25d4ba5`; no further changes required for Task 1 unless behavior changes during implementation.

---

### Task 1: Create-To-Map Direct Handoff

**Files:**
- Modify: `src/pages/Create.tsx`
- Modify: `src/pages/Create.test.tsx`
- Modify: `src/pages/Map.tsx`
- Modify: `src/pages/Map.test.tsx`

- [x] **Step 1: Write the failing Create test**

Replace the existing `Create.test.tsx` test named `shows explicit next steps after a location is picked` with a behavior test that expects direct navigation:

```tsx
it('returns directly to the map and focuses the new cat after a location is picked', async () => {
  render(
    <MemoryRouter initialEntries={['/create']}>
      <RouteDisplay />
      <Routes>
        <Route path="/create" element={<Create />} />
        <Route path="/map" element={<div>Map page</div>} />
      </Routes>
    </MemoryRouter>
  );

  await userEvent.upload(
    screen.getByLabelText('Upload from Album'),
    new File(['cat'], 'cat.jpg', { type: 'image/jpeg' })
  );

  await screen.findByTestId('cropper');
  await userEvent.click(screen.getByRole('button', { name: '方形貓卡' }));
  await screen.findByAltText('預覽貓卡');
  await userEvent.click(screen.getByRole('button', { name: /存入我的貓卡/ }));
  expect(screen.queryByRole('button', { name: '完成標籤' })).not.toBeInTheDocument();
  await userEvent.click(await screen.findByRole('button', { name: '確認測試地點' }));

  expect(await screen.findByTestId('current-route')).toHaveTextContent('/map?cat=new-cat-id&publishHint=1');
  expect(screen.queryByRole('heading', { name: '已存到貓咪地圖' })).not.toBeInTheDocument();
  expect(useScrapbookStore.getState().items[0].location).toMatchObject({
    lat: 25.033,
    lng: 121.565,
    name: 'Taipei 101',
  });
});
```

- [x] **Step 2: Run the Create test and verify it fails**

Run:

```bash
npm test -- src/pages/Create.test.tsx
```

Expected: failure because the route remains `/create` and the old post-create success panel is still rendered.

- [x] **Step 3: Implement direct navigation in `Create.tsx`**

Update `handleLocationPicked` so a successfully located created cat navigates directly:

```tsx
if (createdStickerId) {
  await updateItem(createdStickerId, { location });
  const catId = createdStickerId;
  setTargetDate(null);
  setCreatedStickerId(null);
  setShowLocationPicker(false);
  setPostCreateItemId(null);
  setShowPosterPreview(false);
  navigate(`/map?cat=${encodeURIComponent(catId)}&publishHint=1`);
  return;
}
```

Then remove dead post-create success-panel state and handlers if TypeScript reports they are unused:

```tsx
const [postCreateItemId, setPostCreateItemId] = useState<string | null>(null);
const [showPosterPreview, setShowPosterPreview] = useState(false);
const postCreateItem = postCreateItemId ? items.find((item) => item.id === postCreateItemId) ?? null : null;
const handleViewCreatedCatOnMap = useCallback(...);
const handleCreateAnother = useCallback(...);
```

If removing the success panel, also remove the `if (!imageSrc && postCreateItemId) { ... }` block and the lazy import/use of `SingleCatPosterPreviewModal` from `Create.tsx`.

- [x] **Step 4: Run the Create test and verify it passes**

Run:

```bash
npm test -- src/pages/Create.test.tsx
```

Expected: all Create tests pass after replacing/removing any tests tied only to the deleted success panel.

- [x] **Step 5: Write failing Map tests for the public-sharing login hint**

Add tests in `src/pages/Map.test.tsx`:

```tsx
it('opens a newly created local cat and explains login is needed before publishing it', async () => {
  useScrapbookStore.setState({
    items: [
      makeItem({
        id: 'new-cat-id',
        imageData: 'data:image/png;base64,new-cat',
        catdexNumber: 129,
        location: {
          lat: 25.033,
          lng: 121.565,
          name: 'Taipei 101',
        },
      }),
    ],
    isLoading: false,
    language: 'zh',
  });

  render(
    <MemoryRouter initialEntries={['/map?cat=new-cat-id&publishHint=1']}>
      <Map />
    </MemoryRouter>
  );

  expect(await screen.findByText('Taipei 101')).toBeInTheDocument();
  expect(screen.getByText('想讓大家也看到這隻貓？')).toBeInTheDocument();
  expect(screen.getByText('登入後可以公開到全世界地圖，也能之後修改或撤回。')).toBeInTheDocument();
});

it('does not show the publish login hint on the public map', async () => {
  vi.mocked(loadPublicCatCards).mockResolvedValue({
    ok: true,
    items: [
      makeItem({
        id: 'new-cat-id',
        imageData: 'data:image/png;base64,new-cat',
        location: {
          lat: 25.033,
          lng: 121.565,
          name: 'Taipei 101',
        },
        isPublic: true,
      }),
    ],
  });

  render(
    <MemoryRouter initialEntries={['/map?mode=public&cat=new-cat-id&publishHint=1']}>
      <Map />
    </MemoryRouter>
  );

  expect(await screen.findByText('Taipei 101')).toBeInTheDocument();
  expect(screen.queryByText('想讓大家也看到這隻貓？')).not.toBeInTheDocument();
});
```

If there is already a signed-in-user mock setup in `Map.test.tsx`, add a third test that sets `useAuthStore` to a signed-in user and asserts the prompt is absent.

- [x] **Step 6: Run the Map tests and verify they fail**

Run:

```bash
npm test -- src/pages/Map.test.tsx
```

Expected: failure because `publishHint` is not rendered yet.

- [x] **Step 7: Implement the Map prompt**

In `src/pages/Map.tsx`, derive the prompt state:

```tsx
const shouldShowPublishLoginHint = (
  searchParams.get('publishHint') === '1' &&
  Boolean(selectedItem) &&
  !isPublicMapMode &&
  !user
);
```

Add copy near the existing `publishCopy` or map copy:

```tsx
const publishLoginHintCopy = {
  title: language === 'zh' ? '想讓大家也看到這隻貓？' : 'Want everyone to find this cat?',
  body: language === 'zh'
    ? '登入後可以公開到全世界地圖，也能之後修改或撤回。'
    : 'Sign in to publish it to the world map, and edit or remove it later.',
  action: language === 'zh' ? '用 Email 備份並公開' : 'Back up with email',
};
```

Render it directly under the selected local cat card actions, not as a separate success page:

```tsx
{shouldShowPublishLoginHint ? (
  <div className="mt-3 rounded-[18px] border border-[#fffdf2]/75 bg-[#fffdf2]/72 px-3 py-3 shadow-[0_12px_30px_rgba(33,25,21,0.14)] backdrop-blur-md">
    <p className="text-xs font-black text-[#221915]">{publishLoginHintCopy.title}</p>
    <p className="mt-1 text-[11px] font-bold leading-snug text-[#5f5148]">{publishLoginHintCopy.body}</p>
    <CloudBackupPrompt language={language} items={items} />
  </div>
) : null}
```

If embedding `CloudBackupPrompt` creates too much visual weight inside the map card, render a compact button that opens the same cloud panel only after adding a `variant="compact"` prop to `CloudBackupPrompt` in a later task. For Task 1, prefer minimal text-only prompt if the existing component is too large.

- [x] **Step 8: Run focused tests**

Run:

```bash
npm test -- src/pages/Create.test.tsx src/pages/Map.test.tsx
```

Expected: both test files pass.

- [x] **Step 9: Run broader verification**

Run:

```bash
npm test -- src/pages/Home.test.tsx src/components/catdex/CatActionNav.test.tsx src/components/cloud/CloudBackupPrompt.test.tsx src/App.test.tsx
npm run lint
npm run check
npm run build
```

Expected: all commands pass. Build may keep the existing chunk-size warning.

- [x] **Step 10: Commit**

```bash
git add src/pages/Create.tsx src/pages/Create.test.tsx src/pages/Map.tsx src/pages/Map.test.tsx
git commit -m "Open new cats directly on map"
```

Verified on 2026-06-17:

```bash
npm test -- src/pages/Create.test.tsx
npm test -- src/pages/Map.test.tsx
npm test -- src/pages/Create.test.tsx src/pages/Map.test.tsx
npm test -- src/pages/Home.test.tsx src/components/catdex/CatActionNav.test.tsx src/components/cloud/CloudBackupPrompt.test.tsx src/App.test.tsx
npm run lint
npm run check
npm run build
```

`npm run build` passed with the existing chunk-size warning.

---

### Task 2: Global Swipe Homepage Feed

**Files:**
- Modify: `src/pages/Home.tsx`
- Modify: `src/pages/Home.test.tsx`
- Modify: `src/components/catdex/CatCardDeck.tsx`
- Test: `src/components/catdex/CatCardDeck.test.tsx` if present, otherwise create focused tests near existing deck tests.

- [ ] **Step 1: Add tests for global public cats as the default home deck**

Home should load public cat cards and feed them into the deck by default. If public loading fails or is unconfigured, it should fall back to local cats without blocking the page.

- [ ] **Step 2: Add right-swipe save / left-swipe next behavior to the card deck**

Right swipe saves the public cat to local collection or favorites. Left swipe only advances to the next cat. Do not render permanent "like/dislike" buttons.

- [ ] **Step 3: Add first-use gesture education**

Show a one-time overlay explaining left swipe next and right swipe collect. Store dismissal locally so it does not keep appearing.

---

### Task 3: My Cat Cards By Place

**Files:**
- Modify or create: `src/pages/MyCatCards.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/catdex/CatActionNav.tsx`
- Tests: matching page/nav tests.

- [ ] **Step 1: Change bottom-left nav to My Cat Cards**

Left nav should no longer open the public map. It should open a page that groups saved cats.

- [ ] **Step 2: Group local and collected cats by country/city when available**

Use existing `location` data first. If country is unavailable, group by city/place name or "Unknown place".

---

### Task 4: Map Mode Polish

**Files:**
- Modify: `src/pages/Map.tsx`
- Modify: `src/pages/Map.test.tsx`

- [ ] **Step 1: Make map mode copy match the new model**

Use "我的地圖" and "全世界地圖" consistently, while preserving English labels.

- [ ] **Step 2: Keep public/private map mode switch in the map page only**

The bottom nav right button opens `/map`; the internal segmented control handles mine/world mode.

---

## Self-Review

- Spec coverage: Task 1 covers the confirmed V7 post-create map flow and login prompt. Tasks 2-4 cover the global swipe homepage, bottom nav model, and map mode model.
- Placeholder scan: Later tasks are intentionally high-level because they should receive dedicated design/test detail after Task 1 lands. Task 1 contains exact file targets, test code, implementation direction, and verification commands.
- Type consistency: `publishHint=1`, `cat=<id>`, and existing `focusedCatId` are used consistently. No new storage schema is required for Task 1.
