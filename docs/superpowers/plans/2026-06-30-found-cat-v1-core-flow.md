# FOUND CAT V1 Core Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the V1 core flow from `docs/superpowers/specs/2026-06-29-found-cat-v1-core-flow-design.md`: lightweight world-card browsing, tap-to-profile, smooth saving, separated My Cat Cards collections, world-map finding, and publish/login prompts.

**Architecture:** Keep the existing local-first store and public cloud loading flow. Add small focused helpers/components rather than expanding existing large pages. Public world cats need an explicit public encounter-clue contract because current public views intentionally omit `spot_note`.

**Tech Stack:** React, TypeScript, Zustand, idb-keyval, Supabase, MapLibre, Framer Motion, Vitest, Testing Library, Tailwind.

---

## File Structure And Boundaries

Likely files to modify:

- `src/lib/catInfoDisplay.ts`: copy change from `喜歡出沒`/`出沒線索` to `偶遇線索`, CTA copy `去找這隻喵`.
- `src/lib/locationDisplay.ts`: navigation CTA copy and tests.
- `src/lib/catdexDeck.ts`: keep numbering helpers; may add lightweight card display helpers if needed.
- `src/components/catdex/CatCardDeck.tsx`: make card lighter, add card tap callback, stop showing encounter/date noise on Home card.
- `src/components/catdex/CatCardDeck.test.tsx`: deck card display, tap behavior, swipe save behavior.
- `src/components/catdex/WorldCatProfileSheet.tsx`: bottom profile sheet for tapping a Home world cat. Keep `CollectedCatProfileSheet.tsx` only for collection-success guidance until a later cleanup proves it can be removed.
- `src/components/catdex/WorldCatProfileSheet.test.tsx`: profile fields, empty state, save/find actions.
- `src/pages/Home.tsx`: separate tap profile from left-swipe save, first-save guidance, contribution prompt.
- `src/pages/Home.test.tsx`: world deck behavior, first-save guidance, profile sheet behavior, contribution prompt.
- `src/pages/Catdex.tsx`: tab labels and saved-world private note entry point.
- `src/pages/Catdex.test.tsx`: separated tabs, W-number behavior, private note display/edit.
- `src/pages/Detail.tsx` and `src/pages/Detail.test.tsx`: private note editor for saved world cats if detail page is the editing surface.
- `src/pages/Map.tsx` and `src/pages/Map.test.tsx`: `世界地圖` default, no GPS on open, world-map find links, world-vs-my edit rules, publish prompt copy.
- `src/store/useScrapbookStore.ts` and `src/store/useScrapbookStore.test.ts`: add optional `privateNote` for saved world cats.
- `src/lib/cloudCatCards.ts`, `src/lib/cloudBackup.ts`, `src/lib/cloudRestore.ts`, `src/lib/cloudPublicCats.ts`: cloud contract for `private_note` and public `spot_note`/`encounter_clue`.
- `supabase/found-cat-schema.sql` and `supabase/migrations/*.sql`: schema/view migration for private notes and public encounter clues.
- `src/lib/cloudSchema.test.ts`, `src/lib/cloudCatCards.test.ts`, `src/lib/cloudPublicCats.test.ts`, `src/lib/cloudBackup.test.ts`, `src/lib/cloudRestore.test.ts`: cloud contract tests.

Files that should not be changed unless a test proves it is necessary:

- brand logo assets
- existing share poster generation
- unrelated PWA install/update UI

---

## Task 1: Copy And Display Contract

**Files:**
- Modify: `src/lib/catInfoDisplay.ts`
- Modify: `src/lib/locationDisplay.ts`
- Modify: `src/components/catdex/CatProfileSummary.tsx`
- Test: `src/lib/locationDisplay.test.ts`
- Test: `src/components/catdex/CatProfileSummary.test.tsx`
- Search/update affected assertions in: `src/pages/Detail.test.tsx`, `src/pages/Map.test.tsx`, `src/components/catdex/CatCardDeck.test.tsx`

