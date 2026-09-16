/**
 * Drawn motifs for the art window.
 *
 * A theme can give any card a `motif` instead of an image file. They serve two
 * purposes: as a stand-in while artwork is being sourced, and as the permanent
 * answer for cards nothing in the public domain depicts — a teleportation
 * circle among them. The `dungeon-bright` deck is built entirely from these, so
 * it carries no third-party artwork at all.
 *
 * TWO-TONE: each motif is a filled silhouette with a darker outline, the same
 * sticker logic the badges and name plates use. The two colours come from CSS
 * custom properties rather than `currentColor`, because inline SVG inherits
 * them — so both are driven by the card's palette and follow the theme.
 *
 *   --motif-fill   the body colour
 *   --motif-line   the outline, and any solid detail such as an eye
 *
 * Bold and simple on purpose: at 63 mm a detailed line drawing turns to mud.
 * Deterministic — no randomness here at all.
 */

const LINE = 'var(--motif-line, currentColor)';
const FILL = 'var(--motif-fill, none)';

/**
 * Motifs are drawn to fill roughly a 150x150 area inside the 200x200 box, and
 * share one stroke weight. Both matter more than they sound: uneven coverage and
 * uneven stroke weight are what made the first set look like fifteen different
 * hands rather than one.
 *
 * `centre` is where the drawn ink actually sits, measured from the rendered
 * page. Drawn by hand, most motifs land a few units off — the worst were
 * wizardHat 17 units high and mimic 16 low, a 66 px spread once rendered, which
 * is what stopped the set sharing a baseline on the proof sheet. Shifting the
 * *viewBox* recentres the drawing without touching a single path. The deep audit
 * re-measures these on the real page, so a value that goes stale fails the build
 * rather than quietly tilting the set.
 */
const svg = (body, stroke = 8, centre = [100, 100]) => {
  const [cx, cy] = centre;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${cx - 100} ${cy - 100} 200 200" fill="none"
        stroke="${LINE}" stroke-width="${stroke}" stroke-linecap="round"
        stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
};

/** Filled silhouette with an outline. */
const solid = (d) => `<path d="${d}" fill="${FILL}"/>`;
const solidCircle = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${FILL}"/>`;

/** Outline only. */
const line = (d, w) => `<path d="${d}"${w ? ` stroke-width="${w}"` : ''}/>`;

/**
 * A gear outline, plotted so every tooth is identical. Hand-placing teeth gave
 * a shape that read as a splat rather than a cog.
 *
 * `broken` replaces one tooth with a ragged bite. A crack drawn across the hub
 * instead just read as a second, unrelated mark sitting on top of the gear.
 */
const gearPath = (cx, cy, rOut, rIn, teeth, broken = -1) => {
  const step = (Math.PI * 2) / teeth;
  const at = (r, a) => `${(cx + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r).toFixed(1)}`;
  const pts = [];
  for (let i = 0; i < teeth; i += 1) {
    const a = i * step - Math.PI / 2;
    const w = step * 0.3;
    const g = step * 0.2;
    if (i === broken) {
      pts.push(
        at(rIn, a - w - g),
        at(rIn * 0.72, a - w * 0.5),
        at(rIn * 0.95, a),
        at(rIn * 0.66, a + w * 0.6),
        at(rIn, a + w + g),
      );
    } else {
      pts.push(at(rIn, a - w - g), at(rOut, a - w), at(rOut, a + w), at(rIn, a + w + g));
    }
  }
  return `M${pts.join(' L')} Z`;
};

/** Solid detail in the outline colour — eyes, locks, sparkles. */
const dot = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${LINE}" stroke="none"/>`;
const spark = (x, y, r) =>
  `<path d="M${x} ${y - r} Q${x + r * 0.26} ${y - r * 0.26} ${x + r} ${y} ` +
  `Q${x + r * 0.26} ${y + r * 0.26} ${x} ${y + r} ` +
  `Q${x - r * 0.26} ${y + r * 0.26} ${x - r} ${y} ` +
  `Q${x - r * 0.26} ${y - r * 0.26} ${x} ${y - r} Z" fill="${LINE}" stroke="none"/>`;

