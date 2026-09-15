# Next Steps

The pipeline is finished (M0–M7 — see `CLAUDE.md` for architecture and the
reasoning behind past decisions). What remains is **art direction on the
`dungeon-bright` set**, which is entirely first-party: every image on it is drawn
by `src/template/motifs.js` and `src/template/decor.js`, so that deck carries no
third-party artwork at all. Its only external assets are two OFL fonts, licensed
for exactly this use.

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

## M10 — Art-window composition

*Affects `dungeon-bright`.*

The art window is 816 × 470 and the motif occupies a 400 px square dead centre,
so about two-thirds is flat colour. Apprentice and Deity are worse: a 560 px mark
in a 1110 px full-card window. Every card shares an identical composition, which
reads as a placeholder even when the drawing itself is good.

Options, cheapest first:

1. Scale motifs up and let them crop off the top edge.
2. Add a ground line or horizon band so the subject sits *in* a space.
3. Scatter sparkles and dots asymmetrically rather than symmetrically.

Do this after M8 — composition is far easier to judge once the drawings carry
their final weight.

---

## M11 — A card back tiled from the motifs

*Affects `dungeon-bright`.*

The shared Masters back is a sunburst and a generic star. A **tiled pattern of
the motifs themselves** — small lutes, daggers, chests, coins — would be
unmistakably this deck's, and reuses assets M8 will already have improved.

The constraint still governs: all 14 Masters are shuffled face down, so the back
must be identical on every one and must not hint at Ally versus Hazard. The
validator enforces the single shared design; keeping the imagery neutral is a
design responsibility.

---

## M12 — Push the faction shape language further

*Affects both themes.*

Faction currently reads through colour plus badge shape and plate corner radius.
In a drawn set this can go further: Hazards get spiky, jagged framing and speed
lines; Allies get rounded, calm shapes. The aim is that the distinction survives
a glance across the table, not only a close look.

---

## M13 — Pre-print checks

*Both themes, before any money is spent.*

- **Greyscale proof.** The bright set leans on blue versus pink far more than the
  engraving deck does. Render the proof sheet desaturated and confirm the shape
  cues carry the faction distinction on their own.
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
Deity. Formats `.png`, `.jpg`, `.jpeg`, `.webp`. Colour is kept as-is on this
theme (`artTreatment: "none"`); the sepia unification belongs to the engraving
deck.

Note that doing so gives up the set's main advantage — being wholly first-party
and free of any copyright question.
