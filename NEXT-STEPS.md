# Next Steps

> A third theme, *Rejection Cum Laude*, is **built** — its naming decisions and
> the two points still open live in **`THEME-REJECTION-CUM-LAUDE.md`**. The
> milestones below are art direction on the existing decks and are independent
> of it, though M13's proofs now cover three decks rather than two.

The pipeline is finished (M0–M7 — see `CLAUDE.md` for architecture and the
reasoning behind past decisions). What remains is **art direction on the
`dungeon-bright` set**, which is now the only theme and the base every other one
extends. It is entirely first-party: every image on it is drawn by
`src/template/motifs.js` and `src/template/decor.js`, so the deck carries no
third-party artwork at all. Its only external assets are two OFL fonts, licensed
for exactly this use.

The earlier `dungeon` (sepia engraving) and `placeholder` themes were removed
once this one had been tuned past them. Entries below that compare the two are
kept as a record of why a decision was made, not as a description of the repo.

Milestones below continue the existing numbering. Each is independently
shippable — the deck renders and validates after every one.

> **On judgement:** the composition and visual-weight items can only really be
> assessed by rendering and looking at the result. Expect a round or two of
> iteration on each, as with the vortex motif that turned out to be a crescent.

---

## ~~M8~~ — Two-tone motifs, and evening out the set — **DONE**

*Affects `dungeon-bright`. The single biggest visual improvement available.*

Every motif is currently `fill="none"` with one `currentColor` stroke — outline
drawings sitting on flat colour. The reference style (Super Dungeon Explore,
Delicious in Dungeon) is **filled shapes with a darker outline**, which is the
same sticker logic the badges and name plates already use but the art does not.

- Give `wrap()` in `src/template/motifs.js` a fill as well as a stroke, and
  decide per shape which parts are filled.
- **Fix the two weak motifs.** `minotaur` reads cat-like; `golem` is two rounded
  rectangles. Both are legible but neither has character.
- **Even out optical weight.** On the proof sheet `chest` and `mimic` are dense
  and dark while `staff` and `vortex` are thin and light. Normalising stroke
  weight and how much of the 200×200 box each motif fills is what will make the
  sheet look like one hand drew it.

**Done.** Motifs are now filled silhouettes with a darker outline, both colours
driven by `--motif-fill` / `--motif-line`, which inline SVG inherits from the
card's palette. `golem` gained shoulders, a sunken head and a cracked chest.
`minotaur` needed **three** attempts: thin curves read as ears, thick vertical
shapes read as a rabbit, and only crescents sweeping *outward* from the sides
read as horns — with nostrils and a nose ring in place of a smile. `staff`,
`chalice`, `dagger` and `trapdoor` were weighted up afterwards; they were
visibly lighter than the rest on the sheet. `magicCircle` gained a filled disc
so it no longer sits lighter than everything around it.

Lesson worth keeping: a motif's *silhouette* decides what it reads as. Detail
inside it barely matters at 63 mm, and no amount of it fixes a wrong outline.

---

## ~~M9~~ — Drawn diagrams on the rules cards — **DONE**

*Affects both themes. The only item here that improves comprehension rather than
decoration, which is why it comes early.*

The Objective, Setup and Turn cards are roughly half empty, and their content is
inherently spatial.

- **Setup diagram** — Apprentice, fourteen face-down cards, Deity, laid left to
  right. Replaces a paragraph with a picture.
- **Turn-order diagram** — the Fake Master activation order (1, 2, 3, 4, 6, 11).

Both are drawn from existing primitives, so they stay first-party. They need a
new block type in the rules model and a matching branch in
`src/template/rules-card.js`.

**Done.** `src/template/diagrams.js` draws both. They are **language-neutral by
construction** — no words, only digits — so no diagram needs translating and a
third language would add nothing here. Colours come from the card's palette, so
the same diagram renders gold-on-parchment in `dungeon` and violet-on-cream in
`dungeon-bright` with no per-theme code.

A diagram is structure rather than wording, so it is its own block type in the
model (`{ type: 'diagram', name }`) attached via `"diagram": "setup"` in the
locale; the validator fails on an unknown name rather than rendering nothing.

The turn card's text dropped its "(1, 2, 3, 4, 6, 11)" parenthetical, since the
diagram now carries it — which was the point of drawing it.

