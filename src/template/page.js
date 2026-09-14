/**
 * Builds the review preview: a self-contained contact sheet of every card face.
 *
 * This page is for human design review, not for output. It carries a zoom
 * control and a print-guide overlay; the renderer in M4 renders cards from a
 * separate, chrome-free page so none of this can leak into a printed file.
 */

import fs from 'node:fs';
import path from 'node:path';
import { renderCard, escapeHtml } from './card.js';

const STYLES = fs.readFileSync(path.join(import.meta.dirname, 'styles.css'), 'utf8');

const PREVIEW_CHROME = `
  body {
    margin: 0;
    background: #4a4f55;
    color: #e8e6e2;
    font: 14px/1.5 system-ui, sans-serif;
  }
  .bar {
    position: sticky; top: 0; z-index: 20;
    display: flex; gap: 22px; align-items: center; flex-wrap: wrap;
    padding: 12px 20px;
    background: #23262a;
    border-bottom: 1px solid #000;
  }
  .bar h1 { font-size: 15px; font-weight: 600; margin: 0 12px 0 0; }
  .bar .meta { opacity: .65; font-size: 12px; }
  .bar button {
    background: #3a3f45; color: inherit; border: 1px solid #555;
    padding: 4px 11px; border-radius: 4px; cursor: pointer; font: inherit;
  }
  .bar button[aria-pressed="true"] { background: #7a8590; border-color: #9aa; }
  .bar label { display: flex; align-items: center; gap: 6px; cursor: pointer; }
  .sheet {
    display: flex; flex-wrap: wrap; gap: 30px;
    padding: 30px;
    zoom: var(--scale, .5);
  }
  figure { margin: 0; }
  figcaption {
    margin-top: 8px; font-size: 13px; opacity: .7; text-align: center;
    font-variant-numeric: tabular-nums;
  }
  .legend { padding: 0 20px 24px; font-size: 12px; opacity: .6; }
  figcaption.is-tight { color: #f0c674; opacity: 1; }
  figcaption.is-overflow { color: #ff8f8f; opacity: 1; font-weight: 700; }
`;

export function renderPreview(model, { themeName }) {
  const cards = model.cards
    .map((card) => {
      const withArt = card.art
        ? { ...card, artUrl: `../../themes/${themeName}/art/${card.art}` }
        : card;
      const chars = card.effects.reduce((sum, e) => sum + e.plain.length, 0);
      return `<figure>
      ${renderCard(withArt, model)}
      <figcaption>#${escapeHtml(card.numberLabel)} ${escapeHtml(card.name ?? '')} · ${card.effects.length} effect(s) · ${chars} chars</figcaption>
    </figure>`;
    })
    .join('\n    ');

  const g = model.geometry;

  return `<!doctype html>
<html lang="${escapeHtml(model.meta.htmlLang)}">
<head>
<meta charset="utf-8">
<title>${escapeHtml(model.meta.title ?? 'Card preview')} — preview</title>
<style>
:root {
  --font-display: ${model.typography.display ?? 'Georgia, serif'};
  --font-body: ${model.typography.body ?? 'system-ui, sans-serif'};
}
${PREVIEW_CHROME}
${STYLES}
</style>
</head>
<body>
<div class="bar">
  <h1>${escapeHtml(model.meta.title ?? '')}</h1>
  <span class="meta">theme "${escapeHtml(model.meta.theme)}" · locale "${escapeHtml(model.meta.locale)}" · ${escapeHtml(g.profile)} ${g.widthPx}&times;${g.heightPx}px @ ${g.dpi}dpi${model.meta.stress ? ` · <b style="color:#f0c674">STRESS &times;${model.meta.stress}</b>` : ''}</span>
  <span>
    zoom
    <button type="button" data-scale="1">100%</button>
    <button type="button" data-scale="0.5" aria-pressed="true">50%</button>
    <button type="button" data-scale="0.33">33%</button>
  </span>
  <label><input type="checkbox" id="guides"> show trim &amp; safe guides</label>
  <span class="meta" id="summary">measuring…</span>
</div>
<div class="sheet">
    ${cards}
</div>
<p class="legend">
  Red dashed line = trim (${g.trimWidthPx}&times;${g.trimHeightPx}px). Blue dashed line = safe zone
  (${g.safeMm}mm inside trim). Art may cross the red line; text must stay inside the blue one.
</p>
<script>
  // ?scale=1 and ?only=11,7 let a specific card be inspected at full size,
  // which is how the worst-case cards get reviewed without scrolling a sheet.
  const params = new URLSearchParams(location.search);
  if (params.has('scale')) {
    document.documentElement.style.setProperty('--scale', params.get('scale'));
  }
  if (params.has('only')) {
    const keep = new Set(params.get('only').split(','));
    for (const figure of document.querySelectorAll('.sheet figure')) {
      const id = figure.querySelector('[data-card-id]')?.dataset.cardId;
      if (!keep.has(id)) figure.remove();
    }
  }
  if (params.get('guides') === '1') {
    document.body.classList.add('show-guides');
    document.getElementById('guides').checked = true;
  }

  const buttons = [...document.querySelectorAll('[data-scale]')];
  for (const button of buttons) {
    button.addEventListener('click', () => {
      document.documentElement.style.setProperty('--scale', button.dataset.scale);
      for (const other of buttons) other.setAttribute('aria-pressed', String(other === button));
    });
  }
  document.getElementById('guides').addEventListener('change', (event) => {
    document.body.classList.toggle('show-guides', event.target.checked);
  });

  // How full each text box is. German runs 20-30% longer than English, so a
  // card sitting above ~75% here will not survive translation. M5 turns the
  // same measurement into a hard validation failure.
  document.fonts.ready.then(() => {
    let worst = 0;
    let worstCard = '';
    for (const figure of document.querySelectorAll('.sheet figure')) {
      const box = figure.querySelector('.card__text');
      const inner = figure.querySelector('.card__text-inner');
      if (!box || !inner) continue;
      const innerH = inner.getBoundingClientRect().height;
      const boxH = box.getBoundingClientRect().height;
      const fill = innerH / boxH;
      const percent = Math.round(fill * 100);
      const caption = figure.querySelector('figcaption');
      caption.insertAdjacentHTML(
        'beforeend',
        ' &middot; fill <b>' + percent + '%</b> (' + Math.round(innerH) + '/' + Math.round(boxH) + ')',
      );
      if (fill > 1) caption.classList.add('is-overflow');
      else if (fill > 0.75) caption.classList.add('is-tight');
      if (fill > worst) {
        worst = fill;
        worstCard = figure.querySelector('[data-card-id]').dataset.cardId;
      }
    }
    document.getElementById('summary').textContent = worstCard
      ? 'fullest text box: card ' + worstCard + ' at ' + Math.round(worst * 100) + '%'
      : 'no text boxes on screen';
  });
</script>
</body>
</html>
`;
}
