/**
 * Drawn motifs for the art window.
 *
 * A theme can give any card a `motif` instead of an image file. They serve two
 * purposes: as a stand-in while artwork is being sourced, and as the permanent
 * answer for cards nothing in the public domain depicts — a teleportation
 * circle among them.
 *
 * All are stroked in `currentColor` and sized in a 200x200 box, so they take the
 * card's palette and scale with the layout. Bold and simple on purpose: at
 * 63 mm a detailed line drawing turns to mud.
 *
 * Deterministic: no randomness here at all, and `magicCircle` (in decor.js)
 * takes a seed.
 */

const wrap = (body, stroke = 7) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none"
        stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round"
        stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

/** Four-point sparkle, reused as a decorative accent by several motifs. */
const sparkle = (x, y, r) =>
  `<path d="M${x} ${y - r} Q${x + r * 0.25} ${y - r * 0.25} ${x + r} ${y} ` +
  `Q${x + r * 0.25} ${y + r * 0.25} ${x} ${y + r} ` +
  `Q${x - r * 0.25} ${y + r * 0.25} ${x - r} ${y} ` +
  `Q${x - r * 0.25} ${y - r * 0.25} ${x} ${y - r} Z" fill="currentColor" stroke="none"/>`;

export const MOTIFS = {
  /** 0 — the adventurer: a lute. */
  lute: () =>
    wrap(
      '<ellipse cx="78" cy="132" rx="46" ry="42"/>' +
        '<circle cx="78" cy="128" r="13" fill="currentColor" stroke="none"/>' +
        '<path d="M110 102 L156 54"/><path d="M150 46 l16 -16"/>' +
        '<path d="M160 64 l10 -10"/>' +
        sparkle(150, 118, 12),
    ),

  /** 1 — the teleporter trap: a vortex. Plotted, because chained SVG arcs
   *  produced a crescent rather than a spiral. */
  vortex: () => {
    const points = [];
    for (let i = 0; i <= 200; i += 2) {
      const t = i / 200;
      const angle = t * Math.PI * 5.2;
      const radius = 86 * (1 - t * 0.93);
      points.push(`${(100 + Math.cos(angle) * radius).toFixed(1)} ${(100 + Math.sin(angle) * radius).toFixed(1)}`);
    }
    return wrap(`<path d="M${points.join(' L')}"/>`);
  },

  /** 2 — the mimic: a chest that bites. */
  mimic: () =>
    wrap(
      '<path d="M40 150 v-34 h120 v34 a10 10 0 0 1 -10 10 H50 a10 10 0 0 1 -10 -10 Z"/>' +
        '<path d="M40 116 a60 44 0 0 1 120 0"/>' +
        '<path d="M50 116 l12 18 l12 -18 l12 18 l12 -18 l12 18 l12 -18 l12 18 l12 -18" stroke-width="5"/>' +
        '<circle cx="76" cy="90" r="7" fill="currentColor" stroke="none"/>' +
        '<circle cx="124" cy="90" r="7" fill="currentColor" stroke="none"/>',
    ),

  /** 3 — the trapdoor: a hatch swinging open. */
  trapdoor: () =>
    wrap(
      '<path d="M26 96 h148"/>' +
        '<path d="M96 96 L52 162 h34 L96 96"/>' +
        '<path d="M104 96 L148 162 h-34 L104 96"/>' +
        '<path d="M100 18 v50"/><path d="M82 52 l18 20 l18 -20"/>',
    ),

  /** 4 — the golem: stacked stone. */
  golem: () =>
    wrap(
      '<rect x="64" y="34" width="72" height="56" rx="12"/>' +
        '<rect x="46" y="102" width="108" height="64" rx="12"/>' +
        '<circle cx="86" cy="62" r="7" fill="currentColor" stroke="none"/>' +
        '<circle cx="114" cy="62" r="7" fill="currentColor" stroke="none"/>' +
        '<path d="M46 130 h108" stroke-width="5"/>' +
        '<path d="M100 102 v64" stroke-width="5"/>',
    ),

  /** 5 — the rogue: a dagger. */
  dagger: () =>
    wrap(
      '<path d="M100 22 L120 92 L100 108 L80 92 Z"/>' +
        '<path d="M66 108 h68"/>' +
        '<path d="M100 108 v48"/>' +
        '<circle cx="100" cy="166" r="11"/>',
    ),

  /** 6 — the minotaur: horns. */
  minotaur: () =>
    wrap(
      '<path d="M64 98 q-38 -4 -38 -50 q32 8 44 38"/>' +
        '<path d="M136 98 q38 -4 38 -50 q-32 8 -44 38"/>' +
        '<ellipse cx="100" cy="116" rx="40" ry="44"/>' +
        '<circle cx="86" cy="106" r="7" fill="currentColor" stroke="none"/>' +
        '<circle cx="114" cy="106" r="7" fill="currentColor" stroke="none"/>' +
        '<path d="M88 144 q12 10 24 0"/>',
    ),

  /** 7 — the wizard: a pointed hat. */
  wizardHat: () =>
    wrap(
      '<path d="M100 26 L134 126 H66 Z"/>' +
        '<ellipse cx="100" cy="132" rx="62" ry="14"/>' +
        '<path d="M78 96 h44" stroke-width="5"/>' +
        sparkle(146, 62, 14) +
        sparkle(56, 86, 10),
    ),

  /** 8 — the cleric: a chalice. */
  chalice: () =>
    wrap(
      '<path d="M68 76 a32 34 0 0 0 64 0 Z"/>' +
        '<path d="M100 110 v42"/>' +
        '<path d="M72 156 h56"/>' +
        '<path d="M100 26 v22"/><path d="M62 42 l14 16"/><path d="M138 42 l-14 16"/>',
    ),

  /** 9 — the blink dog: a hound, half here. */
  hound: () =>
    wrap(
      '<path d="M66 88 l-12 -36 l32 18"/>' +
        '<path d="M134 88 l12 -36 l-32 18"/>' +
        '<ellipse cx="100" cy="116" rx="40" ry="38"/>' +
        '<circle cx="86" cy="108" r="6" fill="currentColor" stroke="none"/>' +
        '<circle cx="114" cy="108" r="6" fill="currentColor" stroke="none"/>' +
        '<path d="M92 136 h16" stroke-width="6"/>' +
        sparkle(160, 130, 13) +
        sparkle(40, 142, 10),
    ),

  /** 10 — the fighter: sword and shield. */
  shield: () =>
    wrap(
      '<path d="M100 32 l48 20 v40 q0 44 -48 66 q-48 -22 -48 -66 v-40 Z"/>' +
        '<path d="M100 66 v76"/>' +
        '<path d="M72 96 h56"/>',
    ),

  /** 11 — the cursed coin: cracked gold. */
  coin: () =>
    wrap(
      '<circle cx="100" cy="102" r="58"/>' +
        '<circle cx="100" cy="102" r="42"/>' +
        '<path d="M100 60 l-14 28 l18 14 l-12 42" stroke-width="6"/>',
    ),

  /** 12 — the pack mule: a laden sack. */
  sack: () =>
    wrap(
      '<path d="M88 46 q12 -6 24 0 l-6 32 q26 14 34 42 q10 38 -40 38 q-50 0 -40 -38 q8 -28 34 -42 Z"/>' +
        '<path d="M82 80 q18 10 36 0" stroke-width="6"/>' +
        '<path d="M70 132 q30 12 60 0" stroke-width="5"/>',
    ),

  /** 13 — the staff of power: a gem on a shaft. */
  staff: () =>
    wrap(
      '<path d="M100 22 l24 28 l-24 28 l-24 -28 Z"/>' +
        '<path d="M100 78 v98"/>' +
        '<path d="M146 60 l16 -8"/><path d="M54 60 l-16 -8"/>' +
        '<path d="M150 96 l18 4"/><path d="M50 96 l-18 4"/>',
    ),

  /** D — the treasure: a chest, open. */
  chest: () =>
    wrap(
      '<path d="M38 156 v-52 h124 v52 a8 8 0 0 1 -8 8 H46 a8 8 0 0 1 -8 -8 Z"/>' +
        '<path d="M38 104 a62 36 0 0 1 124 0"/>' +
        '<path d="M100 104 v60" stroke-width="5"/>' +
        '<rect x="88" y="116" width="24" height="22" rx="5" fill="currentColor" stroke="none"/>' +
        sparkle(48, 58, 14) +
        sparkle(158, 44, 11) +
        sparkle(150, 78, 8),
    ),
};
