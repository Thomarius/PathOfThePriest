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
 * Central emblem for the shared card back.
 *
 * Deliberately abstract. The 14 Masters are shuffled face down, so this mark
 * must give away nothing — it cannot hint at True versus Fake, and it must be
 * identical on all fourteen.
 */
export function emblem(kind = 'lozenge') {
  const shapes = {
    lozenge: `
      <path d="M50 3 L97 50 L50 97 L3 50 Z" stroke-width="2.5"/>
      <path d="M50 15 L85 50 L50 85 L15 50 Z" stroke-width="1.2" opacity="0.7"/>
      <path d="M50 28 L59 44 L75 50 L59 56 L50 72 L41 56 L25 50 L41 44 Z"
            fill="currentColor" stroke="none"/>`,
    star: `
      <circle cx="50" cy="50" r="44" stroke-width="4"/>
      <path d="M50 8 L61 38 L92 39 L67 57 L76 88 L50 70 L24 88 L33 57 L8 39 L39 38 Z"
            fill="currentColor" stroke="currentColor" stroke-width="5"/>`,
    ring: `
      <circle cx="50" cy="50" r="46" stroke-width="2.5"/>
      <circle cx="50" cy="50" r="34" stroke-width="1.2" opacity="0.7"/>
      <path d="M50 26 L57 43 L74 50 L57 57 L50 74 L43 57 L26 50 L43 43 Z"
            fill="currentColor" stroke="none"/>`,
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
