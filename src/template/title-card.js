/**
 * Title card template.
 *
 * The one card that names the product. It is not a playing card and not a rules
 * card: it carries no mechanics, so it is declared in `data/deck.json` rather
 * than in `data/cards.json`, which the rules fix at 16 faces.
 *
 * Layout follows the Apprentice and Deity rather than the card back — full-bleed
 * art with a plate near the foot — deliberately, so the title card reads as a
 * card from this deck rather than as a stray back. It reuses `.card--plain` for
 * the full-height art window, the motif art window, and the ground band, and
 * adds only what is genuinely new: a plate that holds two lines and the credit.
 *
 * The hero motif is the theme's `titleMotif`. All three themes point it at their
 * own goal card — the treasure, the lunch break, the defence — which is the
 * subject the whole deck walks toward.
 *
 * This is also the first template to print `subtitle`. Every theme has carried
 * one since the beginning and nothing has ever rendered it.
 */

import { escapeHtml, geometryVars, renderSegments } from './card.js';
import { MOTIFS } from './motifs.js';

export function renderTitleCard(title, model, options = {}) {
  const g = model.geometry;
  const palette = title.palette ?? {};
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

  if (vars.includes('"')) {
    throw new Error(`title card: inline style contains a double quote, which would truncate it`);
  }

  const draw = title.motif ? MOTIFS[title.motif] : null;
  const art = draw
    ? `<div class="card__art card__art--motif">${draw({ seed: 'title' })}</div>`
    : '<div class="card__art card__art--placeholder"></div>';

  const classes = ['card', 'card--plain', 'card--title', ...decor.classes].filter(Boolean);

  return `<article class="${classes.join(' ')}" style="${vars}" data-title-id="${escapeHtml(title.id)}">
      ${art}
      <div class="card__plate card__plate--title">
        <h1 class="card__name card__title">${escapeHtml(title.title ?? '')}</h1>
        ${title.subtitle ? `<p class="card__subtitle">${escapeHtml(title.subtitle)}</p>` : ''}
      </div>
      ${title.credit.length ? `<p class="card__credit">${renderSegments(title.credit)}</p>` : ''}
    </article>`;
}