- [ ] **Step 1: Write failing copy tests**

Add assertions that:

```ts
expect(getFindCatCta('zh')).toBe('去找這隻喵');
expect(getReadableLocationName(makeItem('https://maps.app.goo.gl/abc123'), 'zh')).toBe('去找這隻喵');
```

In `CatProfileSummary.test.tsx`, add a cat with `spotNote: '早上在咖啡店門口'` and assert:

```ts
expect(screen.getByText('偶遇線索')).toBeInTheDocument();
expect(screen.queryByText('喜歡出沒')).not.toBeInTheDocument();
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
npm test -- src/lib/locationDisplay.test.ts src/components/catdex/CatProfileSummary.test.tsx
```

Expected: FAIL because current copy still says `去找這隻貓` and `喜歡出沒`.

- [ ] **Step 3: Implement minimal copy changes**

Change:

- `getFindCatCta('zh')` to `去找這隻喵`
- unreadable location fallback in `getReadableLocationName('zh')` to `去找這隻喵`
- `getCatInfoCopy(language).spotNote` and `.spotHeading` Chinese copy to `偶遇線索`
- `getCatProfileCopy(language).spot` Chinese copy to `偶遇線索`
- remove or ignore `catTalkLabel` if no code uses it

Do not change English copy unless tests require it.

- [ ] **Step 4: Run focused tests**

Run:

```bash
npm test -- src/lib/locationDisplay.test.ts src/components/catdex/CatProfileSummary.test.tsx src/pages/Detail.test.tsx src/pages/Map.test.tsx src/components/catdex/CatCardDeck.test.tsx
```

Expected: PASS after updating affected assertions from old copy.

- [ ] **Step 5: Commit**

```bash
git add src/lib/catInfoDisplay.ts src/lib/locationDisplay.ts src/components/catdex/CatProfileSummary.tsx src/lib/locationDisplay.test.ts src/components/catdex/CatProfileSummary.test.tsx src/pages/Detail.test.tsx src/pages/Map.test.tsx src/components/catdex/CatCardDeck.test.tsx
git commit -m "Update cat finding and clue copy"
```

---

## Task 2: Public Encounter Clue And Private Note Data Contract

**Files:**
- Modify: `src/store/useScrapbookStore.ts`
- Modify: `src/lib/cloudCatCards.ts`
- Modify: `src/lib/cloudPublicCats.ts`
- Modify: `src/lib/cloudRestore.ts`
- Modify: `supabase/found-cat-schema.sql`
- Create: `supabase/migrations/20260630090000_public_encounter_clue_and_private_note.sql`
- Test: `src/store/useScrapbookStore.test.ts`
- Test: `src/lib/cloudCatCards.test.ts`
- Test: `src/lib/cloudPublicCats.test.ts`
- Test: `src/lib/cloudBackup.test.ts`
- Test: `src/lib/cloudRestore.test.ts`
- Test: `src/lib/cloudSchema.test.ts`

**Decision locked by spec:** Public world cards need `偶遇線索`; saved world cats need private notes. Current public view omits `spot_note`, so V1 must expose a public encounter clue. Use existing `spot_note` as the public encounter clue for published cats. Add a separate `private_note` field for user-only saved-world-cat notes.

- [ ] **Step 1: Write failing store test**

In `useScrapbookStore.test.ts`, add a test that saves a world cat with `privateNote: '下次去清邁想找牠'` and verifies:

```ts
expect(savedWorldCat.privateNote).toBe('下次去清邁想找牠');
expect(savedWorldCat.catdexNumber).toBeUndefined();
expect(savedWorldCat.publicNumber).toBe(88);
```

- [ ] **Step 2: Write failing cloud contract tests**

Add tests that assert:

```ts
expect(toCloudCatCardUpsert(item, 'owner-1')).toMatchObject({
  spot_note: '早上 8-10 點在星巴克門口',
  private_note: '下次去清邁想找牠',
});
```

