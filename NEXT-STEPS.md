# Next Steps

Everything still open on the project, in one place: decisions to make, work
remaining, and — once the setting and language are chosen — exactly which files
to create where, and how to check the result.

`CLAUDE.md` holds the architecture and the reasoning behind past decisions. This
document is the forward-looking half.

**Where the project stands:** M1–M5 are complete. The pipeline renders 16
print-ready cards, validates them, and proves its own output is reproducible.
Everything left is either a decision or content.

---

## Part 1 — Decisions still open

| # | Decision | Blocks | Recommendation |
|---|---|---|---|
| 1 | **Setting / topic** | M6 artwork, all card names | Pick a theme with a deep public-domain image pool, and one where 6 *vices* and 8 *virtues* map onto Fake and True Masters. Candidates below. |
| 2 | ~~**Language**~~ — decided: German | — | `locales/de.json` drafted. English kept as the reference; both ship from the same artwork via `localeOverrides`. |
| 3 | ~~**Bilingual cards?**~~ — decided: monolingual | — | Each language is a complete, separate card and rules set. Two languages means two decks, produced from one theme via `localeOverrides`. |
| 4 | **Keep `{icon:adjacent}` and `{icon:lowest}`?** — kept for now | proof-reading | Retained. Revisit during proof-reading of a printed copy; removing them is a locale-file edit, no code change. |
| 5 | ~~**Flavour text**~~ — decided: none | — | The `flavor` field has been removed from the model. There was room on single-effect cards but not on 6, 7 and 11. |
| 6 | ~~**Card backs**~~ — decided | M7 build | One neutral shared back for the 14 Masters, giving away nothing about True vs Fake. Apprentice and Deity reuse their own front as their back for now. |
| 7 | **Print service** — default stands | — | `mpc` is the default and is already configured. `drivethru` and `home-a4` profiles exist; switching is a flag, not a rewrite. |

### German wording — all seven points approved 2026-09-15

1. **"zurückbewegen", not "zurückziehen".** In German game usage *ziehen* also
   means "draw a card"; this deck already has cards moving along a path, so
   *zurückbewegen* avoids the collision. Parallel to *bewegen*.
2. **Duzen.** The rules address the player as *du*. Switch to *Sie* or to
   impersonal phrasing if you prefer.
3. **"Feld / Felder"** for *space / spaces*, **"Pfad"** for *path*.
4. **"Wahrer Meister" / "Falscher Meister".** Alternatives: *Echter Meister*,
   *Falscher Prophet*. These will likely be renamed by the theme anyway.
5. **Card references take no article** — "in Richtung {card:0}" renders as
   "in Richtung Lehrling". Grammatically "in Richtung des Lehrlings" is fuller,
   but that forces a genitive form per card name and breaks on a re-theme.
6. **"Ist es {card:2}, …"** for the conditional clause on cards 6 and 11.
7. **Card names are placeholders.** The German names in the theme override are
   literal translations of the originals; your setting replaces all 16.

### On decision 1 — setting candidates

All three have large public-domain pools, which is what makes M6 tractable:

- **Medieval manuscript marginalia** — virtues and vices are a standard
  iconographic programme, so period art already depicts exactly these concepts.
- **Alchemy / hermetic engravings** — strong graphic character, fits "Path" and
  "Master" naturally, and reads well in the existing two-colour treatment.
- **Botanical or anatomical plates** — beautiful and consistent, but the
  virtue/vice mapping has to be invented rather than inherited.

Ask for a worked-up proposal with named sources if you want one before deciding.

---

## Part 2 — Remaining work

### M0 — German locale — **drafted, awaiting your review**

`locales/de.json` exists, validates, and renders. Review it against the deck:

```sh
npm run preview -- --locale de     # then open out/preview/index.html
npm run build -- --locale de --out out/cards-de
```

Vocabulary as drafted — changing any of these means re-reading the whole deck:

> *vorrücken, zurückbewegen, bewegen, tauschen, zerstören, senden, angrenzend,
> niedrigste, Feld/Felder, Pfad*

