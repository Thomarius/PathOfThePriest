# Artwork attribution — Michi, mach mal Mittag!

Hand-written, unlike the generated attribution the sourced decks carried.
`scripts/fetch-art.mjs` builds that file from Wikimedia Commons metadata, and
there is none to build from here.

| File | Card | Provenance |
|---|---|---|
| `art/0-michi.png` | 0 — Michi | **Unconfirmed — needs filling in by the project owner.** Supplied for this deck; origin not recorded. |

Every other image in this deck is drawn in-repo by `src/template/motifs.js` and
`src/template/decor.js` and is first-party.

## Why this matters before printing

The validator only checks that this file *exists*, not that it is accurate, so
nothing downstream will catch a wrong entry here. This is the only image in
either deck that is not drawn in-repo, and print-on-demand services screen
uploads for third-party content. If the illustration came from a stock library
or a generator, its licence terms belong in the table above.

## Files

- `0-michi-source.png` — the image as supplied: 544 x 539, RGBA, transparent
  background. Kept so the framing can be redone without going back to the owner.
- `0-michi.png` — what the deck actually renders. The source composited onto an
  816 x 1110 transparent canvas at 500 px wide (a 0.92 downscale, so nothing is
  softened), centred in the field that survives trimming — the same framing the
  drawn motifs get on the other full-art card.

The canvas matters: `.card__art` uses `background-size: cover`, so a 544 x 539
square would have been scaled 2x to fill an 816 x 1110 window and cropped at the
shoulders. Pre-composited to the card's own aspect, it is a 1:1 fit.

An earlier `Michi.jpeg` was also supplied, with a transparency checkerboard baked
into its pixels. It is not used — JPEG cannot carry alpha, and the PNG source is
free of compression artefacts.
