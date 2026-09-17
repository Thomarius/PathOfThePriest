# Theme plan — *Rejection Cum Laude*

A doctoral student walks a manuscript from first draft to a defended thesis,
with Reviewer 2 waiting in the middle of the path.

**Status: built.** `themes/rejection-cum-laude/theme.json` renders and validates
in both languages with 0 errors and 0 warnings. Two things are still open and
are marked below: the German name for card 8, and the physical proof.

---

## Card names

Names are approved. No articles, matching the two existing decks. The `motif`
column is settled too — see "Motifs" below for which are reused and which are
new.

### Hazards

| # | What the card does | German | English | Motif |
|---|---|---|---|---|
| 1 | Swaps the 2 adjacent cards | **Chaos** | Chaos | `crossedArrows` *(reused)* |
| 2 | **Destroys** the lowest adjacent card | **Reviewer 2** | Reviewer 2 | `evilEyes` (new) |
| 3 | Sends lowest adjacent back to the **start** | **Hardwarefehler** | Hardware Failure | `cog` *(reused)* |
| 4 | Moves lowest adjacent **back 2** | **Nullresultate** | Null Results | `backArrow` *(reused)* |
| 6 | Sends lowest adjacent to the space **before Reviewer 2** | **Einreichung** | Submission | new |
| 11 | Drags lowest adjacent **2 spaces toward Reviewer 2** | **Deadline Panik** | Deadline Panic | `alarm` *(reused)* |

Card 6 is deliberately ironic: submitting is nominally good, and the card's
effect is to place your work directly in front of Reviewer 2.

### Allies

| # | What the card does | German | English | Motif |
|---|---|---|---|---|
| 5 | Swap with a card up to 2 away | **Kaffee** | Coffee | `mug` *(reused)* |
| 7 | Three graded options — the most flexible card | **Mentor** | Mentor | new |
| 8 | Back 2 **or** advance 1 | **Konstruktive Kritik** *(open — see below)* | Constructive Feedback | new |
| 9 | Swap with a card exactly 3 away | **Geistesblitz** | Brilliant Idea | `bulb` *(reused)* |
| 10 | Swap with any adjacent card | **Bürokollege** | Officemate | `bubble` *(reused)* |
| 12 | Move any adjacent card 2 spaces | **Saubere Daten** | Clean Data | `bars` *(reused)* |
| 13 | Back 3 **or** advance 2 — the largest numbers | **Fokus** | Focus | `reticle` *(reused)* |
| 14 | Swap with a card 4 away — the longest reach | **Konferenz** | Conference | `plane` *(reused)* |

Every Ally is something the player can decide to do or seek. That test is worth
re-applying to any later change: a deck whose Allies are inert objects fights the
fact that the whole player turn is "choose an Ally and activate it".

### The two fixed cards

| | German | English | Motif |
|---|---|---|---|
| 0 | **Doktorandin** | PhD Student | `scholar` (new) |
| D | **Verteidigung** | Defence | `mortarboard` (new) |

**Title:** *Rejection Cum Laude*, in both languages.

Measured on the rendered card, which corrected an earlier estimate:

- **A name gets 593 px, not the 673 px the safe zone suggests.** The banner plate
  insets itself 34u a side and adds a 6u border on top of that. Measured against
  the safe width, "Konstruktives Feedback" (607 px) looked like it fitted with
  10% to spare; on the real page it wrapped, and because `--plate-box-h` is fixed
  the second line pushed the HILFE label clean out of the banner.
- **Card 8's German name is therefore still open.** "Konstruktive Kritik"
  (479 px) is in place as the closest substitute that fits and keeps
  *konstruktiv*. Also measured and fitting: "Gutes Feedback" (400), "Faires
  Feedback" (405), "Hilfreiche Kritik" (400), "Gutes Gutachten" (423),
  "Feedback" (240). English "Constructive Feedback" (576 px) fits unchanged.
- Every other name fits on one line in both languages. The back title does too —
  "REJECTION CUM LAUDE" is 589 px at 46u, and the title carries no plate inset —
  so unlike `mittagspause` this theme needs no newline in its title string.
