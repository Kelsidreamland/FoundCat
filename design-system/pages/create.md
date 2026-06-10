# Create Page Design Rules

Create is not a generic upload page. It is the moment of turning a street cat encounter into a collectible entry.

## Entry Screen

Use the same visual language as Home:

- postcard header;
- blue accent strip or blue shadow;
- framed photo/sticker motif;
- two clear capture choices:
  - `拍下這隻貓`
  - `從相簿選貓照`

The camera action is primary. Album is secondary but visually equal enough to be discoverable.

## Photo Processing Flow

The flow should feel like creating a sticker:

1. Select/take photo.
2. Crop if needed.
3. Generate preview.
4. AI cutout attempts to create the sticker layer.
5. If cutout fails, keep a framed photo sticker fallback.
6. Confirm into Catdex.
7. Continue to cat tags and optional location.

## Loading And Failure

- Show clear progress for AI cutout and model download.
- Do not leave the UI frozen.
- Failure copy should be calm and useful:
  - AI cutout unavailable.
  - Fallback sticker is ready.
  - User can still save.

## Controls

- Use labeled inputs.
- Maintain current camera and album accessibility labels.
- Do not use vague labels like `Upload` or `Record`.
- Buttons must be at least 44px high.
- Entry content should live in a scrollable `main` region with bottom safe-area padding:
  `pb-[calc(5rem+env(safe-area-inset-bottom))]`.
- Crop and preview confirmation controls should use branded bottom sheets with safe-area padding, not generic black/white tool bars.
- Primary save/crop actions use `corner.blue`; secondary actions use off-white paper with ink borders.

## Post-save Next Step

After a cat card is saved and a location is picked, stay in the Create flow and show a compact success panel instead of jumping away automatically.

- Title: `已存到貓咪地圖` / `Saved to Cat Map`.
- Keep the shared moodboard header and postcard paper surface.
- Show a small square thumbnail, the selected place name, and a friendly fallback cat name.
- Primary action: view this exact cat on the map (`/map?cat=<id>`).
- Secondary actions: share the single-cat poster and add another cat.
- Keep the panel centered inside the scrollable main region with bottom safe-area padding, so all actions remain reachable on mobile.

## Avoid

- Generic white glass upload card.
- Black utility tool bars that look unrelated to the FOUND CAT brand.
- Tool-like text that feels inherited from Daily Scrapbook.
- Over-explaining AI in visible UI.
- Auto-navigating users away before they can decide whether to view, share, or continue capturing.
