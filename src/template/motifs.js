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
 */
const svg = (body, stroke = 8) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none"
        stroke="${LINE}" stroke-width="${stroke}" stroke-linecap="round"
        stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

/** Filled silhouette with an outline. */
const solid = (d) => `<path d="${d}" fill="${FILL}"/>`;
const solidCircle = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${FILL}"/>`;

/** Outline only. */
const line = (d, w) => `<path d="${d}"${w ? ` stroke-width="${w}"` : ''}/>`;

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
    return svg(solidCircle(100, 100, 22) + line(`M${points.join(' L')}`, 9));
  },

  /** 2 — the mimic: a chest that bites. */
  mimic: () =>
    svg(
      solid('M40 152 v-36 h120 v36 a10 10 0 0 1 -10 10 H50 a10 10 0 0 1 -10 -10 Z') +
        solid('M40 116 a60 46 0 0 1 120 0 Z') +
        line('M50 116 l12 20 l12 -20 l12 20 l12 -20 l12 20 l12 -20 l12 20 l12 -20', 6) +
        dot(76, 88, 8) +
        dot(124, 88, 8),
    ),

  /** 3 — the trapdoor: a floor giving way. */
  trapdoor: () =>
    svg(
      solid('M96 100 L44 166 h44 L96 100 Z') +
        solid('M104 100 L156 166 h-44 L104 100 Z') +
        line('M24 100 h152', 9) +
        line('M100 20 v48') +
        line('M80 54 l20 22 l20 -22'),
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
    ),

  /** 7 — the wizard: a pointed hat. */
  wizardHat: () =>
    svg(
      solid('M100 22 L136 122 H64 Z') +
        solid('M100 108 a62 18 0 0 0 0 36 a62 18 0 0 0 0 -36 Z') +
        line('M74 98 h52', 7) +
        spark(150, 58, 15) +
        spark(52, 84, 11),
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
    ),

  /** 10 — the fighter: a shield. */
  shield: () =>
    svg(
      solid('M100 28 l50 20 v42 q0 46 -50 68 q-50 -22 -50 -68 v-42 Z') +
        line('M100 62 v78', 8) +
        line('M70 94 h60', 8),
    ),

  /** 11 — the cursed coin: cracked gold. */
  coin: () =>
    svg(
      solidCircle(100, 100, 60) +
        line('M100 58 a42 42 0 0 1 0 84 a42 42 0 0 1 0 -84', 6) +
        line('M100 56 l-16 30 l20 16 l-14 42', 7),
    ),

  /** 12 — the pack mule: a laden sack. */
  sack: () =>
    svg(
      solid('M88 42 q12 -6 24 0 l-6 34 q28 16 36 46 q10 40 -42 40 q-52 0 -42 -40 q8 -30 36 -46 Z') +
        line('M82 78 q18 12 36 0', 7) +
        line('M68 132 q32 14 64 0', 6),
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
};