Measured result: German runs **+32%** longer than English overall; card 7 grows
+40% yet keeps 2 spare lines. No card falls below 2 spare lines, so the layout
needs no change for German.

The seven wording choices below were reviewed and approved.

### M6 — Artwork *(needs decision 1; the long pole)*

Manual per-card sourcing, 16 images. The pipeline cannot shorten this.

### M7 — Rules cards *(card backs are done)*

Two templates are not yet written:

- `src/template/rules-card.js` — five rules cards. The data and locale entries
  already exist (`data/deck.json` → `rulesCards`, `locales/*.json` → `rules`),
  and the model already builds them into normalised blocks. Only the template is
  missing.
- ~~`src/template/back.js`~~ — **done.** All three backs render; Apprentice and
  Deity are byte-identical copies of their own fronts.

The glossary rules card must be generated from `src/icons/`, so the legend
cannot drift from the glyphs printed on the cards.

### Smaller known gaps

| Gap | Detail |
|---|---|
| Art focus is vertical only | `theme.json` `focus: [x, y]` — only `y` is applied (`background-position: center <y>`). Add horizontal support if a chosen image needs it. |
| Rules cards not rendered | `npm run build` renders the 16 faces only. Rules cards and backs join once their templates exist. |
| `.gitattributes` | Git reports LF→CRLF on every commit. Adding `* text=auto eol=lf` would settle it if the repo is ever opened on another machine. |

---

## Part 3 — What to create once the setting and language are decided

Replace `<theme>` with your theme's folder name — lowercase, no spaces, e.g.
`marginalia`. Replace `de` with your language code if it is not German.

### 3.1 The theme directory

```
themes/<theme>/
├─ theme.json          # names, faction labels, palette, typography
├─ ATTRIBUTION.md      # required as soon as any art is used
└─ art/
   ├─ apprentice.jpg   # any filename; theme.json points at it
   ├─ doubt.jpg
   └─ ...              # 16 files when complete
```

**`themes/<theme>/theme.json`** — every key below is required unless marked
optional. All 16 card ids must be present.

```jsonc
{
  "id": "<theme>",                    // must match the folder name
  "title": "Der Pfad des Priesters",  // printed on the preview/proof header
  "subtitle": "",                     // optional

  "factions": {
    // Any form your locale references. German will likely need cases beyond
    // one/other — define whatever forms you use; a missing one is a hard error.
    "true":       { "one": "…", "other": "…" },
    "fake":       { "one": "…", "other": "…" },
    "apprentice": { "one": "…", "other": "…" },
    "deity":      { "one": "…", "other": "…" }
  },

  "palette": {
    // ink = text, paper = background, accent = icons and highlights.
    // Fake and Deity are inverted (light ink on dark paper) in the placeholder.
    "true":       { "ink": "#…", "paper": "#…", "accent": "#…" },
    "fake":       { "ink": "#…", "paper": "#…", "accent": "#…" },
    "apprentice": { "ink": "#…", "paper": "#…", "accent": "#…" },
    "deity":      { "ink": "#…", "paper": "#…", "accent": "#…" }
  },

  "typography": {
    // Must lead with a vendored family, or validation fails. Currently
    // available: "Cormorant Garamond", "Alegreya Sans".
    // To use others, add them to scripts/fetch-fonts.mjs and run `npm run fonts`.
    "display": "\"Cormorant Garamond\", serif",
    "body": "\"Alegreya Sans\", sans-serif"
  },

  // Optional. Folds language-specific values over everything above, so one
  // theme serves several locales without duplicating art or palette.
  // See themes/placeholder/theme.json for a worked German example.
  "localeOverrides": {
    "de": {
      "title": "…",
      "factions": {
        // German needs case forms; declare whichever your locale references.
        // A form used by the locale but missing here is a hard error.
        "true": { "one": "…", "akk": "…", "other": "…", "genPl": "…" },
        "fake": { "one": "…", "akk": "…", "other": "…", "genPl": "…" }
      },
      "cards": { "0": { "name": "…" }, "1": { "name": "…" } }
    }
  },

  "cards": {
    "0":  { "name": "…", "art": "apprentice.jpg", "focus": [0.5, 0.35] },
    "1":  { "name": "…", "art": "doubt.jpg" },
    "2":  { "name": "…" },
    "3":  { "name": "…" },
    "4":  { "name": "…" },
    "5":  { "name": "…" },
    "6":  { "name": "…" },
    "7":  { "name": "…" },
    "8":  { "name": "…" },
    "9":  { "name": "…" },
    "10": { "name": "…" },
    "11": { "name": "…" },
    "12": { "name": "…" },
    "13": { "name": "…" },
    "14": { "name": "…" },
    "D":  { "name": "…" }
  }
}
```

