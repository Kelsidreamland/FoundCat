# 轉角遇到貓

`轉角遇到貓` is a mobile-first cat encounter map and sticker archive. It helps people record the neighborhood cats they meet, remember where they saw them, and share privacy-aware cat cards, cat map posters, and exportable map data.

The GitHub repository is `Kelsidreamland/FoundCat`. The product name is `轉角遇到貓`, with `FoundCat` as the English brand name.

## Open-Source Core

The open-source core is a local-first React/TypeScript PWA. Cat photos, names, notes, and location clues are kept on the user's device by default. Sharing flows generate explicit public artifacts, such as single-cat cards, selected cat map links, posters, and CSV exports.

Future hosted services, such as cloud sync, public shared maps, premium AI workflows, storage, moderation, and subscription features, may be developed separately while keeping the local-first core useful and inspectable as open source.

## What It Does

- Capture a cat encounter from the camera or photo library
- Save cat cards with names, notes, colors, breeds, mood, and location
- Browse a personal catdex of saved encounters
- View saved cats on an interactive MapLibre cat map
- Group multiple cats seen at the same spot
- Share a single-cat card or a selected public cat map
- Generate cat map posters and export map data as CSV
- Run as a mobile-friendly PWA

## Product Direction

`轉角遇到貓` treats a cat encounter as the emotional center, not just as a map pin. The interface is designed like a street-corner postcard and field journal: warm, tactile, bilingual, and useful on a phone.

The product direction is documented in:

- `design-system/MASTER.md`
- `design-system/pages/`
- `docs/product/`

## Tech Stack

- React
- TypeScript
- Vite
- Zustand
- MapLibre GL
- Tailwind CSS
- Vitest
- Testing Library
- PWA support via `vite-plugin-pwa`

## Local Development

```bash
npm install
npm run dev
```

No map API key is required for the current MapLibre + OpenFreeMap setup.

## Verification

```bash
npm run test
npm run check
npm run build
```

## Project Status

`轉角遇到貓` is an active prototype. The current focus is improving the shared cat map foundation, public/private data boundaries, mobile polish, documentation, and test coverage.

## Why Open Source

The project is intentionally small and inspectable. It is a practical example of a privacy-aware, local-first, emotionally specific consumer app. The repo includes product notes, tests, and design-system documentation so other builders can study how a playful map app is structured and maintained.

## License And Commercial Boundary

The software code in this repository is released under the MIT License.

The `FoundCat` / `轉角遇到貓` brand name, logos, visual identity assets, hosted services, future paid features, and commercial operations are not automatically granted under the software license and may have separate terms.