- `src/audit.js` now measures plate overflow directly, so this cannot recur
  silently in any theme. Verified by putting the long name back and watching it
  fail.

---

## Why the Deity is "Verteidigung" and not "Doktortitel"

The German objective line reads `... ans Ende zur {card:D}.` — `zur` is feminine
dative, so the Deity's name has to be feminine. **"Verteidigung" is feminine and
works; "Doktortitel" is masculine and would render "ans Ende zur Doktortitel".**

All seven German slots that use `{card:D}` were checked (`de.json` lines 45, 51,
60, 63, 134 twice, 135); **line 45 is the only one carrying an article**, so a
feminine name clears every case.

This is the same determiner trap recorded twice in `CLAUDE.md`. Changing the
Deity name later means re-checking that line.

English spelling is **"Defence"**, British. Note the English locale is currently
mixed — it has British "towards" and American "center" — so this is a choice
rather than a correction; nothing in `locales/en.json` changes.

---

## Inline names, and why they stay bare

Inline forms carry **no article**, matching `Barde`, `Mimik` and `Michi`. So the
German objective prints:

> Bringe Doktorandin vom Anfang der Promotion ans Ende zur Verteidigung.

**Accepted as house style.** It cannot be softened to "die Doktorandin", because
6.b and 11.b read `in Richtung {card:0}`, which would then give "in Richtung die
Doktorandin". One inline form has to serve nominative, accusative and
`in Richtung` at once, and only a bare noun does.

`Doktorandin` and `Reviewer 2` both read correctly unadorned. "Reviewer 2" is the
first **multi-word** inline name in the project, but it cannot split across
lines: `.card__cardref` already sets `white-space: nowrap`
(`src/template/styles.css:315`).

The German name stays **feminine throughout** — `Doktorandin`, and the apprentice
faction label with it — as `mittagspause` does with `Physikerin`.

---

## Remaining work

### 1. `themes/rejection-cum-laude/theme.json`

Extends `dungeon-bright`, so palette, typography, fonts and the whole decor
vocabulary come for free. Needs:

- `extends`, `id`, `title`, `subtitle`
- 16 card names and motif keys
- `terms.path`, `factions`, and **all 16 German names under
  `localeOverrides.de.cards`** — not under plain `cards`. A name set in `cards`
  is overruled by whatever the parent's `localeOverrides` says for German, and
  the rename silently does nothing. `validate` warns when this happens.
  (`dungeon-bright` has **only** a `de` override, so English names are safe in
  plain `cards`, exactly as in `mittagspause`.)

**The Path** is `die Promotion` — the process, not the title. Feminine, which
matters: `path.def` and `path.indef` both sit in *accusative* slots ("bilde …",
"Gehe … entlang"), and feminine nominative and accusative are identical, so
there is no trap here. A masculine path noun would need "den" and "einen", the
way `mittagspause` does for "Arbeitstag".

```
def "die Promotion"  ·  indef "eine Promotion"  ·  in "in der Promotion"
of "der Promotion"   ·  from "aus der Promotion"
```

**Faction labels — settled.** German **Hilfe / Hürde**, English **Support /
Obstacle**. Both German nouns are feminine, which keeps all ten case forms
trivial, and — the reason "Unterstützung" was dropped — the plural is idiomatic:
the objective prints "8 Hilfen und 6 Hürden", where "8 Unterstützungen" would
not. The plural is load-bearing in three places: the objective line, `genPl` in
the end-of-game line, and `other` in Clarifications 1.

```
de true : one/akk "Hilfe" · other/genPl "Hilfen" · anyAkk "eine beliebige Hilfe"
          indefAkk "eine Hilfe" · eachNom "Jede Hilfe" · sameAkk "dieselbe Hilfe"
          negAkk/negNom "keine Hilfe"
de fake : one/akk "Hürde" · other/genPl "Hürden" · anyAkk "eine beliebige Hürde"
          indefAkk "eine Hürde" · eachNom "Jede Hürde" · sameAkk "dieselbe Hürde"
          negAkk/negNom "keine Hürde"
en true : Support / Supports · "any Support" · "a Support" · "Each Support" · …
en fake : Obstacle / Obstacles · "any Obstacle" · "an Obstacle" · "Each Obstacle" · …
apprentice : de "Doktorandin" / "Doktorandinnen" · en "PhD Student" / "PhD Students"
deity      : de "Verteidigung" / "Verteidigungen" · en "Defence" / "Defences"
```

