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
npm run build               # out/<theme>-<locale>/*.png (816x1110) + PDF + proof
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
cards — cards 6 and 11 both name card 2.

`themes/dungeon-bright/` is the one theme and the base for any other: a new theme
sets `"extends": "dungeon-bright"` and overrides only what differs, inheriting
fonts, palette, decor, card names and all sixteen motifs. Motifs live in
`src/template/motifs.js`, not in a theme, so every theme can draw on them.

Fonts are committed under `assets/fonts` and inlined into the page as data URIs,
so rendering is identical on every machine. Each deck's `manifest.json` records a
SHA-256 per card, so that claim can be checked rather than trusted.

`npm run build` audits the page it is about to print — text overflow, safe-zone
violations, and remaining headroom for translation — and writes nothing if a
card fails. `out/proof-<theme>-<locale>.png` shows the whole deck on one sheet
for review. Cards, PDF and proof sheet are all named per theme and locale, so
building several themes in turn leaves complete sets side by side.

## Status

The pipeline is complete (M0–M7), as is the art direction tracked in
`NEXT-STEPS.md` as M8, M9, M11 and M12, and most of M10. A build emits **16 cards
+ 6 rules cards + 3 backs**.

`dungeon-bright` renders finished decks in German and English and is **entirely
first-party** — no sourced artwork at all. Both locales validate with 0 errors
and 0 warnings, and consecutive builds are byte-identical.

Remaining: the rest of **M10** (scaling motifs up, winning back room for a ground
band on the face cards) and **M13** (greyscale and physical proofs) — see
`NEXT-STEPS.md`.
