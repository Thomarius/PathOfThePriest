/**
 * Card face template.
 *
 * Consumes the render model produced by src/model.js and emits HTML. It has no
 * knowledge of the theme's topic or the language being printed — everything it
 * draws comes from the model.
 */

import { icon } from '../icons/index.js';

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
    .map((seg) => {
      switch (seg.t) {
        case 'icon':
          return icon(seg.name);
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
      parts.push(`<div class="effect-or">${escapeHtml(ui.choiceSeparator ?? 'or')}</div>`);
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

function renderArt(card) {
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
export function renderCard(card, model) {
  const g = model.geometry;
  const palette = card.palette ?? {};
  const plain = card.effects.length === 0;

  const vars = [
    `--card-w:${g.widthPx}px`,
    `--card-h:${g.heightPx}px`,
    `--bleed-x:${g.bleedXPx}px`,
    `--bleed-y:${g.bleedYPx}px`,
    `--safe-x:${g.safeInsetXPx}px`,
    `--safe-y:${g.safeInsetYPx}px`,
    palette.ink ? `--ink:${palette.ink}` : '',
    palette.paper ? `--paper:${palette.paper}` : '',
    palette.accent ? `--accent:${palette.accent}` : '',
  ]
    .filter(Boolean)
    .join(';');

  const classes = ['card', `card--${card.faction}`, plain ? 'card--plain' : ''].filter(Boolean);

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
