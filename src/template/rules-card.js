/**
 * Rules card template.
 *
 * The five rules cards replace the original game's rulebook sheet, so the whole
 * product is one deck. Content comes from the locale and is normalised by
 * model.js into a uniform block list, so this file only decides presentation.
 *
 * The body deliberately reuses `.card__text` / `.card__text-inner` from the
 * card faces: that is the structure the M5 layout audit measures, so rules
 * cards get overflow detection for free. They need it more than the faces do —
 * the clarifications card carries nine items.
 */

import { escapeHtml, geometryVars, renderSegments } from './card.js';
import { icon } from '../icons/index.js';
import { DIAGRAMS } from './diagrams.js';

function renderBlock(block) {
  switch (block.type) {
    case 'paragraphs':
      return block.items
        .map((segments) => `<p class="rules__para">${renderSegments(segments)}</p>`)
        .join('');

    case 'list': {
      const tag = block.ordered ? 'ol' : 'ul';
      const items = block.items
        .map((segments) => `<li>${renderSegments(segments)}</li>`)
        .join('');
      return `<${tag} class="rules__list rules__list--${block.ordered ? 'ordered' : 'bullets'}">${items}</${tag}>`;
    }

    case 'glossary':
      // Built from the same SVG files the cards print, so the legend cannot
      // drift from the glyphs it explains.
      // Flowing, not a two-column grid: the grid reserved a term column as wide
      // as its longest entry, which cost roughly a third of the line for every
      // definition and made the glossary the card that capped the type size for
      // the whole deck.
      return `<dl class="rules__glossary">${block.entries
        .map(
          (entry) =>
            `<div class="rules__term">` +
            `<dt>${entry.icon ? icon(entry.icon) : ''}<span>${escapeHtml(entry.term)}</span></dt>` +
            `<dd>${renderSegments(entry.segments)}</dd>` +
            `</div>`,
        )
        .join('')}</dl>`;

    case 'diagram': {
      const draw = DIAGRAMS[block.name];
      return draw ? `<div class="rules__diagram">${draw()}</div>` : '';
    }

    case 'section':
      return (
        `${block.heading ? `<h2 class="rules__heading">${escapeHtml(block.heading)}</h2>` : ''}` +
        `<ul class="rules__list rules__list--bullets">${block.items
          .map((segments) => `<li>${renderSegments(segments)}</li>`)
          .join('')}</ul>`
      );

    default:
      return '';
  }
}

export function renderRulesCard(rules, model, options = {}) {
  const g = model.geometry;
  const palette = model.rulesPalette ?? {};
  const hazard = model.hazardPalette ?? {};
  const decor = model.decor ?? { classes: [], vars: [] };

  const vars = [
    ...geometryVars(g, options.unit),
    ...decor.vars,
    palette.ink ? `--ink:${palette.ink}` : '',
    palette.paper ? `--paper:${palette.paper}` : '',
    palette.accent ? `--accent:${palette.accent}` : '',
    // For the turn-order diagram, which draws real Hazard badges rather than
    // neutral markers. Absent, the diagram falls back to the rules palette.
    hazard.ink ? `--hazard-ink:${hazard.ink}` : '',
    hazard.accent ? `--hazard-accent:${hazard.accent}` : '',
  ]
    .filter(Boolean)
    .join(';');

  if (vars.includes('"')) {
    throw new Error(`rules card ${rules.id}: inline style contains a double quote`);
  }

  const classes = ['card', 'rules', `rules--${rules.layout}`, ...decor.classes].filter(Boolean);
  const tag = model.ui?.rulesCardTag;

  return `<article class="${classes.join(' ')}" style="${vars}" data-rules-id="${escapeHtml(rules.id)}">
      <div class="rules__head">
        ${tag ? `<div class="rules__tag">${escapeHtml(tag)}</div>` : ''}
        <h1 class="rules__title">${escapeHtml(rules.title ?? '')}</h1>
      </div>
      <div class="card__text card__text--top">
        <div class="card__text-inner">
          ${rules.blocks.map(renderBlock).join('\n          ')}
        </div>
      </div>
    </article>`;
}
