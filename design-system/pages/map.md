# Map Page Design Rules

Map is useful, but it is not the brand center. It should answer where cats were met without overpowering the cat archive.

## Structure

- Keep the map functional and readable.
- Surround the map with the same postcard/street-corner visual language.
- Pins should use the brand blue and ring halo.
- Cat preview cards should show the cat first, then location.

## Search And Location

When adding or editing a location:

- Search suggestions should appear before forcing manual zoom.
- Use Photon for instant suggestions so typing remains responsive.
- Use Nominatim only after an explicit confirm action for broader address/local-language resolution; do not use the public Nominatim API as client-side autocomplete.
- Do not bias search results with the default Hong Kong map center. Use a search center only after there is reliable context: existing saved location, browser geolocation, manual map interaction, or a selected suggestion.
- When instant suggestions miss a local-language place or full address, show an explicit full-address search action so the broader lookup is discoverable before the user has to move the map manually.
- Manual pin placement remains available.
- Location name should be easy to edit.
- Copy should use `遇見地點` or `街角線索`.

## Visual Weight

- On Home, map is a small clue.
- On Map page, map can fill the main area but should still use branded pins and cat previews.

## Cat Detail Sheet

- Treat the tapped-cat card as a mobile bottom sheet, not a full modal.
- Keep it phone-width (`max-w-sm`) even on desktop so the card does not become a wide banner.
- Reserve room for the brand header: sheet max height should be based on available dynamic viewport height, not a fixed percentage that can crush the content on short screens.
- Show the cat photo first with a tall frame so square uploads do not feel aggressively cropped.
- Show cat number, custom cat name or place name, and collected date before secondary notes.
- Do not show raw latitude/longitude or full address in the card body.
- Keep navigation to Google Maps prominent, with edit location and extra encounter notes as secondary actions.
- Do not scatter editing fields across the tapped-cat card. The card should summarize what is known.
- `補充貓咪資訊` opens a separate phone-width bottom sheet for:
  - custom cat card name;
  - spot memo / street-corner clue;
  - personality tags;
  - care status tags.
- After saving cat info, close the editor and return to the tapped-cat card with the updated name, memo, and tag chips visible.
- Cat names and short profile headings use `FoundCat Round`; card numbers use `FoundCat Number`. Addresses, notes, and action copy remain in the body font.

## Avoid

- Google Maps visual dependency.
- Pet store emphasis unless explicitly relevant.
- Treating the map as the main reason to use the app.
- Inline forms that make the map detail card feel like a settings page.