**Inline forms** are needed for cards 0 and 2, which are named inside sentences.

### 2. Motifs in `src/template/motifs.js`

**Ten of the sixteen are reused**, which is the decision that shrinks this from
the largest piece of work to a moderate one. Motifs live in `motifs.js` rather
than in a theme precisely so any theme can name any of them, and the family
resemblance to `mittagspause` — including two cards that share both name and
motif, Chaos on 1 and Fokus on 13 — is accepted rather than avoided.

Reused: `crossedArrows` `cog` `backArrow` `mug` `bulb` `bubble` `alarm` `bars`
`reticle` `plane`.

**Six new ones**, keys not colliding with the 32 already there:

| # | Card | Proposed subject |
|---|---|---|
| 0 | Doktorandin | `scholar` — a bare round head over shoulders |
| 2 | Reviewer 2 | `evilEyes` — narrowed lids under heavy angled brows, no pupils |
| 6 | Einreichung | `envelope` |
| 7 | Mentor | `owl` |
| 8 | (card 8) | `marginTick` — a filled chevron |
| D | Verteidigung | `mortarboard` |

**The mortarboard belongs to D, not to 0** — you only get the hat once the
defence is behind you. That also kept card 0 clear of a hat, which made the plain
avatar bust the obvious answer for it.

Two of the six needed a second attempt, both for the reason M8 recorded about
`minotaur`: the silhouette decides the read, and a wrong one cannot be argued
with.

- **The owl came out as a cat.** Sharp tufts on a round head with two small eyes
  is a cat. What fixed it was not the outline but the **eyes** — two outlined
  discs of radius 27 spanning nearly the whole head width, with pupils inside.
  Nothing else in the deck has eyes that size.
- **The nib came out as a map pin.** A round top over a downward point with a dot
  in the middle is the map marker every phone draws. Flattening the top to a
  shallow dome and running the sides straight down before the taper fixed it —
  after which it read unmistakably as a pen, and was replaced anyway.

**Card 2 is `evilEyes`, not the nib.** The nib was legible but not *dangerous*,
which is the wrong note for the card that destroys. `penNib` is kept in
`motifs.js`, unused, as the alternative — no theme names it, so it does not
appear on any card or in any back tile.

The eyes took four passes, and each failure was a different lesson about how a
two-tone motif behaves at this size:

- **Brows carry the threat, not eyes.** Two eyes of any shape read as neutral. It
  is the heavy bars above them, slanting down toward the centre, that make it a
  glare.
- **Straight lids, not almonds.** With a curved top the eyes read as the ordinary
  "view" icon. A straight slanted upper lid, parallel to the brow above it, is
  what narrows them.
- **Leave a gap in the middle.** At the first attempt the two inner corners met
  and the pair read as one moustache-shaped object.
- **An 8-unit stroke eats a thin shape.** A shallow eye with a large pupil came
  out as a solid dark blob with two slivers of fill left in it. The eye has to be
  deep enough to carry an outline, a pupil *and* visible fill between them —
  about 50 viewBox units of height, with a pupil no larger than r=12.

**The pupils were then dropped and the centre gap widened** (brows 12 → 26
viewBox units apart, lids 16 → 30). The mark is more graphic for it and the
stroke-versus-fill problem above disappears entirely, since each lid is now a
single flat shape. It costs some specificity: with no pupil to fix the read, the
lids lean on the brows to say "eyes", and on their own they are closer to two
plain scoops. If they ever need to read harder as eyes without regaining pupils,
the lever is the *bottom* curve — shallower makes a lens, deeper makes a bowl.

Two constraints specific to this set:

- **Card 0 is a drawn motif, not a supplied illustration.** `mittagspause` uses
  an image for card 0 only because a drawn female silhouette never came out
  well. The lesson is to avoid drawing a *person* at all: `dungeon-bright` names
  card 0 "Level 1 Bard" and draws a **lute**. A mortarboard does the same job.
- **The academic setting is full of paper**, and cards 0, 2, 6 and 8 could all
  collapse into "a rectangle". Silhouette decides what a motif reads as, so
  these four have to differ in outline, not in interior detail.

Each new motif needs its drawn centre **measured on the rendered page** and
declared — eleven of the sixteen Michi motifs were wrong on first estimate, and
the deep audit fails anything more than 4 px out.

**Hard limit: no new motif may reach more than 88 of 200 viewBox units below
centre.** `--motif-reach` in `src/template/styles.css:790` is that constant,
derived from the deepest ink in the *whole* set (`magicCircle`), and the ground
band is placed below it so one horizon clears every card. A deeper motif would
either be cut by the horizon or force that constant up — which moves the ground
band on `dungeon-bright` and `mittagspause` too, where M10 measured only 12.3 px
of clearance above the name plate on a face card. The lectern is the one at risk.

Lessons that will apply again:

- A motif's **silhouette** decides what it reads as; interior detail barely
  survives 63 mm.
- Detail inside a silhouette has to be a **tone change, not a line** — a line
  gains its own outline and becomes a separate object sitting on top.
- **Plot regular shapes** (stars, gears, reticles) rather than hand-placing
  vertices.

### 3. A back emblem

`decor.emblem` now offers `lozenge`, `ring`, `star`, `clock` and **`laurel`**.
The wreath is plotted from angles rather than hand-placed — the lesson the back
star taught — so the two halves are exact mirrors and it cannot read as pointing
anywhere.

Two things it got wrong first, both invisible in the code and obvious on the
card:

- **Equal gaps at the top and the bottom is not a wreath.** It reads as two loose
  leaves facing each other. A wreath may only open at the top, so the sprigs have
  to run almost all the way down to the tie.
- **The arc sweep flag was inverted.** y grows downward, so an increasing angle
  is clockwise and needs sweep 1. With sweep 0 each stem took the far side of the
  circle and the two crossed into a lens through the middle of the emblem.

The motif-tiled back is generated from **this theme's own** sixteen motifs, so
reusing ten of them means roughly two thirds of the tile is shared with
`mittagspause`. Accepted.

### 4. Settled, previously open

- **Palette.** Inherited from `dungeon-bright` unchanged — blue Allies, pink
  Hazards, gold Deity — the same as every other theme.
- **Card 0 artwork.** A drawn motif. See above.
- **Back title.** One line, no `\n`. Measured at 589 px against 673 px.

### 5. What is *not* needed

No new locale file. Effect text, rules cards and the glossary live in
`locales/de.json` and `locales/en.json` and are **shared by every theme** — only
names, terms and faction labels change, and those resolve through tokens. The
`meta.hyphenate` list also stays as it is, since the effect sentences do not
change.

Nothing in `locales/en.json` changes for "Defence" either — the Deity's name is
theme data.

### 6. Checks to run at the end

All green as of 2026-09-17:

- `npm run validate -- --deep` passes for all **six** theme × locale
  combinations, so neither the new motifs nor the two new audit checks disturbed
  the existing decks.
- The longer inline names cost German cards 6 and 11 nothing — both still clear
  the headroom check.
- `out/` holds six decks side by side.

Two checks were added to the pipeline while building this theme, both because
this deck tripped over what they now catch:

- **Unknown motif keys are a hard error.** `card.js` and `decor.js` both test
  `MOTIFS[card.motif]` and fall through, so a typo gave a blank art window, a gap
  in the back tile, and a green `validate --deep`. Verified against a deliberate
  typo.
- **A name plate that overflows is a hard error.** See the measurement note above.

Still to do: **M13's physical proof**, which now covers three decks. Card 8's
name is the one thing on this deck worth settling on stock.