export const MOTIFS = {
  /** 0 — the adventurer: a lute. */
  lute: () =>
    svg(
      solid('M96 108 L146 56 L162 72 L112 124 Z') +
        solidCircle(74, 128, 48) +
        dot(74, 126, 15) +
        line('M150 52 l14 -14', 7) +
        line('M164 66 l12 -12', 7) +
        spark(150, 126, 13),
      8,
      [101, 107],
    ),

  /** 1 — the teleporter trap: a vortex. Plotted, because chained SVG arcs
   *  produced a crescent rather than a spiral. */
  vortex: () => {
    const points = [];
    for (let i = 0; i <= 200; i += 2) {
      const t = i / 200;
      const angle = t * Math.PI * 5.2;
      const radius = 82 * (1 - t * 0.9);
      points.push(
        `${(100 + Math.cos(angle) * radius).toFixed(1)} ${(100 + Math.sin(angle) * radius).toFixed(1)}`,
      );
    }
    return svg(solidCircle(100, 100, 22) + line(`M${points.join(' L')}`, 9), 8, [107, 107]);
  },

  /** 2 — the mimic: a chest that bites. */
  mimic: () =>
    svg(
      solid('M40 152 v-36 h120 v36 a10 10 0 0 1 -10 10 H50 a10 10 0 0 1 -10 -10 Z') +
        solid('M40 116 a60 46 0 0 1 120 0 Z') +
        line('M50 116 l12 20 l12 -20 l12 20 l12 -20 l12 20 l12 -20 l12 20 l12 -20', 6) +
        dot(76, 88, 8) +
        dot(124, 88, 8),
      8,
      [100, 116],
    ),

  /** 3 — the trapdoor: a floor giving way. */
  trapdoor: () =>
    svg(
      solid('M96 100 L44 166 h44 L96 100 Z') +
        solid('M104 100 L156 166 h-44 L104 100 Z') +
        line('M24 100 h152', 9) +
        line('M100 20 v48') +
        line('M80 54 l20 22 l20 -22'),
      8,
      [100, 93],
    ),

  /** 4 — the golem: a slab of animated stone.
   *  Redrawn: two rounded rectangles read as a robot. It now has shoulders, a
   *  sunken head and a cracked chest. */
  golem: () =>
    svg(
      solid('M54 92 q0 -16 18 -16 h56 q18 0 18 16 l8 64 q2 14 -14 14 H60 q-16 0 -14 -14 Z') +
        solid('M74 34 h52 q12 0 12 12 v26 q0 12 -12 12 H74 q-12 0 -12 -12 V46 q0 -12 12 -12 Z') +
        dot(86, 58, 8) +
        dot(114, 58, 8) +
        line('M100 106 l-14 22 l20 10 l-10 26', 6) +
        line('M62 122 h-16', 7) +
        line('M138 122 h16', 7),
      8,
      [100, 102],
    ),

  /** 5 — the rogue: a dagger. */
  dagger: () =>
    svg(
      solid('M100 16 L130 92 L100 114 L70 92 Z') +
        line('M58 114 h84', 10) +
        line('M100 116 v40', 12) +
        solidCircle(100, 168, 14),
    ),

  /** 6 — the minotaur: a bull's skull.
   *  Redrawn twice: thin curves read as ears, and thick shapes rising vertically
   *  read as a rabbit's. Horns must sweep *outward* from the head before they
   *  taper, or the silhouette is a bunny. */
  minotaur: () =>
    svg(
      solid('M74 96 C40 100 16 80 14 44 C24 74 46 86 78 82 Z') +
        solid('M126 96 C160 100 184 80 186 44 C176 74 154 86 122 82 Z') +
        solid(
          'M64 74 h72 q14 0 12 18 l-6 28 q-4 26 -26 34 q-20 6 -40 0 q-22 -8 -26 -34 l-6 -28 q-2 -18 12 -18 Z',
        ) +
        dot(80, 100, 8) +
        dot(120, 100, 8) +
        dot(92, 132, 5) +
        dot(108, 132, 5) +
        line('M100 146 a13 13 0 1 0 0.1 0', 6),
      8,
      [100, 107],
    ),

  /** 7 — the wizard: a pointed hat. */
  wizardHat: () =>
    svg(
      solid('M100 22 L136 122 H64 Z') +
        solid('M100 108 a62 18 0 0 0 0 36 a62 18 0 0 0 0 -36 Z') +
        line('M74 98 h52', 7) +
        spark(150, 58, 15) +
        spark(52, 84, 11),
      8,
      [100, 83],
    ),

  /** 8 — the cleric: a chalice. */
  chalice: () =>
    svg(
      solid('M54 66 h92 a46 50 0 0 1 -92 0 Z') +
        line('M100 116 v30', 11) +
        solid('M64 146 h72 q8 0 8 10 h-88 q0 -10 8 -10 Z') +
        line('M100 22 v20') +
        line('M60 38 l14 16') +
        line('M140 38 l-14 16'),
      8,
      [100, 89],
    ),

  /** 9 — the blink dog: a hound, half here. */
  hound: () =>
    svg(
      solid('M64 88 L52 44 L92 66 Z') +
        solid('M136 88 L148 44 L108 66 Z') +
        solidCircle(100, 114, 42) +
        dot(84, 106, 7) +
        dot(116, 106, 7) +
        line('M92 136 h16', 8) +
        spark(164, 128, 14) +
        spark(38, 144, 11),
      8,
      [103, 100],
    ),

  /** 10 — the fighter: a shield. */
  shield: () =>
    svg(
      solid('M100 28 l50 20 v42 q0 46 -50 68 q-50 -22 -50 -68 v-42 Z') +
        line('M100 62 v78', 8) +
        line('M70 94 h60', 8),
      8,
      [100, 93],
    ),

  /** 11 — the cursed coin: cracked gold. */
  coin: () =>
    svg(
      solidCircle(100, 100, 60) +
        line('M100 58 a42 42 0 0 1 0 84 a42 42 0 0 1 0 -84', 6) +
        line('M100 56 l-16 30 l20 16 l-14 42', 7),
    ),

  /** 12 — the dwarf: a helmet and a beard, which is the whole silhouette.
   *  Nothing below the brim but beard — a face drawn in proportion disappears at
   *  63 mm and leaves an outline that could be any helmeted head. */
  dwarf: () =>
    svg(
      solid('M64 104 C46 134 44 158 100 184 C156 158 154 134 136 104 Z') +
        solid('M62 74 a38 38 0 0 1 76 0 Z') +
        line('M48 74 h104', 9) +
        line('M100 78 v26', 8) +
        dot(80, 92, 7) +
        dot(120, 92, 7),
      8,
      [100, 110],
    ),

  /** 13 — the staff of power: a gem on a shaft. */
  staff: () =>
    svg(
      solid('M100 12 l34 38 l-34 38 l-34 -38 Z') +
        line('M100 88 v88', 14) +
        line('M148 54 l16 -10') +
        line('M52 54 l-16 -10') +
        line('M152 92 l18 4') +
        line('M48 92 l-18 4'),
      8,
      [100, 96],
    ),

  /** 14 — the teleportation circle.
   *  Redrawn for M8: the original lived in decor.js and kept 1.4-2.6 stroke
   *  weights and 24 tick marks, so it read as fine engraving beside motifs
   *  drawn at 8. Same idea, same weight as everything else. */
  magicCircle: () => {
    const ticks = [];
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const [c, s] = [Math.cos(a), Math.sin(a)];
      ticks.push(
        line(
          `M${(100 + c * 62).toFixed(1)} ${(100 + s * 62).toFixed(1)} ` +
            `L${(100 + c * 76).toFixed(1)} ${(100 + s * 76).toFixed(1)}`,
          8,
        ),
      );
    }
    return svg(
      solidCircle(100, 100, 84) +
        line('M100 44 a56 56 0 0 1 0 112 a56 56 0 0 1 0 -112', 8) +
        ticks.join('') +
        spark(100, 100, 40),
    );
  },

  /** D — the treasure: a chest, open. */
  chest: () =>
    svg(
      solid('M36 158 v-54 h128 v54 a8 8 0 0 1 -8 8 H44 a8 8 0 0 1 -8 -8 Z') +
        solid('M36 104 a64 38 0 0 1 128 0 Z') +
        line('M100 104 v62', 7) +
        `<rect x="88" y="116" width="24" height="24" rx="5" fill="${LINE}" stroke="none"/>` +
        spark(44, 56, 15) +
        spark(160, 42, 12) +
        spark(152, 78, 9),
    ),

  /* ---- "Michi, mach mal Mittag!" -----------------------------------------
   * A working day rather than a dungeon. Motifs are shared by every theme, so
   * these sit alongside the dungeon set; a theme only draws the ones its cards
   * name, and the card back tiles only those.
   */

  /** 0 — Michi. A silhouette portrait: head and hair are one mass with no face
   *  in it at all, which is what every avatar icon does and what three earlier
   *  attempts at drawing a face kept failing to do. Two things carry the read —
   *  the hair kicking *outward* at the jaw, without which it is an egg, and the
   *  V of the collar notched out of shoulders wider than the hair. */
  michi: () =>
    svg(
      solid('M14 196 C16 168 42 148 72 142 L100 182 L128 142 C158 148 184 168 186 196 Z') +
        solid(
          'M100 26 C66 26 44 50 44 84 C44 104 36 120 32 134 C52 142 72 146 100 146 ' +
            'C128 146 148 142 168 134 C164 120 156 104 156 84 C156 50 134 26 100 26 Z',
        ),
      8,
      [100, 110],
    ),

  /** 1 — Chaos: two arrows crossing, for the card that swaps its neighbours. */
  crossedArrows: () =>
    svg(
      line('M44 56 L156 144', 10) +
        line('M156 56 L44 144', 10) +
        line('M156 144 l-2 -26 M156 144 l-26 2', 9) +
        line('M44 144 l2 -26 M44 144 l26 2', 9),
    ),

  /** 2 — Stress: the deck's antagonist, and the only card that destroys. */
  bolt: () => svg(solid('M112 22 L60 108 L94 108 L84 178 L140 88 L104 88 Z')),

  /** 3 — Machine failure: a cog with a tooth broken out of it. */
  cog: () => svg(solid(gearPath(100, 100, 82, 58, 8, 2)) + solidCircle(100, 100, 24), 8, [95, 100]),

  /** 4 — Setback: an arrow turning a full 180 and heading back. */
  backArrow: () =>
    svg(
      line('M56 66 h50 a36 36 0 0 1 0 72 h-50', 12) +
        line('M56 138 l30 -24 M56 138 l30 24', 12),
      8,
      [99, 114],
    ),

  /** 5 — Good idea. */
  bulb: () =>
    svg(
      solid('M100 24 a46 46 0 0 1 28 82 l0 20 h-56 l0 -20 a46 46 0 0 1 28 -82 Z') +
        line('M76 140 h48', 10) +
        line('M84 158 h32', 9) +
        spark(164, 44, 12) +
        spark(38, 52, 10),
      8,
      [102, 91],
    ),

  /** 6 — The boss. A necktie needs no face to be read as one. */
  necktie: () =>
    svg(solid('M80 26 h40 l14 20 l-20 22 h-28 l-20 -22 Z') + solid('M86 74 h28 l14 62 l-28 42 l-28 -42 Z'), 8, [100, 102]),

  /** 7 — Sweetheart. */
  heart: () =>
    svg(solid('M100 172 C30 126 26 82 50 62 C72 44 94 56 100 74 C106 56 128 44 150 62 C174 82 170 126 100 172 Z'), 8, [100, 113]),

  /** 8 — Meditation: a seated figure. */
  lotus: () =>
    svg(
      solidCircle(100, 48, 22) +
        solid('M100 78 C126 78 142 96 146 124 C150 150 130 158 100 158 C70 158 50 150 54 124 C58 96 74 78 100 78 Z') +
        line('M40 140 q20 -18 46 -10', 8) +
        line('M160 140 q-20 -18 -46 -10', 8),
      8,
      [100, 92],
    ),

  /** 9 — A walk. */
  boot: () =>
    svg(
      solid(
        'M66 34 h40 a8 8 0 0 1 8 8 v68 l44 20 a28 28 0 0 1 16 25 v7 ' +
          'a8 8 0 0 1 -8 8 H66 a8 8 0 0 1 -8 -8 V42 a8 8 0 0 1 8 -8 Z',
      ) + line('M58 152 h116', 9),
      8,
      [116, 102],
    ),

  /** 10 — The nice colleague: someone talking to you. */
  bubble: () =>
    svg(
      solid(
        'M40 44 h120 a14 14 0 0 1 14 14 v66 a14 14 0 0 1 -14 14 h-56 l-32 28 v-28 ' +
          'h-32 a14 14 0 0 1 -14 -14 v-66 a14 14 0 0 1 14 -14 Z',
      ) +
        dot(74, 90, 8) +
        dot(100, 90, 8) +
        dot(126, 90, 8),
      8,
      [100, 105],
    ),

  /** 11 — Deadline. */
  alarm: () =>
    svg(
      solidCircle(100, 112, 58) +
        solid('M48 46 a26 26 0 0 0 -18 30 Z') +
        solid('M152 46 a26 26 0 0 1 18 30 Z') +
        line('M100 112 V72', 9) +
        line('M100 112 l28 18', 9) +
        line('M62 162 l-14 18', 9) +
        line('M138 162 l14 18', 9),
      8,
      [100, 113],
    ),

  /** 12 — Priorities: a stack, longest first. */
  bars: () =>
    svg(
      solid('M36 48 h96 v26 h-96 Z') +
        solid('M36 88 h68 v26 h-68 Z') +
        solid('M36 128 h44 v26 h-44 Z') +
        spark(158, 61, 16),
      8,
      [103, 101],
    ),

  /** 13 — Focus: a target reticle. */
  reticle: () =>
    svg(
      line('M100 100 m-54 0 a54 54 0 1 0 108 0 a54 54 0 1 0 -108 0', 9) +
        solidCircle(100, 100, 24) +
        dot(100, 100, 9) +
        line('M100 18 v22 M100 160 v22 M18 100 h22 M160 100 h22', 9),
    ),

  /** 14 — Delegate: a paper plane, sending the task to someone else.
   *  A pointing hand was tried six ways and failed every time. A hand needs a
   *  separated finger, folded knuckles and a thumb to read as one, and none of
   *  that survives an 8-unit stroke at 63 mm — it came out as a pipe fitting, a
   *  pot and a mitten. The fold line is what stops the plane reading as a plain
   *  triangle or a cursor. */
  plane: () =>
    svg(solid('M26 92 L174 36 L106 112 Z') + solid('M106 112 L174 36 L138 168 Z'), 8, [100, 102]),

  /** D — the lunch break, and the goal of the whole deck. */
  mug: () =>
    svg(
      solid('M46 70 h80 v56 a28 28 0 0 1 -28 28 h-24 a28 28 0 0 1 -28 -28 Z') +
        line('M128 86 a24 24 0 0 1 0 40', 11) +
        line('M66 50 q-10 -16 0 -30', 8) +
        line('M90 44 q-10 -18 0 -32', 8) +
        line('M114 50 q-10 -16 0 -30', 8),
      8,
      [93, 83],
    ),
};
