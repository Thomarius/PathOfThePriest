# Path of the Priest — Fan Card Generator

Generates print-ready card images for a fan re-theme of the solo microgame
*The Path of the Priest*. See `CLAUDE.md` for the full project plan.

Mechanics come verbatim from `RulesSummary.txt` and never change. Only naming,
artwork, language and visual design are re-themed.

## Usage

```sh
npm install                 # playwright
npx playwright install chromium

npm run validate            # structural checks on the data layers
npm run preview             # out/preview/index.html — design review in a browser
npm run build               # out/cards/*.png (816x1110) + print PDF
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

## Status

M1–M4 complete: data model, card template, icon glyphs, and rendering to PNG/PDF.

Remaining: M5 validation (overflow and safe-zone checks promoted to hard
failures), M6 artwork, M7 rules cards and card backs. The German locale and the
theme's topic are still open — card and faction names are tokens, so the German
effect text can be written before the topic is chosen.
