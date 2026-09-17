/**
 * Assembly of the chrome-free card document used for rendering and auditing.
 *
 * Both paths must build the page identically — an audit that inspects a
 * different DOM from the one being printed is worthless — so the construction
 * lives here rather than inside the renderer.
 */

import fs from 'node:fs';
import path from 'node:path';
import { renderCard, escapeHtml } from './card.js';
import { renderBack } from './back.js';
import { renderRulesCard } from './rules-card.js';
import { renderTitleCard, renderTitleBack } from './title-card.js';
import { baseStyles } from './page.js';
import { ROOT } from '../model.js';

const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

/** Inlines artwork so the page has no external references at all. */
export function embedArt(model, themeName) {
  return model.cards.map((card) => {
    if (!card.art) return card;
    const file = path.join(ROOT, 'themes', themeName, 'art', card.art);
    const mime = MIME[path.extname(card.art).toLowerCase()];
    if (!mime || !fs.existsSync(file)) return card;
    const data = fs.readFileSync(file).toString('base64');
    return { ...card, artUrl: `data:${mime};base64,${data}` };
  });
}

/**
 * @param {'px'|'mm'} unit  px for screenshots and auditing, mm for the PDF
 */
export function buildCardsHtml(model, cards, unit, { extras = [] } = {}) {
  const g = model.geometry;
  const widthMm = ((g.widthPx / g.dpi) * 25.4).toFixed(4);
  const heightMm = ((g.heightPx / g.dpi) * 25.4).toFixed(4);

  return `<!doctype html>
<html lang="${escapeHtml(model.meta.htmlLang)}">
<head>
<meta charset="utf-8">
<title>${escapeHtml(model.meta.title ?? 'cards')}</title>
<style>
${baseStyles(model)}
html, body { margin: 0; padding: 0; background: #fff; }
/* One card per page, at exactly the card's own physical size including bleed. */
@page { size: ${widthMm}mm ${heightMm}mm; margin: 0; }
.card { display: block; }
.card:not(:last-child) { break-after: page; }
</style>
</head>
<body>
${cards.map((card) => renderCard(card, model, { unit })).join('\n')}
${extras.join('\n')}
</body>
</html>
`;
}

/**
 * The cards that carry no mechanics: the title card, then the six rules cards.
 * They share a page because they are audited, printed and proofed together and
 * neither kind has a card back.
 */
export function nonPlayingCards(model, unit) {
  return [
    ...(model.titleCard
      ? [
          renderTitleCard(model.titleCard, model, { unit }),
          // Rendered on this page rather than with the drawn backs, because this
          // page is the audited one: the colophon is the most text a back
          // carries anywhere in the deck and it has to stay inside the safe zone.
          renderTitleBack(model.titleCard, model, { unit }),
        ]
      : []),
    ...model.rulesCards.map((rules) => renderRulesCard(rules, model, { unit })),
  ];
}

/** Backs that are drawn rather than copied from a front render. */
export function drawnBacks(model) {
  return model.backs.filter((back) => !back.reuseFront);
}

export function buildBacksHtml(model, unit) {
  return `<!doctype html>
<html lang="${escapeHtml(model.meta.htmlLang)}">
<head>
<meta charset="utf-8">
<style>
${baseStyles(model)}
html, body { margin: 0; padding: 0; background: #fff; }
.card { display: block; }
</style>
</head>
<body>
${drawnBacks(model)
  .map((back) => renderBack(back, model, { unit }))
  .join('\n')}
</body>
</html>
`;
}

/**
 * A single proofing image: every card on one sheet at reduced scale.
 *
 * The sheet width is pinned to a whole number of columns. Left to wrap on its
 * own it produced one endless row, since the flex container sizes to content.
 */
export function buildProofHtml(model, cards, { scale = 0.34, columns = 4 } = {}) {
  const extraFigures = [
    ...(model.titleCard
      ? [
          `<figure>${renderTitleCard(model.titleCard, model, { unit: 'px' })}
  <figcaption>${escapeHtml(model.titleCard.title ?? 'title')}</figcaption>
</figure>`,
          `<figure>${renderTitleBack(model.titleCard, model, { unit: 'px' })}
  <figcaption>${escapeHtml(model.titleCard.back.id)}</figcaption>
</figure>`,
        ]
      : []),
    ...model.rulesCards.map(
      (r) => `<figure>${renderRulesCard(r, model, { unit: 'px' })}
  <figcaption>${escapeHtml(r.title ?? r.id)}</figcaption>
</figure>`,
    ),
    ...drawnBacks(model).map(
      (b) => `<figure>${renderBack(b, model, { unit: 'px' })}
  <figcaption>${escapeHtml(b.id)}</figcaption>
</figure>`,
    ),
  ];
  const gap = 24;
  const padding = 24;
  const sheetWidth = columns * model.geometry.widthPx + (columns - 1) * gap + padding * 2;

  return `<!doctype html>
<html lang="${escapeHtml(model.meta.htmlLang)}">
<head>
<meta charset="utf-8">
<style>
${baseStyles(model)}
html, body { margin: 0; background: #d9d6d0; }
.sheet {
  display: flex; flex-wrap: wrap; gap: ${gap}px; padding: ${padding}px;
  box-sizing: border-box; width: ${sheetWidth}px; zoom: ${scale};
}
figure { margin: 0; }
figcaption {
  margin-top: 10px; text-align: center; color: #333;
  font: 600 34px/1.2 system-ui, sans-serif;
}
</style>
</head>
<body>
<div class="sheet">
${cards
  .map(
    (card) => `<figure>${renderCard(card, model, { unit: 'px' })}
  <figcaption>${escapeHtml(card.numberLabel)} &middot; ${escapeHtml(card.name ?? '')}</figcaption>
</figure>`,
  )
  .join('\n')}
${extraFigures.join('\n')}
</div>
</body>
</html>
`;
}

/** Loads a page and waits for everything that silently changes layout. */
export async function settlePage(page, html) {
  await page.setContent(html, { waitUntil: 'load' });
  // Measuring or screenshotting before fonts and images settle produces
  // silently wrong output — fallback metrics, or blank art windows.
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() =>
    Promise.all([...document.images].map((img) => img.decode().catch(() => {}))),
  );
}

export function buildRulesHtml(model, unit) {
  return `<!doctype html>
<html lang="${escapeHtml(model.meta.htmlLang)}">
<head>
<meta charset="utf-8">
<style>
${baseStyles(model)}
html, body { margin: 0; padding: 0; background: #fff; }
.card { display: block; }
</style>
</head>
<body>
${nonPlayingCards(model, unit).join(String.fromCharCode(10))}
</body>
</html>
`;
}
