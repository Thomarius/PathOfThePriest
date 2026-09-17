# Theme plan — *Summa Cum Laude*

A doctoral student walks a manuscript from first draft to a defended thesis,
with Reviewer 2 waiting in the middle of the path.

**Status: agreed, not built.** Names and title are settled; everything in
"Remaining work" below is still to do. Nothing in `themes/` exists for this yet.

---

## Card names

Names are approved. No articles, matching the two existing decks.

### Hazards

| # | What the card does | German | English |
|---|---|---|---|
| 1 | Swaps the 2 adjacent cards | **Chaos** | Chaos |
| 2 | **Destroys** the lowest adjacent card | **Reviewer 2** | Reviewer 2 |
| 3 | Sends lowest adjacent back to the **start** | **Hardwarefehler** | Hardware Failure |
| 4 | Moves lowest adjacent **back 2** | **Nullresultat** | Null Results |
| 6 | Sends lowest adjacent to the space **before Reviewer 2** | **Einreichung** | Submission |
| 11 | Drags lowest adjacent **2 spaces toward Reviewer 2** | **Deadline Panik** | Deadline Panic |

Card 6 is deliberately ironic: submitting is nominally good, and the card's
effect is to place your work directly in front of Reviewer 2.

### Allies

| # | What the card does | German | English |
|---|---|---|---|
| 5 | Swap with a card up to 2 away | **Kaffee** | Coffee |
| 7 | Three graded options — the most flexible card | **Mentor** | Mentor |
| 8 | Back 2 **or** advance 1 | **KonstruktivesFeedback** | Constructive Feedback |
| 9 | Swap with a card exactly 3 away | **Geistesblitz** | Brilliant Idea |
| 10 | Swap with any adjacent card | **Bürokollege** | Officemate |
| 12 | Move any adjacent card 2 spaces | **Saubere Daten** | Clean Data |
| 13 | Back 3 **or** advance 2 — the largest numbers | **Fokus** | Focus |
| 14 | Swap with a card 4 away — the longest reach | **Konferenz** | Conference |

Every Ally is something the player can decide to do or seek. That test is worth
re-applying to any later change: a deck whose Allies are inert objects fights the
fact that the whole player turn is "choose an Ally and activate it".

### The two fixed cards

| | German | English |
|---|---|---|
| 0 | **Doktorandin** | PhD Student |
| D | **Verteidigung** | Defence |

**Title Ideas:** 
*Rejection Cum Laude*, in both languages.
*Doctor When?*, in both languages.
*Publish or Perish*, in both languages.

---

## Why the Deity is "Verteidigung" and not "Doktortitel"

The German objective line reads `... ans Ende zur {card:D}.` — `zur` is feminine
dative, so the Deity's name has to be feminine. **"Verteidigung" is feminine and
works; "Doktortitel" is masculine and would render "ans Ende zur Doktortitel".**

All six German sentences that use `{card:D}` were checked against this; `zur` is
the only one carrying an article, so a feminine name clears every case.

This is the same determiner trap recorded twice in `CLAUDE.md`. Changing the
Deity name later means re-checking that line.

---

## Remaining work

### 1. `themes/summa-cum-laude/theme.json`

Extends `dungeon-bright`, so palette, typography, fonts and the whole decor
vocabulary come for free. Needs:

- `extends`, `id`, `title`, `subtitle`
- 16 card names and motif keys
- `terms.path`, `factions`, and **all 16 German names under
  `localeOverrides.de.cards`** — not under plain `cards`. A name set in `cards`
  is overruled by whatever the parent's `localeOverrides` says for German, and
  the rename silently does nothing. `validate` warns when this happens.

**The Path** is `die Promotion` — the process, not the title. Feminine, which
matters: `path.def` and `path.indef` both sit in *accusative* slots ("bilde …",
"Gehe … entlang"), and feminine nominative and accusative are identical, so
there is no trap here. A masculine path noun would need "den" and "einen", the
way `mittagspause` does for "Arbeitstag".

```
def "die Promotion"  ·  indef "eine Promotion"  ·  in "in der Promotion"
of "der Promotion"   ·  from "aus der Promotion"
```

**Faction labels** — suggested `Unterstützung` / Support and `Hürde` / Obstacle.
Both feminine, which keeps the ten German case forms simple. Not yet approved.

**Inline forms** are needed for cards 0 and 2, which are named inside sentences.
`Doktorandin` and `Reviewer 2` both read correctly unadorned, matching how
`Barde` and `Michi` work.

### 2. Sixteen motifs in `src/template/motifs.js`

The largest piece of work. Keys must not collide with the 32 already there.
Each one needs its drawn centre **measured on the rendered page** and declared —
eleven of the sixteen Michi motifs were wrong on first estimate, and the deep
audit fails anything more than 4px out.

Lessons that will apply again:

- A motif's **silhouette** decides what it reads as; interior detail barely
  survives 63 mm.
- Detail inside a silhouette has to be a **tone change, not a line** — a line
  gains its own outline and becomes a separate object sitting on top.
- **Plot regular shapes** (stars, gears, reticles) rather than hand-placing
  vertices.

### 3. A back emblem

`decor.emblem` currently offers `lozenge`, `ring`, `star` and `clock`. A **laurel
wreath** suits the title and is symmetric, so it cannot leak which card it is on.
Would be a new shape in `emblem()` in `src/template/decor.js`.

### 4. Decisions still open

- **Palette.** Inheriting `dungeon-bright` gives blue Allies, pink Hazards, gold
  Deity. Fine as-is; worth a look once the motifs exist.
- **Card 0 artwork.** The Michi deck uses a supplied illustration for card 0. This
  theme will use a drawn motif unless one is provided.
- **Back title.** `mittagspause` breaks its title across two lines with a newline
  in the theme's own title string. The new title might be short enough that it may
  not need one — check once it renders.

### 5. What is *not* needed

No new locale file. Effect text, rules cards and the glossary live in
`locales/de.json` and `locales/en.json` and are **shared by every theme** — only
names, terms and faction labels change, and those resolve through tokens. The
`meta.hyphenate` list also stays as it is, since the effect sentences do not
change.