Add public-row mapping test in `cloudPublicCats.test.ts` where the view row includes:

```ts
spot_note: '早上 8-10 點在星巴克門口'
```

and expects the returned `ScrapbookItem` to contain:

```ts
spotNote: '早上 8-10 點在星巴克門口'
```

Add schema tests that public view includes `spot_note` but not `private_note`.

- [ ] **Step 3: Run failing contract tests**

Run:

```bash
npm test -- src/store/useScrapbookStore.test.ts src/lib/cloudCatCards.test.ts src/lib/cloudPublicCats.test.ts src/lib/cloudBackup.test.ts src/lib/cloudRestore.test.ts src/lib/cloudSchema.test.ts
```

Expected: FAIL because `privateNote` is not typed/mapped and public view does not expose `spot_note`.

- [ ] **Step 4: Implement type and cloud mappings**

In `ScrapbookItem`, add:

```ts
privateNote?: string;
```

In `CloudCatCardRow`, add:

```ts
private_note: string | null;
```

In `PublicCloudCatCard` and `PublicCatCardViewRow`, add:

```ts
spotNote: string | null; // camel-case public type
spot_note: string | null; // row type
```

Map:

- local `privateNote` -> cloud `private_note`
- cloud restore `private_note` -> local `privateNote`
- public view `spot_note` -> local `spotNote`

Update fallback optional-column handling so older production schema can still back up without `private_note` if needed.

- [ ] **Step 5: Implement Supabase schema and migration**

Migration should:

```sql
alter table public.cat_cards
add column if not exists private_note text;

create or replace view public.public_cat_cards as
select
  id,
  catdex_number,
  public_number,
  cat_name,
  cat_feature_note,
  image_data,
  hero_image_data,
  encountered_at,
  location_name,
  location_map_url,
  lat,
  lng,
  personality_tags,
  care_status_tags,
  spot_note,
  created_at
from public.cat_cards
where is_public = true
  and lat is not null
  and lng is not null;
```

`private_note` must not appear in `public.public_cat_cards`.

Update `supabase/found-cat-schema.sql` to match the final schema.

- [ ] **Step 6: Run contract tests**

Run:

```bash
npm test -- src/store/useScrapbookStore.test.ts src/lib/cloudCatCards.test.ts src/lib/cloudPublicCats.test.ts src/lib/cloudBackup.test.ts src/lib/cloudRestore.test.ts src/lib/cloudSchema.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/store/useScrapbookStore.ts src/store/useScrapbookStore.test.ts src/lib/cloudCatCards.ts src/lib/cloudCatCards.test.ts src/lib/cloudPublicCats.ts src/lib/cloudPublicCats.test.ts src/lib/cloudBackup.test.ts src/lib/cloudRestore.ts src/lib/cloudRestore.test.ts src/lib/cloudSchema.test.ts supabase/found-cat-schema.sql supabase/migrations/20260630090000_public_encounter_clue_and_private_note.sql
git commit -m "Add public encounter clues and private notes"
```

---

## Task 3: Lightweight Home Card And Tap-To-Profile

**Files:**
- Modify: `src/components/catdex/CatCardDeck.tsx`
- Modify: `src/pages/Home.tsx`
- Create or replace: `src/components/catdex/WorldCatProfileSheet.tsx`
- Test: `src/components/catdex/CatCardDeck.test.tsx`
- Test: `src/pages/Home.test.tsx`
- Test: `src/components/catdex/WorldCatProfileSheet.test.tsx`

- [ ] **Step 1: Write failing deck display tests**

In `CatCardDeck.test.tsx`, add a public card with:

```ts
catName: '窗邊小虎',
publicNumber: 12,
location: { lat: 18.78, lng: 98.98, name: '泰國 清邁' },
spotNote: '早上 8-10 點在星巴克門口',
personalityTags: ['friendly', 'foodie'],
careStatusTags: ['fed'],
```

Assert Home card shows:

```ts
expect(screen.getByText('窗邊小虎')).toBeInTheDocument();
expect(screen.getByText('W-012')).toBeInTheDocument();
expect(screen.getByText('泰國 清邁')).toBeInTheDocument();
expect(screen.getByText('親人')).toBeInTheDocument();
expect(screen.getByText('貪吃')).toBeInTheDocument();
```

Assert it does not show:

```ts
expect(screen.queryByText('早上 8-10 點在星巴克門口')).not.toBeInTheDocument();
expect(screen.queryByText(/6月|Jun|2026/)).not.toBeInTheDocument();
```

- [ ] **Step 2: Write failing tap callback test**

Add `onOpenCard` prop to test expectations:

```tsx
const onOpenCard = vi.fn();
render(<CatCardDeck ... onOpenCard={onOpenCard} />);
await user.click(screen.getByTestId('active-cat-card'));
expect(onOpenCard).toHaveBeenCalledWith(expect.objectContaining({ id: 'cat-1' }));
```

Clicking the share button must still call `onShareCard` and must not call `onOpenCard`.

- [ ] **Step 3: Run failing deck tests**

Run:

```bash
npm test -- src/components/catdex/CatCardDeck.test.tsx
```

Expected: FAIL because card still shows date/share-oriented layout and has no `onOpenCard`.

- [ ] **Step 4: Implement lightweight card**

Update `CatCardDeckProps`:

```ts
onOpenCard?: (item: ScrapbookItem) => void;
```

Render only:

- photo
- cat name or fallback from `suggestCatName(item, language)`
- `formatCatCardNumberForItem(active)`
- readable city/region
- up to two labels from `getPersonalityLabels(active.personalityTags, language)`

Remove date display from the active card. Keep share button unless the design requires moving it later.

Use `onClick` on the article or a full-card button layer, but prevent the share button click from bubbling:

```ts
onClick={(event) => {
  event.stopPropagation();
  onShareCard(active);
}}
```

- [ ] **Step 5: Create `WorldCatProfileSheet` tests**

Test the sheet shows:

- name
- city/region
- `W-012`
- `牠給人的感覺`
- `特徵`
- `偶遇線索`
- care tags
- `去找這隻喵`
- `收藏`

Test sparse data shows only:

```ts
expect(screen.getByText('這隻貓還很神秘')).toBeInTheDocument();
expect(screen.queryByText('牠給人的感覺')).not.toBeInTheDocument();
expect(screen.queryByText('偶遇線索')).not.toBeInTheDocument();
```

- [ ] **Step 6: Implement `WorldCatProfileSheet`**

Use a bottom sheet over the Home deck. It should accept:

```ts
interface WorldCatProfileSheetProps {
  item: ScrapbookItem | null;
  language: 'zh' | 'en';
  isSaved: boolean;
  onClose: () => void;
  onSave: (item: ScrapbookItem) => void;
  onFind: (item: ScrapbookItem) => void;
}
```

Do not use `getCatSpeech`. Do not show breed/color. Empty optional info uses `這隻貓還很神秘`.

- [ ] **Step 7: Wire Home tap-to-profile**

In `Home.tsx`:

- add `profileSheetItem` state
- pass `onOpenCard={setProfileSheetItem}` to `CatCardDeck`
- render `WorldCatProfileSheet`
- `onFind` navigates to `/map?mode=public&cat=<id>`
- `onSave` uses the same collect helper as left swipe, but does not close the sheet

- [ ] **Step 8: Run focused tests**

Run:

```bash
npm test -- src/components/catdex/CatCardDeck.test.tsx src/components/catdex/WorldCatProfileSheet.test.tsx src/pages/Home.test.tsx
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/components/catdex/CatCardDeck.tsx src/components/catdex/CatCardDeck.test.tsx src/components/catdex/WorldCatProfileSheet.tsx src/components/catdex/WorldCatProfileSheet.test.tsx src/pages/Home.tsx src/pages/Home.test.tsx
git commit -m "Add lightweight world cat profile sheet"
```