---

## M10 — Art-window composition — **PARTLY DONE**

*Affects `dungeon-bright`.*

The art window is 816 × 470 and the motif occupies a 400 px square dead centre.
Measured rather than estimated, the motif's ink covers **11% of the window, so
89% was flat colour** — not the two-thirds this note originally claimed.
Apprentice and Deity were worse at 91%. Every card shared an identical
composition, which reads as a placeholder even when the drawing itself is good.

**Done — placement, contrast and option 2.** Three defects turned out to sit
underneath the composition problem, and were worth fixing before judging it:

- **Motifs were centred in the wrong box.** They were centred in the raw 470 px
  art window, but the printer trims the top `--bleed-y` away and the name plate
  covers the foot. Centred in what actually survives, they rise 11 px on a face
  card and **115 px** on the Apprentice and Deity, where the plate floats far
  above the bottom edge. This was most of why those two read as empty.
- **Each motif was individually off-centre**, by −34 px (`wizardHat`) to +32 px
  (`mimic`) — a 66 px spread that stopped the set sharing a baseline. Corrected
  by shifting each motif's *viewBox*, so no path was touched.
- **The two-tone fill from M8 was nearly invisible.** Fill-against-sky contrast
  measured 1.09 on the Apprentice and 1.19 on an Ally, and a blanket
  `opacity: 0.85` pulled both tones further toward the background. Widening the
  sky/fill gap from 30% to 64% of (accent − paper) and dropping the wash takes
  Ally to 1.44 and Hazard to 1.84.

Then **option 2**: `artBacking: "ground"` puts a horizon and ground band behind
every motif, so the subject stands in a space instead of floating.

**The horizon goes below every motif in the set, not at a fraction of the
field.** Placed by proportion it cut straight through most of them, which reads
as a mistake on any motif with open areas — the horizon showed through the gaps
in card 1's spiral. It is therefore derived from the deepest ink in the whole set
(`magicCircle`, 88 of 200 viewBox units below centre), so one line clears every
card rather than only the one being looked at.

**Consequence, and the open question.** On a face card the deepest motif bottoms
out 12.3px above the name plate, so a line below all of them leaves no room for a
band: cards 1–14 get a base line just above the plate and are otherwise flat
again. Only the Apprentice and Deity, with 200px of clearance, still show real
ground. Option 2 therefore only pays off on the two full-art cards as things
stand. Getting the spatial effect back on the face cards needs one of:

- shorter motifs (the reach is set by `magicCircle`, `staff` and `dagger` alone),
- a shallower art window or a higher plate, to open up vertical room, or
- accepting a horizon that crosses *filled* silhouettes but not open ones, which
  means it can no longer be one line across the set.

Two things worth keeping:

- **`place-content`, not `place-items`.** On a face card the motif is taller than
  its padded box, so the auto grid row grows to fit and pins to the box top —
  centring the item within that row does nothing. Every motif sat 11.6 px low
  until the *track* was centred instead. The audit caught this; the eye did not.
- **The ground must fade to the panel's paper at the foot.** Ending the band at
  full strength drew a second hard line across the card in the margins either
  side of the name plate, which read as an unintended horizon.

`src/audit.js` now measures where each motif's ink actually lands against the
centre of the visible art and warns beyond 4 px, so the measured centres in
`motifs.js` cannot quietly rot.

**Still open — option 1, and option 3.** Scaling motifs up was *not* done, and
should be judged now that the marks are centred, denser and sitting on ground:

1. Scale motifs up and let them crop off the top edge. Note this cannot be
   applied uniformly: `dagger` already bottoms out 5 px above the plate, so
   nothing can scale about its centre, and cropping reads as deliberate on
   elongated objects (staff, dagger, vortex) but simply wrong on a creature.
   Anchoring motifs bottom-up is the mechanism if this is wanted.
3. Scatter sparkles and dots asymmetrically. Related unevenness: sparkles
   currently live *inside* 5 of the 16 motifs (`lute`, `wizardHat`, `hound`,
   `chest`, `magicCircle`), so half the deck is decorated and half is not.

