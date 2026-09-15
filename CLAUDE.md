# Path of the Priest — Fan Card Generator

Automated generation of print-ready card images for a fan re-theme of the solo
microgame *The Path of the Priest*. Mechanics are taken verbatim from
`RulesSummary.txt` and do **not** change; only naming, art, language and visual
design are re-themed.

## Status

**The pipeline is complete (M0–M7).** Remaining work is art direction, tracked in
**`NEXT-STEPS.md`** as M8 onward.

Four finished decks build today, each **16 cards + 5 rules cards + 3 backs**:

| Theme | Locales | Style | Artwork |
|---|---|---|---|
| `dungeon` | `de`, `en` | 19th-century engraving, sepia monochrome | 15 public-domain images + 1 drawn motif |
| `dungeon-bright` | `de`, `en` | Fantasy-anime: flat colour, thick outlines, rounded shapes | **entirely first-party** — 16 drawn motifs, no sourced images |

```sh
npm install && npx playwright install chromium
npm run validate -- --deep --theme dungeon-bright --locale de
npm run build    -- --theme dungeon-bright --locale de --out out/bright-de
```

All four theme × locale combinations validate with **0 errors and 0 warnings**,
and consecutive builds are byte-identical.

`dungeon-bright` is the one to print if copyright matters: every image on it is
drawn by `src/template/motifs.js` and `src/template/decor.js`. Its only external
assets are two OFL fonts, licensed for exactly this use. The `placeholder` theme
is a neutral fixture for pipeline work and is not meant for printing.

## Deck composition

| Group | Count | Notes |
|---|---|---|
| Apprentice | 1 | number `0`, no card text |
| Deity | 1 | id `D`, no card text |
| True Masters | 8 | numbers 5, 7, 8, 9, 10, 12, 13, 14 — choose-one effects |
| Fake Masters | 6 | numbers 1, 2, 3, 4, 6, 11 — forced effect + fallback/conditional |
| **Playing cards total** | **16** | |
| Rules cards | 5 | objective+endgame / setup / turn order / glossary / clarifications |
| Card backs | 3 designs | shared back for the **14 Masters**, plus distinct backs for Apprentice and Deity |

The 14 Masters are shuffled during setup, so their back must be identical.
Apprentice and Deity are separated before shuffling and may be told apart.

## Core architecture principle

**Mechanics, theme, and language are three separate data layers.** Nothing in
`src/` may know what the theme's topic is or what language is being printed.

- `data/` — mechanical skeleton. Card numbers, factions, effect slots. Fixed by
  the rules, never edited for a re-theme.
- `themes/<name>/` — topic layer. Card names, faction labels, art,
  palette, typography.
- `locales/<lang>.json` — wording layer. Effect sentences with icon and card-name
  tokens, rules card copy, glossary.

Re-theming must be achievable by editing one theme directory. Adding a language
must be achievable by adding one locale file.

## Decisions (settled)

| Decision | Choice |
|---|---|
| Rendering | HTML/CSS templates rendered headless via Playwright (Chromium) |
| Artwork | Two approaches: `dungeon` uses public-domain / CC images with generated attribution; `dungeon-bright` is entirely drawn in-repo. Protected art is acceptable for this private print run, but print services screen uploads, so PD/CC or first-party stays the lower-risk path. |
| Print target | Print-on-demand with bleed; MakePlayingCards as the default profile |
| Effect text | Icon-augmented German sentences; glyphs follow the keyword they annotate |
| Primary language | German (`de`); English (`en`) maintained as a fallback from `RulesSummary.txt` |
| Topic / theme | An underlevelled adventurer delving for treasure. Allies are party members and equipment, Hazards are traps and monsters, the Deity is the treasure chest. |
| Faction names | Theme data — never hardcoded as "True Master" / "Fake Master" |
| Cards are monolingual | One language per deck. Two languages = two complete card and rules sets from one theme via `localeOverrides`. |
| Flavour text | None. The `flavor` field was removed. |
| Card backs | One neutral shared back for the 14 Masters; Apprentice and Deity reuse their own front as their back. |
| Themes | `dungeon` (sepia engraving) and `dungeon-bright` (fantasy-anime), the latter inheriting all naming from the former. |

## Print geometry

Geometry is **never hardcoded**. It lives in `config/print-profiles.json` so the
print service can be switched later.

A profile declares `trimMm: [w, h]`, `bleedMm`, `safeMm`, `dpi`, and an optional
`pxOverride` for services that publish exact pixel specs.

Derived: `px = round((trimMm + 2 * bleedMm) / 25.4 * dpi)`