---

## Task 4: Save Guidance And Contribution Prompt

**Files:**
- Modify: `src/pages/Home.tsx`
- Test: `src/pages/Home.test.tsx`

- [ ] **Step 1: Write failing first-save guidance test**

In `Home.test.tsx`, simulate collecting a public cat and assert:

```ts
expect(screen.getByText('已收藏到我的貓卡')).toBeInTheDocument();
expect(screen.getByRole('button', { name: '去找這隻喵' })).toBeInTheDocument();
```

Clicking `去找這隻喵` should navigate to:

```ts
/map?mode=public&cat=public-cat-1
```

Use the existing MemoryRouter route assertions pattern, or expose a test route that prints `location.pathname + location.search`.

- [ ] **Step 2: Write failing later-save lightweight test**

Seed localStorage:

```ts
window.localStorage.setItem('found-cat-first-world-save-guidance-seen', 'true');
```

Collect a public cat and assert the big guidance button is absent, while `已收藏` status appears briefly.

- [ ] **Step 3: Write failing third-save prompt test**

Start with two saved world cats in local state, collect the third, and assert:

```ts
expect(screen.getByText('你已收藏 3 隻世界貓，要不要也分享一隻你遇到的貓？')).toBeInTheDocument();
expect(screen.getByRole('link', { name: '我也遇到貓貓了！' })).toHaveAttribute('href', '/create');
```

Persist with storage key:

```ts
found-cat-world-save-contribution-prompt-seen
```

- [ ] **Step 4: Run failing Home tests**

Run:

```bash
npm test -- src/pages/Home.test.tsx
```

Expected: FAIL because guidance/prompt layers are not implemented.

- [ ] **Step 5: Implement guidance layers**

In `Home.tsx`, add:

- first-save guidance state
- contribution prompt state
- localStorage helpers with try/catch
- `goFindWorldCat(item)` helper using navigate to `/map?mode=public&cat=${encodeURIComponent(item.collectedFromPublicId ?? item.id)}`

Important: left-swipe save must not open the full profile sheet.

- [ ] **Step 6: Run Home tests**

Run:

```bash
npm test -- src/pages/Home.test.tsx src/components/catdex/CatCardDeck.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/pages/Home.tsx src/pages/Home.test.tsx src/components/catdex/CatCardDeck.test.tsx
git commit -m "Add world cat save guidance"
```

---

## Task 5: My Cat Cards Labels, Saved Notes, And W-Number Separation

**Files:**
- Modify: `src/pages/Catdex.tsx`
- Modify: `src/pages/Detail.tsx`
- Test: `src/pages/Catdex.test.tsx`
- Test: `src/pages/Detail.test.tsx`

- [ ] **Step 1: Write failing Catdex label tests**

Update expectations to use:

- `我遇到的貓`
- `我收藏的貓`

Assert saved world cats show `W-088` and do not show private `No.` labels.

- [ ] **Step 2: Write failing private note display/edit test**

For a saved world cat detail page:

```ts
collectedFromPublicId: 'public-cat-88',
publicNumber: 88,
privateNote: '下次去清邁想找牠',
```

Assert:

```ts
expect(screen.getByText('我的備註')).toBeInTheDocument();
expect(screen.getByText('下次去清邁想找牠')).toBeInTheDocument();
```

Click edit, change text, save, and assert `useScrapbookStore.getState().items[0].privateNote` updated.

- [ ] **Step 3: Run failing Catdex/Detail tests**

Run:

```bash
npm test -- src/pages/Catdex.test.tsx src/pages/Detail.test.tsx
```

Expected: FAIL because current labels are `我拍到的貓` / `收藏的世界貓卡`, and private notes do not exist in UI.

- [ ] **Step 4: Implement labels**

In `Catdex.tsx`, change:

- `我拍到的貓` -> `我遇到的貓`
- `收藏的世界貓卡` -> `我收藏的貓`

