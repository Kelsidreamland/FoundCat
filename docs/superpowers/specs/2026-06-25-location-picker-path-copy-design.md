# Location Picker Path Copy Design

## Goal

Make the add-cat location step easier to understand on first use by clarifying the three supported location input paths.

## Scope

Only update the `LocationPicker` interface copy and lightweight state presentation:

- Paste Google Maps.
- Search shop name or address.
- Tap the map to place a pin.

Do not change:

- Coordinate parsing rules.
- Search providers.
- Map marker storage.
- Create flow navigation.
- Public/private map behavior.

## Design

The picker should read like a compact decision surface instead of a generic form:

- Keep the existing three chips, but make them action-oriented and easy to scan.
- Show one short helper line below the input that changes with the current state.
- For full Google Maps links with coordinates, tell users they can confirm immediately.
- For unsupported short links, keep the existing warning but make the route forward clear.
- For typed/search text, remind users they can search or tap the map.
- For no-result search states, say that keeping the text and tapping the map is acceptable.

## Verification

- `npm test -- src/components/LocationPicker.test.tsx`
- `npm test`
- `npm run check`
- `npm run build`
- `npm run check:cloud`