Which value wins depends on the profile, and `src/model.js` enforces it: without
a `pxOverride` the **declared bleed is authoritative** and the canvas rounds to
it; with a `pxOverride` the **canvas is authoritative** and bleed is re-derived
from it. Deriving bleed from a rounded canvas in both cases produced a −0.05 px
bleed on the zero-bleed home profile. The trim box is always reported as
canvas minus bleed, so the boxes nest exactly.

| Profile | Trim | Bleed | DPI | Output |
|---|---|---|---|---|
| `mpc` (default) | 63 x 88 mm | 3 mm | 300 | 816 x 1110 px (`pxOverride`, matches MPC's 2.72 x 3.7 in) |
| `drivethru` | 63 x 88 mm | 3.175 mm (0.125 in) | 300 | derived |
| `home-a4` | 63 x 88 mm | 0 | 300 | derived, 9-up imposition |

Safe zone is 3 mm inside trim. Card numbers, names and effect text must stay
inside it; art bleeds to the edge.

**Author the CSS at final pixel size** (card element = exactly the profile's
pixel dimensions, screenshot at `deviceScaleFactor: 1`). Do not author in mm and
scale — that introduces rounding drift between preview and export.

## Data model

### `data/cards.json`

Theme-blind mechanical skeleton:

```json
{ "id": "7", "number": 7, "faction": "true", "effects": [
  { "key": "7.a", "kind": "choice" },
  { "key": "7.b", "kind": "choice" },
  { "key": "7.c", "kind": "choice" }
] }
```

`faction`: `true` | `fake` | `apprentice` | `deity`

`kind`, one per effect line:

- `choice` — True Masters: player picks exactly one to resolve
- `primary` — Fake Masters: resolved first, forced
- `fallback` — "If unable, ..." alternative (cards 1, 4)
- `conditional` — "If it is X, ..." clause (cards 6, 11)

These four kinds drive visual treatment (bullet vs. "or" divider vs. indented
sub-clause), so they must be explicit in the data, not inferred from the text.

### `locales/de.json`

Effect text keyed by effect key, containing tokens. The locale layer holds **no
card names and no faction names** — all three token types resolve against the
active theme, so re-theming can never break text on another card.

| Token | Resolves to | Notes |
|---|---|---|
| `{icon:<name>}` | inline glyph | valid names: `advance` `moveBack` `move` `swap` `destroy` `lowest` |
| | | **Glyphs go *after* the keyword they annotate** — "Swap `<swap>` the 2 adjacent cards", matching the original game's cards. `renderSegments` converts the space before a glyph to a non-breaking one, so a wrap can never strand it away from its verb. |
| `{card:<id>}` | card name from theme | cards 6 and 11 reference `{card:2}` (GRUDGE); card 11 also references `{card:0}` (APPRENTICE) |
| `{faction:<id>.<form>}` | faction label from theme | `<form>` is any key the theme defines. German needs **determiner-carrying** forms, because the article agrees with a gender the locale cannot know: `one` `other` `genPl` `anyAkk` `indefAkk` `negAkk` `negNom` `eachNom` `sameAkk` |
| `{term:<id>.<form>}` | world vocabulary from theme | the Path becomes "the dungeon" / "das Verlies". Forms carry their article for the same reason: `def` `indef` `in` `of` `from` |

Token parsing lives in `src/tokens.js` and emits a **segment list**, not HTML, so
the templates decide how a glyph or card reference is actually drawn. Any brace
surviving expansion is a validation error.

**`extends: "<theme>"`** lets a theme inherit another and override only what
differs — two themes sharing a setting should not duplicate 16 card names in two
languages. **Artwork is not inherited**: art belongs to a visual style, and a
child pointing at the parent's files would reference images absent from its own
art directory. Opt in with `inheritArt: true`.

### `themes/<name>/theme.json`

Per-card `name`, optional `art` filename and focal-point crop; deck
title; faction display labels; palette; font choices.

**`localeOverrides.<code>`** folds language-specific values over the base theme,
so one theme serves several locales without duplicating artwork or palette. Card
names and faction labels are theme data *and* language-specific, which is why
they cannot live in the locale file — the locale must stay free of names.

Faction labels are an **open-ended map of forms**, not a singular/plural pair,
because German needs case forms: `{faction:true.akk}` yields "Wahren Meister" for
"einen beliebigen Wahren Meister". A form referenced by a locale but missing from
the theme is a hard error.

The art crop is stored per card (`{ "art": "grudge.jpg", "focus": [0.5, 0.35] }`)
because public-domain scans have unpredictable aspect ratios.

## Project structure

```
PathOfThePriest/
├─ RulesSummary.txt          # source of truth for mechanics
├─ CLAUDE.md                 # architecture + past decisions (this file)
├─ NEXT-STEPS.md             # remaining work, M8 onward
├─ README.md
├─ package.json              # dep: playwright
├─ config/
│  └─ print-profiles.json    # mpc | drivethru | home-a4
├─ data/
│  ├─ cards.json             # mechanical skeleton
│  └─ deck.json              # print run: faces + rules cards + backs
├─ locales/
│  ├─ de.json                # primary
│  └─ en.json
├─ themes/
│  ├─ dungeon/               # sepia engraving; 15 sourced images + 1 motif
│  │  ├─ theme.json
│  │  ├─ art/                # public-domain / CC0 from Wikimedia Commons
│  │  ├─ art-selection.json  # card id -> candidate index
│  │  └─ ATTRIBUTION.md      # generated, never hand-written
│  ├─ dungeon-bright/        # fantasy-anime; extends dungeon, all motifs
│  │  └─ theme.json
│  └─ placeholder/           # neutral fixture for pipeline work
├─ src/
│  ├─ build.js               # CLI: validate | model | preview | build
│  ├─ model.js               # cards + theme + locale -> render model
│  ├─ tokens.js              # {icon:} {card:} {faction:} {term:}
│  ├─ validate.js            # structural checks, no browser
│  ├─ audit.js               # live layout checks: overflow, safe zone
│  ├─ render.js              # Playwright -> PNG + PDF + proof sheet
│  ├─ icons/                 # 6 movement glyphs, one .svg each
│  └─ template/
│     ├─ card.js             # card face
│     ├─ rules-card.js       # the 5 rules cards
│     ├─ back.js             # shared Masters back
│     ├─ document.js         # page assembly shared by render + audit
│     ├─ page.js             # review preview (zoom, guides, fill metrics)
│     ├─ decor.js            # procedural ornament vocabulary
│     ├─ motifs.js           # 15 drawn card motifs
│     ├─ fonts.js            # vendored woff2 -> @font-face data URIs
│     └─ styles.css          # single source of layout + print geometry
├─ scripts/
│  ├─ fetch-fonts.mjs        # vendor the OFL files   (npm run fonts)
│  ├─ find-art.mjs           # shortlist Commons candidates
│  └─ fetch-art.mjs          # download + wire in + write ATTRIBUTION.md
├─ assets/fonts/             # OFL woff2 + licences + fonts.json manifest
└─ out/                      # gitignored; everything reproducible
   ├─ <theme>-<locale>/      # 16 cards + 5 rules + 3 backs + manifest.json
   ├─ preview/index.html
   ├─ proof-*.png
   └─ <title>-<locale>-<profile>.pdf
```

## Rendering pipeline

1. `model.js` merges `cards.json` + theme + locale into a render model.
2. Templates emit HTML; `styles.css` derives every dimension from the active
   print profile via CSS custom properties.
3. **Everything is inlined** — fonts and artwork become data URIs, so the page
   has no external references at all. This replaced the planned static server:
   with nothing to fetch, there is no asset-path or `file://` loading problem
   left to work around.
4. `render.js` screenshots each `.card` element to PNG, then renders the PDF
   from a **second page sized in millimetres** (see below).

### Units: px for PNG, mm for PDF

`geometryVars()` in `card.js` emits the card geometry either in px or in mm, and
because every size in `styles.css` derives from `--u` (card width / 816), one
switch rescales the entire design.

This is not cosmetic. A card is 816 CSS px wide; printed, that means 8.5 inches.
The PDF must therefore be laid out at the card's true physical size (69.088 ×
93.98 mm), which also emits the text as vectors at the correct size rather than
a scaled bitmap.

