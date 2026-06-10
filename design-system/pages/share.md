# Share Page Design Rules

Share is a utility page, but it should still feel like a FOUND CAT field-journal surface instead of an export dashboard.

## Structure

- The page shares a cat map, not a generic sticker book.
- Keep the title as `分享我的貓咪地圖` / `Share My Cat Map`.
- Keep `FOUND CAT MAP` as the small artifact label.
- Show collection and mapped-cat counts as quick context.
- Let the user rename the map in one compact field.
- Memo sharing stays opt-in.
- Put the share actions before the detailed cat-selection list because all mapped cats are selected by default.
- Let the user choose which mapped cats are public in a lower advanced-selection module.

## Action Hierarchy

- There is one primary action: generate the cat map poster.
- Direct link copy is secondary and should be easy to paste into chat apps.
- Google My Maps CSV export is tertiary and should feel useful without competing with poster sharing.
- Do not present all three share/export actions with equal visual weight.
- Keep the primary poster action visible before the detailed selection list on a 390px-wide mobile viewport.
- Keep advanced controls collapsed by default:
  - public-cat selection;
  - memo sharing;
  - Google My Maps CSV export.
- The default first-screen flow should feel like `name map -> generate poster -> copy link`, not like a data export dashboard.

## Mobile Layout

- The page must use a scrollable main area with bottom padding for the floating nav:
  `pb-[calc(6.75rem+env(safe-area-inset-bottom))]`.
- Avoid shrinking the available viewport with a bottom margin on `main`.
- Primary actions must remain reachable without being covered by the bottom nav.
- Secondary actions can use a compact two-column grid when labels remain readable.

## Visual Treatment

- Use off-white paper surfaces, ink borders, controlled blue accents, and yellow only as a warm supporting highlight.
- Do not add new logo artwork on this page.
- Keep icons consistent with the rest of the app: Lucide or repo-native SVG, no emoji icons.

## Avoid

- Export-dashboard language.
- Three equally heavy full-width buttons.
- Extra explanatory paragraphs below every action.
- Hidden controls that require horizontal scrolling.
