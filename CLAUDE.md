# Path of the Priest — Fan Card Generator

Automated generation of print-ready card images for a fan re-theme of the solo
microgame *The Path of the Priest*. Mechanics are taken verbatim from
`RulesSummary.txt` and do **not** change; only naming, art, language and visual
design are re-themed.

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
- `themes/<name>/` — topic layer. Card names, faction labels, flavor text, art,
  palette, typography.
- `locales/<lang>.json` — wording layer. Effect sentences with icon and card-name
  tokens, rules card copy, glossary.

Re-theming must be achievable by editing one theme directory. Adding a language
must be achievable by adding one locale file.

## Decisions (settled)

| Decision | Choice |
|---|---|
| Rendering | HTML/CSS templates rendered headless via Playwright (Chromium) |
| Artwork | Public-domain / CC images, sourced manually, attribution tracked |
| Print target | Print-on-demand with bleed; MakePlayingCards as the default profile |
| Effect text | Icon-augmented German sentences (inline SVG glyphs + short text) |
| Primary language | German (`de`); English (`en`) maintained as a fallback from `RulesSummary.txt` |
| Topic / theme | **Deferred.** Build the pipeline theme-agnostic with a placeholder theme. |
| Faction names | Theme data — never hardcoded as "True Master" / "Fake Master" |

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
| `{icon:<name>}` | inline glyph | valid names: `advance` `moveBack` `move` `swap` `destroy` `send` `adjacent` `lowest` |
| `{card:<id>}` | card name from theme | cards 6 and 11 reference `{card:2}` (GRUDGE); card 11 also references `{card:0}` (APPRENTICE) |
| `{faction:<id>.<form>}` | faction label from theme | `<form>` is any key the theme defines — `one`, `other`, and for German also case forms (`dat`, `akk`) |

Token parsing lives in `src/tokens.js` and emits a **segment list**, not HTML, so
the templates decide how a glyph or card reference is actually drawn. Any brace
surviving expansion is a validation error.

### `themes/<name>/theme.json`

Per-card `name`, optional `flavor`, `art` filename and focal-point crop; deck
title; faction display labels; palette; font choices.

The art crop is stored per card (`{ "art": "grudge.jpg", "focus": [0.5, 0.35] }`)
because public-domain scans have unpredictable aspect ratios.

## Project structure

```
PathOfThePriest/
├─ RulesSummary.txt          # source of truth for mechanics
├─ CLAUDE.md
├─ README.md
├─ package.json              # dep: playwright
├─ config/
│  └─ print-profiles.json
├─ data/
│  ├─ cards.json             # mechanical skeleton
│  └─ deck.json              # print run: cards + rules cards + backs
├─ locales/
│  ├─ de.json
│  └─ en.json
├─ themes/
│  └─ <theme>/
│     ├─ theme.json
│     ├─ art/
│     └─ ATTRIBUTION.md
├─ src/
│  ├─ build.js               # CLI: build | validate | preview
│  ├─ model.js               # cards + theme + locale -> render model
│  ├─ tokens.js              # token expansion (icons, card refs)
│  ├─ template/
│  │  ├─ card.js
│  │  ├─ rules-card.js
│  │  ├─ back.js
│  │  └─ styles.css          # single source of layout + print geometry
│  ├─ icons/                 # SVG glyphs, one file per movement verb
│  ├─ render.js              # Playwright -> PNG + PDF
│  ├─ serve.js               # static server for deterministic asset loading
│  └─ validate.js
├─ assets/fonts/             # OFL-licensed only (redistributable)
└─ out/
   ├─ cards/                 # one PNG per card, bleed included
   ├─ preview/               # browser contact sheet for proofing
   └─ PathOfThePriest-de.pdf
```

## Rendering pipeline

1. `model.js` merges `cards.json` + theme + locale into a render model.
2. Templates emit HTML; `styles.css` derives every dimension from the active
   print profile via CSS custom properties.
3. `serve.js` serves `out/preview` over `http://localhost` — **do not use
   `file://` URLs**; local fonts and images load unreliably there under Chromium.
4. `render.js` screenshots each `.card` element to PNG, then emits the combined PDF.

Determinism requirements, on every run:

- fixed viewport, `deviceScaleFactor: 1`
- `await document.fonts.ready` before any screenshot
- await `decode()` for every art image
- no animations, no transitions, no `Date`/random in templates

## Validation (`npm run validate`)

Must fail loudly, before anything is sent to a printer:

- **Text overflow** — measure `scrollHeight > clientHeight` on every text box in
  the live page. This is the main reason we chose HTML rendering; German text
  overrunning its box is the most likely and most expensive defect.
- **Safe zone** — no text element's bounding box crosses the safe-zone inset.
- **Completeness** — every card has a name, every effect key resolves in the
  active locale, every referenced art file exists.
- **Tokens** — no unresolved `{...}` survives expansion.
- **Attribution** — every art file has an entry in `ATTRIBUTION.md`.

## Milestones

- **M0 — Content lock.** Topic chosen; German mechanical vocabulary fixed
  (*vorrücken, zurückziehen, bewegen, tauschen, zerstören, senden, angrenzend,
  niedrigste*). These words recur on nearly every card; changing one later means
  re-reading the whole deck. Deliverable: `locales/de.json`.
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
- **M3 — Icon language. DONE (glyphs).** The 8 SVG glyphs live in `src/icons/`,
  are stroked in `currentColor` and sized in `em`, so they inherit the colour of
  whatever text they sit in. Remaining: wire the same glyphs into the glossary
  rules card in M7 so the legend cannot drift from the cards.
- **M4 — Rendering pipeline.** Deterministic per-card PNGs with bleed, plus the
  combined PDF.
- **M5 — Validation & QA.** Overflow, safe zone, completeness, attribution, and a
  proofing contact sheet.
- **M6 — Art integration.** Source public-domain images, set focal crops, fill
  `ATTRIBUTION.md`. *Long pole — manual per-card work the pipeline cannot shortcut.*
- **M7 — Rules cards, 3 card backs, final print package.**

Optional M8: a rules simulator to verify the deck stays winnable — only needed if
effects are ever altered, which is currently out of scope.

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
- Fonts must be OFL or similarly redistributable, since the deck is shared.
- Art bleeds past trim; all text stays inside the safe zone.

## Open items

- Theme/topic — blocks M0 and M6 only; M1–M5 proceed on a placeholder theme.
- Whether the rules cards ship in German only or bilingually.
