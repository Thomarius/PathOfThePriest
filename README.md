# Path of the Priest — Fan Card Generator

Generates print-ready card images for a fan re-theme of the solo microgame
*The Path of the Priest*.

- **`NEXT-STEPS.md`** — open decisions, remaining work, and exactly which files
  to create where once the setting and language are chosen. **Start here.**
- **`CLAUDE.md`** — architecture, print geometry, and the reasoning behind past
  decisions.

Mechanics come verbatim from `RulesSummary.txt` and never change. Only naming,
artwork, language and visual design are re-themed.

## Usage

```sh
npm install                 # playwright
npx playwright install chromium

npm run validate            # structural checks on the data layers
npm run validate -- --deep  # ...plus live layout checks (overflow, safe zone)
npm run preview             # out/preview/index.html — design review in a browser
npm run build               # out/cards/*.png (816x1110) + print PDF + proof sheet
npm run stress              # preview with text inflated, to test German fit
npm run model               # dump the merged render model
npm run fonts               # re-vendor the OFL font files
```

All commands accept `--theme <name>`, `--locale <code>` and `--profile <name>`:

```sh
node src/build.js build --profile drivethru --locale en
```

The preview page has a zoom control, a trim/safe-zone guide overlay, and reports
how full each card's text box is in spare lines — the number that predicts
whether German will still fit.

## How it fits together

Three independent data layers are merged into one render model:

| Layer | Path | Changes when |
|---|---|---|
| Mechanics | `data/` | never — fixed by the rules |
| Theme | `themes/<name>/` | you pick a topic: names, faction labels, art, palette |
| Wording | `locales/<code>.json` | you add a language |
| Print geometry | `config/print-profiles.json` | you switch print service |

Locale files contain no card or faction names; they reference them through
`{card:<id>}` and `{faction:<id>.<form>}` tokens resolved from the active theme.
This is what lets a card be renamed without breaking the text printed on other
cards — Discord and Envy both name Grudge.

`themes/placeholder/` is a neutral stand-in so the pipeline can be built and
reviewed before the real topic is chosen.

Fonts are committed under `assets/fonts` and inlined into the page as data URIs,
so rendering is identical on every machine. `out/cards/manifest.json` records a
SHA-256 per card, so that claim can be checked rather than trusted.

`npm run build` audits the page it is about to print — text overflow, safe-zone
violations, and remaining headroom for translation — and writes nothing if a
card fails. `out/proof-sheet.png` shows the whole deck on one sheet for review.

## Status

M1–M5 and M7 complete: data model, card template, icon glyphs, rendering to
PNG/PDF, layout validation, procedural decor, rules cards and card backs.
A build emits 16 cards + 5 rules cards + 3 backs.

Remaining: **M6 artwork** — sourcing 16 public-domain images. Everything else is
built. The `dungeon` sample theme renders complete decks in German and English.
