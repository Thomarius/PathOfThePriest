# Path of the Priest — Fan Card Generator

Generates print-ready card images for a fan re-theme of the solo microgame
*The Path of the Priest*. See `CLAUDE.md` for the full project plan.

Mechanics come verbatim from `RulesSummary.txt` and never change. Only naming,
artwork, language and visual design are re-themed.

## Usage

```sh
npm run validate                      # structural checks on the data layers
npm run model -- --out out/model.json # dump the merged render model
```

Both accept `--theme <name>`, `--locale <code>` and `--profile <name>`:

```sh
node src/build.js validate --profile drivethru --locale en
```

No dependencies are required yet. Playwright is added in M4, when rendering
starts.

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

## Status

M1 (data & model) is complete. M2 (card template) is next; rendering to PNG/PDF
arrives in M4.
