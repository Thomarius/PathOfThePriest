/**
 * Procedural decoration for card fronts and backs.
 *
 * `src/` implements a vocabulary of ornament; the theme chooses from it via
 * `theme.decor`. Nothing here knows what the topic is — a stone frame and a
 * parchment grain are primitives, not dungeon-specific code.
 *
 * DETERMINISM: no `Math.random()`, ever. Output must be byte-identical between
 * runs, so anything that looks random is either fixed by construction or driven
 * by the seeded generator below. SVG `feTurbulence` is safe: its noise lattice
 * is fully specified by the SVG spec and keyed on an explicit `seed`.
 */

import { MOTIFS } from './motifs.js';

/** Small deterministic PRNG (mulberry32), for placing ornament reproducibly. */
export function seeded(seedText) {
  let h = 1779033703 ^ String(seedText).length;
  for (const ch of String(seedText)) {
    h = Math.imul(h ^ ch.charCodeAt(0), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/*
 * Single-quoted, with any apostrophe percent-encoded.
 *
 * These URLs end up inside a `style="..."` attribute. A double quote there
 * terminates the attribute early and silently drops every custom property that
 * follows it — which cost a debugging session when --ink, --paper and --accent
 * vanished and every Hazard card rendered in the Ally palette while otherwise
 * looking entirely plausible.
 */
/* NOTE: write plain '#' in the SVG above. Pre-encoding it as %23 here would be
   double-escaped by encodeURIComponent into %2523, which silently corrupted
   every colour and the grain's filter reference. */
const svgUrl = (svg) =>
  `url('data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, ' ').trim()).replace(/'/g, '%27')}')`;

/**
 * Paper/stone grain as a tiling noise field. Laid over the whole card at low
 * opacity, it removes the flat digital look that flat colour fills have in print.
 */
export function grain({ frequency = 0.9, octaves = 4, seed = 3, opacity = 0.42 } = {}) {
  return svgUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="180" height="180">
      <filter id="g" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="${frequency}"
                      numOctaves="${octaves}" seed="${seed}" stitchTiles="stitch"/>
        <feColorMatrix type="saturate" values="0"/>
      </filter>
      <rect width="180" height="180" filter="url(#g)" opacity="${opacity}"/>
    </svg>`);
}

/** Diagonal hatch used behind cards that have no artwork yet. */
export function hatch({ size = 16, width = 6, color = '#000', opacity = 0.16 } = {}) {
  return svgUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <path d="M-${width} ${width} l${size} -${size} M0 ${size} l${size} -${size} M${size - width} ${size + width} l${size} -${size}"
            stroke="${color}" stroke-width="${width}" opacity="${opacity}"/>
    </svg>`);
}

/**
 * Interlocking stone courses, for the shared Master back and hazard panels.
 * Offsets come from the seeded generator so the coursing is irregular but
 * identical on every run.
 */
export function stone({ seed = 'stone', cols = 4, rows = 6, color = '#000', opacity = 0.2 } = {}) {
  const rand = seeded(seed);
  const w = 120;
  const h = 120;
  const cellW = w / cols;
  const cellH = h / rows;
  const blocks = [];

  for (let r = 0; r < rows; r += 1) {
    const offset = (r % 2 ? cellW / 2 : 0) + (rand() - 0.5) * cellW * 0.18;
    for (let c = -1; c <= cols; c += 1) {
      const x = (c * cellW + offset).toFixed(2);
      const y = (r * cellH).toFixed(2);
      const bw = (cellW * (0.82 + rand() * 0.12)).toFixed(2);
      const bh = (cellH * 0.78).toFixed(2);
      blocks.push(`<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="1.5"/>`);
    }
  }

  return svgUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
      <g fill="none" stroke="${color}" stroke-width="2" opacity="${opacity}">${blocks.join('')}</g>
    </svg>`);
}

/**
 * A tiling pattern built from the card motifs themselves.
 *
 * Colours are baked in at generation time rather than left as custom
 * properties: this becomes a background-image data URI, which is a separate
 * document and does not inherit the page's CSS variables.
 *
 * Drawn outline-only and at low opacity — the motifs are the subject on a card
 * face, but only texture here.
 *
 * Safe for the shared Masters back: all 14 carry the identical tile, so nothing
 * distinguishes one from another. The mix of Ally and Hazard subjects is
 * cosmetic; what would leak information is variation *between* cards.
 */
export function motifPattern({ names, ink = '#000', opacity = 0.16, cols = 4 } = {}) {
  const cell = 200;
  const size = cols * cell;
  const parts = [];

  names.forEach((name, i) => {
    const draw = MOTIFS[name];
    if (!draw) return;
    const inner = draw()
      .replace(/^[\s\S]*?>/, '')
      .replace(/<\/svg>\s*$/, '')
      .split('var(--motif-fill, none)')
      .join('none')
      .split('var(--motif-shade, none)')
      .join('none')
      .split('var(--motif-line, currentColor)')
      .join(ink);
    const x = (i % cols) * cell;
    const y = Math.floor(i / cols) * cell;
    parts.push(`<g transform="translate(${x} ${y})">${inner}</g>`);
  });

  return svgUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"
         viewBox="0 0 ${size} ${size}">
      <g fill="none" stroke="${ink}" stroke-width="8" stroke-linecap="round"
         stroke-linejoin="round" opacity="${opacity}">${parts.join('')}</g>
    </svg>`);
}

/**
 * Central emblem for the shared card back.
 *
 * Deliberately abstract. The 14 Masters are shuffled face down, so this mark
 * must give away nothing — it cannot hint at True versus Fake, and it must be
 * identical on all fourteen.
 */
/**
 * A regular n-pointed star, centred and with every outer point at one radius.
 *
 * Plotted rather than hand-written: the hand-written star had its outer vertices
 * spread across radii 42 to 46 and its two bottom points crossing the ring that
 * surrounds it. An off-centre point is invisible in isolation and obvious once a
 * circle is drawn around it.
 */
function starPath(cx, cy, outer, innerRatio = 0.42, points = 5) {
  const pts = [];
  for (let i = 0; i < points * 2; i += 1) {
    const r = i % 2 ? outer * innerRatio : outer;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    pts.push(`${(cx + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r).toFixed(1)}`);
  }
  return `M${pts.join(' L')} Z`;
}

export function emblem(kind = 'lozenge') {
  const shapes = {
    lozenge: `
      <path d="M50 3 L97 50 L50 97 L3 50 Z" stroke-width="2.5"/>
      <path d="M50 15 L85 50 L50 85 L15 50 Z" stroke-width="1.2" opacity="0.7"/>
      <path d="M50 28 L59 44 L75 50 L59 56 L50 72 L41 56 L25 50 L41 44 Z"
            fill="currentColor" stroke="none"/>`,
    /* Outer radius 37 plus the 5-wide stroke paints to 39.5, inside the ring's
       own inner edge at 42, so the star sits within the circle instead of
       breaking out of it. */
    star: `
      <circle cx="50" cy="50" r="44" stroke-width="4"/>
      <path d="${starPath(50, 50, 37)}"
            fill="currentColor" stroke="currentColor" stroke-width="5"/>`,
    ring: `
      <circle cx="50" cy="50" r="46" stroke-width="2.5"/>
      <circle cx="50" cy="50" r="34" stroke-width="1.2" opacity="0.7"/>
      <path d="M50 26 L57 43 L74 50 L57 57 L50 74 L43 57 L26 50 L43 43 Z"
            fill="currentColor" stroke="none"/>`,
    /*
     * Noon. Both hands point straight up, so the mark is symmetric about the
     * vertical and cannot be read as pointing at any card. At 12:00 the hands
     * coincide, so they are told apart by weight and reach rather than angle —
     * drawn at one width they read as a single line.
     */
    clock: `
      <circle cx="50" cy="50" r="44" stroke-width="4"/>
      <path d="M50 12 v7 M50 81 v7 M12 50 h7 M81 50 h7" stroke-width="4"
            stroke-linecap="round"/>
      <path d="M50 50 V30" stroke-width="8" stroke-linecap="round"/>
      <path d="M50 50 V21" stroke-width="4.5" stroke-linecap="round"/>
      <circle cx="50" cy="50" r="5.5" fill="currentColor" stroke="none"/>`,
  };

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"
               stroke="currentColor" stroke-linejoin="round" aria-hidden="true">
            ${shapes[kind] ?? shapes.lozenge}
          </svg>`;
}

/**
 * Resolves `theme.decor` into CSS custom properties and class names.
 * Unknown values fall back to nothing rather than throwing, so a half-written
 * theme still renders and the validator reports the problem.
 */
/**
 * The motifs a theme actually puts on its cards, in card order, deduplicated.
 *
 * Falls back to every known motif so a theme that draws none still gets a
 * pattern rather than an empty tile.
 */
function themeMotifs(theme) {
  const used = [];
  for (const card of Object.values(theme.cards ?? {})) {
    if (card.motif && MOTIFS[card.motif] && !used.includes(card.motif)) used.push(card.motif);
  }
  return used.length ? used : Object.keys(MOTIFS);
}

export function decorFor(theme) {
  const decor = theme.decor ?? {};
  const seed = decor.seed ?? theme.id ?? 'seed';

  const classes = [];
  for (const [key, value] of Object.entries(decor)) {
    if (key === 'seed' || !value || value === 'none' || value === true) {
      if (value === true) classes.push(`decor-${key}`);
      continue;
    }
    if (typeof value === 'string') classes.push(`decor-${key}--${value}`);
  }

  const vars = [];
  if (decor.texture === 'grain') {
    // feTurbulence needs a numeric seed, so the theme's seed string is folded
    // into one deterministically.
    vars.push(`--decor-texture:${grain({ seed: Math.floor(seeded(`${seed}-grain`)() * 9999) })}`);
  } else if (decor.texture === 'dots') {
    vars.push(`--decor-texture:${dots({})}`);
  } else if (decor.texture === 'stone') {
    vars.push(`--decor-texture:${stone({ seed: `${seed}-stone` })}`);
  }
  vars.push(`--decor-hatch:${hatch({})}`);
  // Coloured from the back's own ink at generation time. Painting it black
  // made it invisible on dark stock, and a CSS mask did not survive the data
  // URI reliably; the theme already knows the colour, so use it directly.
  const backInk = theme.palette?.master?.ink ?? '#000000';
  const backPatterns = {
    stone: () => stone({ seed: `${seed}-back`, color: backInk, opacity: 0.13 }),
    scales: () => scales({ color: backInk, opacity: 0.3 }),
    rays: () => rays({ color: backInk, opacity: 0.18 }),
    dots: () => dots({ color: backInk, opacity: 0.22 }),
    motifs: () =>
      motifPattern({
        // The theme's own motifs, not every motif in the module. MOTIFS is
        // shared by every theme, so tiling all of it would put one deck's
        // drawings on another deck's back as soon as a second theme exists.
        names: themeMotifs(theme),
        ink: backInk,
        // Tone-on-tone: dark ink on a mid field needs far more than the 0.17
        // used for the stone texture, or the pattern simply is not there.
        opacity: 0.38,
        cols: 4,
      }),
  };
  const backPattern = backPatterns[decor.backPattern] ?? backPatterns.stone;
  vars.push(`--decor-back:${backPattern()}`);

  return { classes, vars, emblem: decor.emblem ?? 'lozenge' };
}


/** Halftone dots — the screentone of printed manga, for bright themes. */
export function dots({ size = 14, radius = 3.1, color = '#000', opacity = 0.16 } = {}) {
  return svgUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <g fill="${color}" opacity="${opacity}">
        <circle cx="${size / 4}" cy="${size / 4}" r="${radius}"/>
        <circle cx="${(size * 3) / 4}" cy="${(size * 3) / 4}" r="${radius}"/>
      </g>
    </svg>`);
}

