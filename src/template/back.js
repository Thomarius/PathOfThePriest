/**
 * Card back template.
 *
 * Only the shared Masters back is drawn here. The Apprentice and Deity reuse
 * their own fronts as their backs, which the renderer handles by copying the
 * rendered PNG — see `reuseFront` in data/deck.json.
 *
 * The constraint that matters: all 14 Masters are shuffled face down during
 * setup, so this design must be identical for every one of them and must not
 * hint at True versus Fake. The validator enforces the "one shared back" rule;
 * keeping the artwork neutral is a design responsibility.
 */

import { escapeHtml, geometryVars } from './card.js';
import { emblem } from './decor.js';

export function renderBack(back, model, options = {}) {
  const g = model.geometry;
  const palette = back.palette ?? {};
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
    throw new Error(`back ${back.id}: inline style contains a double quote, which would truncate it`);
  }

  const classes = ['card', 'back', `back--${back.design}`, ...decor.classes].filter(Boolean);

  return `<article class="${classes.join(' ')}" style="${vars}" data-back-id="${escapeHtml(back.id)}">
      <div class="back__field"></div>
      <div class="back__frame"></div>
      <div class="back__emblem">${emblem(decor.emblem)}</div>
      ${model.meta.title ? `<div class="back__title">${escapeHtml(model.meta.title)}</div>` : ''}
    </article>`;
}