Keep existing two-tab behavior and W-number preservation.

- [ ] **Step 5: Implement saved-world private note editor**

In `Detail.tsx`, for `item.collectedFromPublicId`:

- show `我的備註`
- allow editing `privateNote`
- do not expose original-public-data editing controls if the existing page currently permits them for saved world cats
- keep `去找這隻喵` CTA

Keep private note local-first via `updateItem(item.id, { privateNote })`.

- [ ] **Step 6: Run focused tests**

Run:

```bash
npm test -- src/pages/Catdex.test.tsx src/pages/Detail.test.tsx src/store/useScrapbookStore.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/pages/Catdex.tsx src/pages/Catdex.test.tsx src/pages/Detail.tsx src/pages/Detail.test.tsx src/store/useScrapbookStore.test.ts
git commit -m "Separate saved world cats and private notes"
```

---

## Task 6: World Map Default, Find Links, And Edit Rules

**Files:**
- Modify: `src/pages/Map.tsx`
- Test: `src/pages/Map.test.tsx`

- [ ] **Step 1: Write failing default-world-map test**

Render `<Map />` without query params and assert:

```ts
expect(await screen.findByRole('button', { name: '世界地圖' })).toHaveAttribute('aria-pressed', 'true');
expect(loadPublicCatCards).toHaveBeenCalledTimes(1);
```

Assert geolocation was not called.

- [ ] **Step 2: Write failing find-link focused-card test**

Render with:

```ts
<MemoryRouter initialEntries={['/map?mode=public&cat=public-cat-1']}>
```

Assert map opens the public card and shows:

```ts
expect(screen.getByRole('heading', { name: '曼谷小橘' })).toBeInTheDocument();
expect(screen.getByText('偶遇線索')).toBeInTheDocument();
expect(screen.getByRole('link', { name: '去找這隻喵' })).toBeInTheDocument();
```

- [ ] **Step 3: Write failing world edit-rule test**

For a public map cat:

```ts
expect(screen.queryByRole('button', { name: '編輯地點' })).not.toBeInTheDocument();
expect(screen.queryByRole('button', { name: '補充貓咪資訊' })).not.toBeInTheDocument();
expect(screen.getByRole('button', { name: '收藏' })).toBeInTheDocument();
```

- [ ] **Step 4: Run failing Map tests**

Run:

```bash
npm test -- src/pages/Map.test.tsx
```

Expected: FAIL where current defaults/copy/actions differ.

- [ ] **Step 5: Implement map behavior**

In `Map.tsx`:

- default `initialMapMode` to `public` when no focused local cat asks for mine
- keep no GPS on initial open
- ensure `focusedCatId` works for public cards after public load completes
- update CTA copy to `去找這隻喵`
- world public selected card can save but cannot edit original location/info
- my map selected card can edit and publish/unpublish

If no save handler exists on public map cards, add one by reusing the Home collection helper pattern.

- [ ] **Step 6: Run Map tests**

Run:

```bash
npm test -- src/pages/Map.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/pages/Map.tsx src/pages/Map.test.tsx
git commit -m "Default map to world cat finding"
```

---

## Task 7: Publish Prompt And Login Gate Copy

**Files:**
- Modify: `src/pages/Map.tsx`
- Modify: `src/pages/Create.tsx` only if post-create handoff needs query/state adjustment
- Test: `src/pages/Map.test.tsx`
- Test: `src/pages/Create.test.tsx` only if `Create.tsx` changes

- [ ] **Step 1: Write failing publish prompt tests**

For a newly added local cat opened on My Map, assert:

```ts
expect(screen.getByText('讓更多人也遇見牠？')).toBeInTheDocument();
expect(screen.getByRole('button', { name: '公開到世界地圖' })).toBeInTheDocument();
```

When not logged in and clicking publish:

```ts
expect(screen.getByText('登入後才能把這隻貓公開到世界地圖，也能備份你的貓卡。')).toBeInTheDocument();
expect(screen.getByRole('button', { name: '用 Email 登入' })).toBeInTheDocument();
expect(screen.getByRole('button', { name: '稍後再說' })).toBeInTheDocument();
```

- [ ] **Step 2: Write failing publish success test**

Mock successful publish with `publicNumber: 23` and assert:

```ts
expect(screen.getByText('牠已加入世界地圖 W-023')).toBeInTheDocument();
expect(screen.getByText('世界又多了一隻可以被偶遇的貓')).toBeInTheDocument();
```

- [ ] **Step 3: Run failing tests**

Run:

```bash
npm test -- src/pages/Map.test.tsx
```

Expected: FAIL because current publish prompt/success copy differs.

- [ ] **Step 4: Implement publish prompt copy**

Update publish prompt copy in `Map.tsx`:

- ready title/body to `讓更多人也遇見牠？`
- unauthenticated gate copy to the spec text
- login CTA `用 Email 登入`
- secondary CTA `稍後再說`
- success copy with assigned W-number when available

Do not introduce a first-run login wall.

- [ ] **Step 5: Run focused tests**

Run:

```bash
npm test -- src/pages/Map.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Map.tsx src/pages/Map.test.tsx src/pages/Create.tsx src/pages/Create.test.tsx
git commit -m "Polish publish prompts for world map"
```

If `Create.tsx` did not change, omit it from `git add`.

---

## Task 8: Full Verification And Deployment

**Files:**
- Local-only: `.omx/logs/execution-ledger.md`

- [ ] **Step 1: Run focused suites**

Run:

```bash
npm test -- src/components/catdex/CatCardDeck.test.tsx src/components/catdex/WorldCatProfileSheet.test.tsx src/pages/Home.test.tsx src/pages/Catdex.test.tsx src/pages/Detail.test.tsx src/pages/Map.test.tsx src/store/useScrapbookStore.test.ts src/lib/cloudCatCards.test.ts src/lib/cloudPublicCats.test.ts src/lib/cloudBackup.test.ts src/lib/cloudRestore.test.ts src/lib/cloudSchema.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run full checks**

Run:

```bash
npm run check
npm test
npm run build
npm run check:cloud
```

Expected:

- TypeScript passes.
- Full Vitest suite passes.
- Production build passes. Existing chunk-size warnings are acceptable if unchanged.
- Cloud readiness reports OK.

- [ ] **Step 3: Update OMX ledger**

Append a concise entry to `.omx/logs/execution-ledger.md` with:

- V1 core flow implementation summary
- verification commands
- deployment result after push

- [ ] **Step 4: Push to main**

Run:

```bash
git status --short
git push origin HEAD:main
```

Expected: working tree clean before push; push succeeds.

- [ ] **Step 5: Verify Vercel status**

Run:

```bash
gh api repos/Kelsidreamland/FoundCat/commits/main/status --jq '.sha, .state, (.statuses[]? | [.context,.state,.target_url] | @tsv)'
```

Expected: Vercel status returns `success`.

---

## Spec Coverage Checklist

- Home world deck default: Task 3, Task 4.
- Lightweight Home card: Task 3.
- Tap-to-profile sheet: Task 3.
- `這隻貓還很神秘` empty state: Task 3.
- Save does not interrupt deck: Task 3, Task 4.
- First-save guidance: Task 4.
- Third-save contribution prompt: Task 4.
- My Cat Cards split: Task 5.
- Saved world cats keep W-number: Task 5 and existing store tests.
- Private notes: Task 2, Task 5.
- Map defaults to World Map: Task 6.
- No GPS on initial map open: Task 6.
- `去找這隻喵` to world map selected card: Task 3, Task 4, Task 6.
- Publish/login prompts: Task 7.
- Public author hidden: already in current UI; ensure Task 6/7 do not add author identity.
- V1 non-goals: no tasks add cat replies, AI, social feed, ads, or hard login wall.