/** Overlapping scales / fish-scale tiling, for a bright card back. */
export function scales({ size = 60, color = '#000', opacity = 0.22 } = {}) {
  const r = size / 2;
  return svgUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${r}">
      <g fill="none" stroke="${color}" stroke-width="2.4" opacity="${opacity}">
        <path d="M0 ${r} a ${r} ${r} 0 0 1 ${size} 0"/>
        <path d="M${-r} ${r} a ${r} ${r} 0 0 1 ${size} 0" transform="translate(0 ${-r})"/>
        <path d="M${r} ${r} a ${r} ${r} 0 0 1 ${size} 0" transform="translate(0 ${-r})"/>
      </g>
    </svg>`);
}

/** Radiating sunburst, the classic bright-fantasy backdrop. */
export function rays({ count = 16, color = '#000', opacity = 0.16 } = {}) {
  const wedges = [];
  for (let i = 0; i < count; i += 2) {
    const a0 = (i / count) * Math.PI * 2;
    const a1 = ((i + 1) / count) * Math.PI * 2;
    wedges.push(
      `<path d="M100 100 L${(100 + Math.cos(a0) * 160).toFixed(1)} ${(100 + Math.sin(a0) * 160).toFixed(1)} ` +
        `L${(100 + Math.cos(a1) * 160).toFixed(1)} ${(100 + Math.sin(a1) * 160).toFixed(1)} Z"/>`,
    );
  }
  return svgUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
      <g fill="${color}" opacity="${opacity}">${wedges.join('')}</g>
    </svg>`);
}