**Known tolerance:** Chromium quantizes PDF page size to 1/300 inch and rounds
up, so pages come out 0.08–0.25 mm larger than requested. That lands well inside
the 3 mm bleed and is trimmed away. PNGs are pixel-exact and are the print
deliverable; the PDF is for proofing.

Determinism requirements, on every run:

- fixed viewport, `deviceScaleFactor: 1`
- `await document.fonts.ready` before any screenshot
- await `decode()` for every art image
- no animations, no transitions, no `Date`/random in templates

## Validation

Two layers. Both must pass before anything is sent to a printer.

**Structural** (`npm run validate`, no browser) — `src/validate.js`:

- **Completeness** — every card has a name, every effect key resolves in the
  active locale, every referenced art file exists.
- **Tokens** — no unresolved `{...}` survives expansion.
- **Deck composition** — faction counts and card numbers match the rules.
- **Card backs** — every card has exactly one, and the 14 Masters share exactly
  one design (anything else makes a shuffled card identifiable).
- **Fonts** — every family a theme names is vendored.
- **Attribution** — every art file has an entry in `ATTRIBUTION.md`.

**Layout** (`npm run validate -- --deep`, and always inside `npm run build`) —
`src/audit.js`, measured in a live page:

- **Overflow** — effect text taller than its box; it would be clipped.
- **Safe zone** — any text element crossing the safe inset; it could be cut off.
- **Headroom** — fewer than 1 spare line, meaning a longer translation will not fit.

