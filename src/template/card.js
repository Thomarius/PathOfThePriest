/**
 * Card face template.
 *
 * Consumes the render model produced by src/model.js and emits HTML. It has no
 * knowledge of the theme's topic or the language being printed — everything it
 * draws comes from the model.
 */

import { icon } from '../icons/index.js';
import { decorFor } from './decor.js';
import { MOTIFS as DRAWN_MOTIFS } from './motifs.js';

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Renders a parsed segment list to inline HTML. */
export function renderSegments(segments) {
  return segments
    .map((seg, i) => {
      switch (seg.t) {
        case 'icon':
          return icon(seg.name);
        case 'text': {
          // Glyphs follow the keyword they annotate ("Swap <swap> the 2 …"), so
          // the space before one is made non-breaking. Otherwise a wrap can
          // strand the icon at the start of the next line, away from its verb.
          const next = segments[i + 1];
          if (next?.t === 'icon' && /\s$/.test(seg.v)) {
            return `${escapeHtml(seg.v.replace(/\s+$/, ''))}&nbsp;`;
          }
          return escapeHtml(seg.v);
        }
        case 'card':
          // Card names are set apart because effects on cards 6 and 11 target a
          // specific other card; the player has to spot it while scanning.
          return `<span class="card__cardref">${escapeHtml(seg.v)}</span>`;
        case 'faction':
          return escapeHtml(seg.v);
        default:
          return escapeHtml(seg.v);
      }
    })
    .join('');
}

function renderEffects(card, ui) {
  const parts = [];

  card.effects.forEach((effect, i) => {
    const previous = card.effects[i - 1];

    // True Masters resolve exactly one effect, so consecutive choices are
    // separated by "or" rather than stacked like a sequence of steps.
    if (previous && previous.kind === 'choice' && effect.kind === 'choice') {
      parts.push(
        `<div class="effect-or"><span>${escapeHtml(ui.choiceSeparator ?? 'or')}</span></div>`,
      );
    }

    const label =
      effect.kind === 'fallback' && ui.fallbackLabel
        ? `<span class="effect__label">${escapeHtml(ui.fallbackLabel)}</span>`
        : '';

    parts.push(
      `<p class="effect effect--${effect.kind}">${label}${renderSegments(effect.segments)}</p>`,
    );
  });

  return parts.join('\n        ');
}

const MOTIFS = DRAWN_MOTIFS;

function renderArt(card) {
  // A drawn motif, for cards no public-domain engraving depicts.
  if (!card.art && card.motif && MOTIFS[card.motif]) {
    return (
      '<div class="card__art card__art--motif">' +
      MOTIFS[card.motif]({ seed: card.id }) +
      '</div>'
    );
  }
  if (!card.art) {
    return (
      '<div class="card__art card__art--placeholder">' +
      `<div class="card__art-note">${escapeHtml(card.ref)}</div>` +
      '</div>'
    );
  }
  const [, focusY = 0.5] = card.artFocus ?? [];
  const style = `background-image:url('${encodeURI(card.artUrl ?? card.art)}');--art-focus-y:${(focusY * 100).toFixed(1)}%`;
  return `<div class="card__art" style="${style}"></div>`;
}

/**
 * @param {object} card  one entry from model.cards
 * @param {object} model the full render model (for ui strings and geometry)
 */
/**
 * Geometry as CSS custom properties.
 *
 * In `px` the card is its pixel canvas, which is what screenshots need. In `mm`
 * it is its true physical size, which is what a PDF needs: 816 CSS px would
 * otherwise mean 8.5 inches on paper. Because every size in styles.css derives
 * from --u (card width / 816), switching the unit rescales the whole design and
 * emits text as vectors at the correct physical size.
 */
export function geometryVars(g, unit = 'px') {
  const toMm = (px) => `${((px / g.dpi) * 25.4).toFixed(4)}mm`;
  const v = unit === 'mm' ? toMm : (px) => `${px}px`;

  return [
    `--card-w:${v(g.widthPx)}`,
    `--card-h:${v(g.heightPx)}`,
    `--bleed-x:${v(g.bleedXPx)}`,
    `--bleed-y:${v(g.bleedYPx)}`,
    `--safe-x:${v(g.safeInsetXPx)}`,
    `--safe-y:${v(g.safeInsetYPx)}`,
  ];
}

export function renderCard(card, model, options = {}) {
  const g = model.geometry;
  const palette = card.palette ?? {};
  const plain = card.effects.length === 0;

  const decor = model.decor ?? { classes: [], vars: [] };

  const vars = [
    ...geometryVars(g, options.unit),
    ...decor.vars,
    palette.ink ? `--ink:${palette.ink}` : '',
    palette.paper ? `--paper:${palette.paper}` : '',
    palette.accent ? `--accent:${palette.accent}` : '',
  ]
    .filter(Boolean)
    .join(';');

  // A double quote here would close the style attribute and silently drop every
  // property after it, producing a wrong-but-believable card. Fail loudly.
  if (vars.includes('"')) {
    throw new Error(`card ${card.id}: inline style contains a double quote, which would truncate it`);
  }

  const classes = [
    'card',
    `card--${card.faction}`,
    plain ? 'card--plain' : '',
    card.hyphenate ? 'card--hyphenate' : '',
    ...decor.classes,
  ].filter(Boolean);

  const body = plain
    ? ''
    : `<div class="card__text">
        <div class="card__text-inner">
        ${renderEffects(card, model.ui)}
        </div>
      </div>`;

  return `<article class="${classes.join(' ')}" style="${vars}" data-card-id="${escapeHtml(card.id)}">
      ${renderArt(card)}
      <div class="card__number"><span>${escapeHtml(card.numberLabel)}</span></div>
      <div class="card__plate">
        <h1 class="card__name">${escapeHtml(card.name ?? '')}</h1>
        ${card.factionLabel && !plain ? `<div class="card__faction">${escapeHtml(card.factionLabel)}</div>` : ''}
      </div>
      <div class="card__panel">
        ${body}
      </div>
      <div class="card__guides"></div>
    </article>`;
}