Also still true, and still not evened out: **motif ink varies 4.4×** across the
set (`staff` 5.9% of the window, `magicCircle` 25.5%). The four motifs M8 records
as "weighted up afterwards" — `staff`, `dagger`, `trapdoor`, `chalice` — remain
the four lightest, so that fix did not land.

---

## ~~M11~~ — A card back tiled from the motifs — **DONE**

*Affects `dungeon-bright`.*

The shared Masters back is a sunburst and a generic star. A **tiled pattern of
the motifs themselves** — small lutes, daggers, chests, coins — would be
unmistakably this deck's, and reuses assets M8 will already have improved.

**Done.** `decor.backPattern: "motifs"` tiles all sixteen motifs, outline-only at
low opacity, under the star emblem. Colours are baked in at generation time
rather than left as custom properties, because a background-image data URI is a
separate document and does not inherit the page's CSS variables — the same
reason the stone pattern takes its colour as an argument.

No information leaks: all 14 Masters carry the identical tile. The mix of Ally
and Hazard subjects is cosmetic; what would leak is variation *between* cards,
which the validator still enforces against.

---

## ~~M12~~ — Push the faction shape language further — **DONE**

*Affects both themes.*

**Done.** The text frame and name plate now carry the same language as the badge:
Allies rounded and calm, Hazards cut and angular via a chamfer. Both themes
express it in their own idiom — the bright deck contrasts rounded against cut,
the engraving deck square against cut.

Implemented with `clip-path`, never `transform`: it changes the painted shape
without touching the layout box, so the safe-zone audit is unaffected. A
`rotate()` here would have pushed corners outside the safe zone exactly as it
did on the Fake Master badge in M5.

Watch for: clipping runs along the border-box edge, so antialiasing shaves the
border. Each frame style compensates in proportion to its own weight — one
global value made the engraving theme's 2u rule frame three times heavier on
Hazards than on Allies.

---

## M13 — Pre-print checks

*Before any money is spent.*

- **Greyscale proof.** The faction distinction leans heavily on blue versus pink.
  Render the proof sheet desaturated and confirm the shape cues — rounded Ally
  against chamfered Hazard, from M12 — carry it on their own. This matters more
  now that the sky/ground and fill contrasts from M10 are also tonal.
- **Physical proof.** Print one card at actual size, on stock, and cut it. Large
  flat areas of saturated pink and blue shift noticeably on card stock, and flat
  fills can band; the halftone helps but does not settle it. This is the one
  thing no amount of validation substitutes for.

---

## Rejected, with reasons

Kept so they are not re-proposed.

| Idea | Why not |
|---|---|
| **Per-card accent colour** (Wizard purple, Cleric gold, …) | Rejected 2026-09-15: all cards should use the same colours. It would also have put the faction coding at risk, which is load-bearing — the whole player turn is "choose any Ally". |
| **Number track on the Apprentice** (`FM 1 2 3 4 6 11` / `TM 5 7 …`) | Playtesting showed cards leave the Path quickly, so a fixed list stops matching the board and stops being useful. |
| **Flavour text** | No room on cards 6, 7 and 11; the `flavor` field was removed from the model. |
| **`{icon:adjacent}` and `{icon:send}`** | `adjacent` appeared on nearly every line and added nothing; `send` was misleading, since a one-way arrow contradicts an effect that can move a card either direction. Both removed from the vocabulary; the glossary keeps the terms without glyphs. |
| **Bilingual cards** | Each language is a complete, separate deck, built from one theme via `localeOverrides`. |

---

## If you add photographic or painted artwork to `dungeon-bright` later

A card's `art` file takes precedence over its `motif`, so images can be swapped in
one at a time while the rest of the deck stays presentable:

```json
"cards": { "6": { "art": "minotaur.png", "focus": [0.5, 0.35] } }
```

Minimum sizes: **816 × 470** for the 14 Masters, **816 × 1110** for Apprentice and
Deity. Formats `.png`, `.jpg`, `.jpeg`, `.webp`. Colour is kept as-is here
(`artTreatment: "none"`); `"sepia"` and `"mono"` still exist and reduce mixed
sources to one register, which is what made mixed-provenance sourcing practical.

Prefer doing this in a **child theme** rather than here: art is not inherited, so
a child can carry images while `dungeon-bright` stays wholly first-party and free
of any copyright question — which is its main advantage and the reason it is the
base.