`build` audits the same loaded page it is about to print, so the audit cannot
drift from the output, and it **writes nothing at all** when a card fails.

## Milestones

- **M0 — Content lock. DRAFTED, awaiting review.** `locales/de.json` exists and
  validates. Mechanical vocabulary as used: *vorrücken, zurückbewegen, bewegen,
  tauschen, zerstören, senden, angrenzend, niedrigste, Feld/Felder, Pfad*.
  **"zurückbewegen", not "zurückziehen"** — in German game usage *ziehen* also
  means "draw a card", and the deck already has cards moving along a path.
  Measured: German runs **+32%** over English overall, and card 7 grows +40%
  (145→203 chars) with its fill unchanged at 75% and 2 spare lines still free.
  No card falls below 2 spare lines. The topic is still open, but it does not
  block this file — names are tokens.
- **M1 — Data & model. DONE.** `data/cards.json`, `data/deck.json`,
  `config/print-profiles.json`, `locales/en.json`, `themes/placeholder/`,
  `src/tokens.js`, `src/model.js`, `src/validate.js`, `src/build.js`.
  `npm run validate` is green; `npm run model` dumps `out/model.json`.
- **M2 — Card template & design system. DONE.** `src/template/{styles.css,card.js,page.js}`,
  `npm run preview` → `out/preview/index.html`.
  **The binding card is 7 (Philosophy), not 11 (Envy).** Character count was the
  wrong proxy: Envy has more text (167 chars) but only 2 paragraphs and fills 40%,
  while Philosophy's 3 effects plus 2 "or" dividers fill 73%. Structure costs more
  height than length. Any future layout change must be checked against card 7.
- **M3 — Icon language. DONE.** **6** SVG glyphs live in `src/icons/`,
  are stroked in `currentColor` and sized in `em`, so they inherit the colour of
  whatever text they sit in, and the glossary rules card is generated from the
  same files so the legend cannot drift from the cards. `adjacent` and `send`
  were later removed — see the rejected list in NEXT-STEPS.md.
- **M4 — Rendering pipeline. DONE.** `npm run build` → 16 PNGs at 816×1110 in
  `out/<theme>-<locale>/` plus a PDF. Fonts are vendored (`npm run fonts`) and
  inlined. Determinism is *verified, not assumed*: the renderer writes SHA-256
  hashes to each output directory's `manifest.json`, and consecutive runs produced
  byte-identical output for all 16 cards.
- **M5 — Validation & QA. DONE.** `src/audit.js` measures the live layout and
  promotes the findings to hard failures. `npm run build` audits the exact page
  it is about to print and **writes nothing if a card fails**; `npm run validate
  -- --deep` runs the same checks standalone. `out/proof-sheet.png` is the
  proofing contact sheet. Overflow, safe-zone and headroom checks were each
  verified against deliberately broken input.
- **M6 — Art integration. DONE.** `scripts/find-art.mjs` shortlists Wikimedia
  Commons candidates by licence metadata; `scripts/fetch-art.mjs` downloads them,
  wires them into `theme.json` and generates `ATTRIBUTION.md`, so provenance
  cannot drift from the deck. 15 images for `dungeon`; card 14 uses a drawn motif
  because no public-domain engraving depicts a teleportation circle.
  `decor.artTreatment` reduces mixed sources to one monochrome register — this is
  what made mixed-provenance sourcing practical instead of a re-sourcing exercise.
- **M7 — DONE.** `src/template/back.js` draws the shared Masters back; the
  Apprentice and Deity backs are *copied* from their own front renders, so the
  files are identical rather than merely similar (declared by `reuseFront` in
  `data/deck.json`). `src/template/rules-card.js` renders the five rules cards,
  reusing `.card__text`/`.card__text-inner` so the M5 overflow audit covers them
  automatically — they carry far more text than a face. A build now emits
  **16 cards + 5 rules cards + 3 backs**, with rules cards included in the PDF
  and the proof sheet.