`art` and `focus` are optional per card — cards without art render a hatched
placeholder, so the deck stays buildable while sourcing is in progress.

Which number is which card (`ref` is the original English name, never printed):

| id | ref | faction | | id | ref | faction |
|---|---|---|---|---|---|---|
| 0 | APPRENTICE | apprentice | | 8 | HERBALIST | true |
| 1 | DOUBT | fake | | 9 | MEDITATION | true |
| 2 | GRUDGE | fake | | 10 | PRAYER | true |
| 3 | FEAR | fake | | 11 | ENVY | fake |
| 4 | LAZINESS | fake | | 12 | PILGRIM | true |
| 5 | EXERCISE | true | | 13 | MAGIC | true |
| 6 | DISCORD | fake | | 14 | ASTRAL BODY | true |
| 7 | PHILOSOPHY | true | | D | DEITY | deity |

### 3.2 Artwork files — `themes/<theme>/art/`

| Requirement | Value |
|---|---|
| Formats | `.png`, `.jpg`, `.jpeg`, `.webp` |
| Minimum size, the 14 Masters | **816 × 470 px** (the art window) |
| Minimum size, Apprentice and Deity | **816 × 1110 px** (full-card art) |
| Larger images | Fine — scaled down with `cover`, never upscaled |
| Cropping | Controlled per card by `focus: [x, y]`, values 0–1; only `y` is applied today |

Art deliberately bleeds past the trim line — that is the one element allowed
outside it. Keep anything that must survive the cut away from the edges.

### 3.3 `themes/<theme>/ATTRIBUTION.md`

Free-form, but it must exist as soon as any card has `art`, or validation fails.
One entry per image: file name, source work, creator, collection/URL, licence or
public-domain basis.

### 3.4 The German locale — `locales/de.json`

Copy `locales/en.json` and translate. **Never put card names or faction names in
here** — that is what breaks when a card is renamed. Use tokens:

| Token | Meaning |
|---|---|
| `{icon:<name>}` | Inline glyph. Valid: `advance` `moveBack` `move` `swap` `destroy` `send` `adjacent` `lowest` |
| `{card:<id>}` | Card name from the active theme, e.g. `{card:2}`, `{card:0}` |
| `{faction:<id>.<form>}` | Faction label, e.g. `{faction:true.one}`, `{faction:fake.other}` |

Required structure:

```jsonc
{
  "meta": { "code": "de", "label": "Deutsch", "htmlLang": "de" },
  "ui": {
    "fallbackLabel": "Falls nicht möglich:",  // heading above a Fake Master's fallback
    "choiceSeparator": "oder",                // divider between a True Master's choices
    "rulesCardTag": "Regeln"
  },
  "effects": { /* all 22 keys, listed below */ },
  "rules": {
    "objective":      { "title": "…", "body": ["…"], "sections": [{ "heading": "…", "items": ["…"] }] },
    "setup":          { "title": "…", "items": ["…"] },
    "turn":           { "title": "…", "items": ["…"] },
    "glossary":       { "title": "…", "entries": [{ "term": "…", "icon": "advance", "text": "…" }] },
    "clarifications": { "title": "…", "items": ["…"] }
  }
}
```

All 22 effect keys are required — a missing one is a hard error:

```
1.a  1.b  2.a  3.a  4.a  4.b  5.a  6.a  6.b  7.a  7.b  7.c
8.a  8.b  9.a  10.a  11.a  11.b  12.a  13.a  13.b  14.a
```

Two things to watch while translating:

- **Card 5 reads "up to 2 spaces"** (`bis zu 2 Felder`). Per the clarifications,
  effect numbers are exact *unless* preceded by "up to", so this changes play.
- **Cards 6 and 11 reference other cards.** `{card:2}` is Grudge, `{card:0}` is
  the Apprentice. Keep them as tokens.

### 3.5 Point the deck at the new theme and language

Edit `data/deck.json`:

```json
{ "theme": "<theme>", "locale": "de", "profile": "mpc" }
```

Or override per command without editing anything:

```sh
npm run build -- --theme <theme> --locale de
```

---

## Part 4 — Commands to check the output

### One-time setup

```sh
npm install
npx playwright install chromium
```

### Day-to-day

```sh
npm run validate            # data checks: names, tokens, fonts, deck composition
npm run validate -- --deep  # ...plus live layout: overflow, safe zone, headroom
npm run preview             # out/preview/index.html — open in a browser
npm run build               # renders everything; refuses if the layout fails
```

Every command accepts `--theme <name>`, `--locale <code>`, `--profile <name>`.
Note the `--` when passing flags through npm:

```sh
npm run validate -- --deep --theme <theme> --locale de
npm run build -- --profile drivethru
```

### The suggested order when checking new content

1. **`npm run validate`** — catches missing names, untranslated keys, typos in
   tokens, an unvendored font, a missing `ATTRIBUTION.md`. Fast, no browser.
2. **`npm run preview`**, then open `out/preview/index.html`. The toolbar has a
   zoom control and a **trim & safe guide** overlay (red = trim, blue = safe
   zone). Each card reports how full its text box is and **how many spare lines
   remain** — the number that predicts whether a longer translation still fits.
   - Inspect one card full size: `out/preview/index.html?scale=1&only=7,11&guides=1`
3. **`npm run stress`** — re-renders the preview with every string inflated,
   to see which cards are near their limit. A card whose fill does not move
   under stress is normal: text height changes in whole lines, not smoothly.
4. **`npm run build`** — the real output. It audits the page it is about to
   print and **writes nothing at all if any card fails**.

### What `npm run build` produces

| Path | What it is |
|---|---|
| `out/cards/*.png` | 16 cards, 816 × 1110 px, bleed included — **the print deliverable** |
| `out/cards/manifest.json` | SHA-256 per card, plus canvas, dpi, trim and bleed |
| `out/<title>-<locale>-<profile>.pdf` | 16 pages at true physical size — for proofing |
| `out/proof-sheet.png` | The whole deck on one sheet, for review at a glance |
| `out/preview/index.html` | Interactive review page (from `npm run preview`) |

`out/` is gitignored; everything in it is reproducible from a clean checkout.

### Verifying reproducibility

Output is byte-identical across machines because fonts and artwork are inlined
rather than loaded. To confirm after any change:

```sh
npm run build && cp out/cards/manifest.json out/r1.json && npm run build
node -e "const a=require('./out/r1.json').cards,b=require('./out/cards/manifest.json').cards; console.log(a.every((x,i)=>x.sha256===b[i].sha256)?'identical':'MISMATCH')"
```

### Escape hatches

```sh
npm run build -- --no-pdf      # skip the PDF
npm run build -- --no-proof    # skip the proof sheet
npm run build -- --no-audit    # render even if the layout audit fails
npm run build -- --out out/de  # write PNGs elsewhere
npm run fonts                  # re-vendor the OFL files
npm run model -- --out out/model.json   # dump the merged render model
```

---

## Part 5 — Definition of done

- [ ] `npm run validate -- --deep` reports **0 errors and 0 warnings**
      (the current single warning is "16 of 16 cards have no artwork yet")
- [ ] Every card has a name in `theme.json` and a `{card:…}` reference resolves
- [ ] All 16 art files present; `ATTRIBUTION.md` complete
- [ ] No card below **1 spare line** in the preview, in German
- [ ] Rules cards and the 3 card backs render (M7)
- [ ] The 14 Masters share one back — the validator enforces this, because a
      distinguishable back makes the setup shuffle meaningless
- [ ] `out/proof-sheet.png` reviewed at full size
- [ ] A physical proof printed and cut before ordering a full run