**M0–M7 are complete.** Remaining work is art direction, tracked in
**`NEXT-STEPS.md`** as M8 onward.

Still optional and out of scope: a rules simulator to verify the deck stays
winnable, only needed if the effects themselves are ever altered.

## Rules corrections and rejected features

- **Card 5 (Exercise) reads "up to 2 spaces away".** The original rules summary
  dropped the "up to", which is mechanically significant: per the clarifications,
  effect numbers are exact *unless* preceded by "up to". Confirmed against the
  published card art and corrected in both `RulesSummary.txt` and `locales/en.json`
  on 2026-09-14. If other Masters are ever checked against card images, this is
  the failure mode to look for.
- **The Apprentice does not carry a True/Fake number track.** The published
  Apprentice card prints `FM 1 2 3 4 6 11` / `TM 5 7 8 9 10 12 13 14` down its
  edges as a player aid. Deliberately omitted: playtesting showed cards leave the
  Path quickly, so a fixed list of numbers stops matching the board and stops
  being useful. Do not re-add it without new playtest evidence.
- **Rules go on cards, not a sheet.** The original ships a rulebook sheet; this
  version prints the rules as cards so the whole product is one deck.

## Constraints & gotchas

- Card numbers stay `0`–`14` and `D`; three effects reference "the lowest number
  in the top-left corner", so the corner number is functional, not decoration.
- The True/Fake distinction must be unmistakable at a glance — the entire player
  turn is "choose any True Master".
- German runs ~20–30% longer than the English source; size text boxes for the
  worst case. `npm run preview -- --stress 1.4` inflates every effect string by
  the given factor to prove the layout survives translation before the German
  wording exists. Measured tolerance: the current layout holds to **~2.4x**
  English length; card 7 overflows at ~3.0x.
- The preview reports a **fill percentage** per card (content height ÷ box
  height). Keep the fullest card at or below ~75% in English — that is the
  headroom German needs. M5 turns the same measurement into a hard failure.
- Flex items must carry `flex: 0 0 auto` inside the text box. As shrinkable flex
  items they compress to fit instead of overflowing, which would hide exactly the
  defect the overflow check exists to catch.
- Fonts must be OFL or similarly redistributable, since the deck is shared. They
  are committed under `assets/fonts`, and the validator **fails** if a theme names
  a family that is not vendored — otherwise it would silently fall back to a
  locally installed face and output would stop matching between machines.
- **Numerals: use the body face, with `lining-nums`.** Cormorant Garamond's `1`
  is a seriffed vertical, so the badge on card 11 rendered as "II". The corner
  number is functional — three effects resolve targets by it — so it uses
  Alegreya Sans with lining tabular figures. Check any font change against card
  11 and card 1.
- Layout must be measured with the **real vendored fonts**. Sized against the
  fallback face, card 7 read as 73% full; with Alegreya Sans it was 47%, because
  the fallback was considerably wider.
- Art bleeds past trim; all text stays inside the safe zone.
- **Never pre-encode `#` as `%23` inside a procedural SVG.** `encodeURIComponent`
  escapes the `%` again into `%2523`, which silently corrupted every colour and
  the grain filter's reference — the textures rendered as nothing at all and
  looked merely "subtle". Write plain `#` and let the encoder handle it.
- **Determiners belong in the faction form, not the locale text.** German
  articles agree with the noun's gender, and the noun is theme data: a locale
  reading "einen {faction:fake.akk}" produced "einen Gefahr" once a theme used a
  feminine noun. Forms like `indefAkk`, `negAkk`, `eachNom` and `sameAkk` carry
  their determiner, exactly as `{term:}` forms carry their article.
- Decor data URIs go into a `style="..."` attribute, so they must be
  single-quoted; `renderCard`/`renderBack` throw if one contains a double quote.
- **Never use `transform: rotate()` for a badge or panel shape.** It keeps the
  layout box but grows the *painted* bounding box by up to sqrt(2), which put
  the Fake Master diamond 21.6px outside the safe zone on all six cards — inside
  the trim line, so invisible on screen, but within the range a cut can drift.
  Use `clip-path` instead: the painted shape stays inside the same box and the
  numeral stays upright. The audit catches this class of error.

## Open items

See **`NEXT-STEPS.md`** — M8 onward, all art direction on `dungeon-bright`, plus
a list of ideas already rejected and why, so they are not re-proposed.

Nothing in the pipeline is blocked. The setting, both languages and both visual
styles are settled.
