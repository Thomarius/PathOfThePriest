/**
 * Renders card faces to PNG and a combined print PDF via Playwright.
 *
 * The page is fully self-contained: fonts and artwork are inlined as data URIs,
 * so nothing is fetched at render time. That removes asset-path failures and is
 * what makes the output byte-identical across machines — the renderer writes a
 * manifest of SHA-256 hashes so that can be verified rather than assumed.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium } from 'playwright';
import { renderCard, escapeHtml } from './template/card.js';
import { baseStyles } from './template/page.js';
import { ROOT } from './model.js';

const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

export function slug(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics so German names slug cleanly
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** File name for one card: zero-padded so directory order matches deck order. */
export function cardFileName(card) {
  const key = card.number === null ? 'D' : String(card.number).padStart(2, '0');
  return `${key}-${slug(card.name ?? card.ref)}`;
}

/** Inlines artwork so the render page has no external references at all. */
function embedArt(model, themeName) {
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
 * @param {'px'|'mm'} unit  px for screenshots, mm for the PDF (see geometryVars)
 */
function buildHtml(model, cards, unit) {
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
</body>
</html>
`;
}

const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

/**
 * @param {object} model   render model
 * @param {{themeName: string, outDir?: string, pdf?: boolean}} options
 */
export async function renderAll(model, options) {
  const { themeName } = options;
  const outDir = path.resolve(ROOT, options.outDir ?? 'out/cards');
  fs.mkdirSync(outDir, { recursive: true });

  const cards = embedArt(model, themeName);
  const g = model.geometry;

  /** Loads a page and waits for everything that silently changes layout. */
  const settle = async (page, html) => {
    await page.setContent(html, { waitUntil: 'load' });
    // Screenshotting before fonts and images settle produces silently wrong
    // output — fallback glyphs, or blank art windows.
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() =>
      Promise.all([...document.images].map((img) => img.decode().catch(() => {}))),
    );
  };

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: g.widthPx, height: g.heightPx },
      deviceScaleFactor: 1,
    });

    await settle(page, buildHtml(model, cards, 'px'));

    const written = [];
    for (const card of cards) {
      const name = `${cardFileName(card)}.png`;
      const file = path.join(outDir, name);
      await page.locator(`[data-card-id="${card.id}"]`).screenshot({ path: file });
      written.push({ id: card.id, file: name, sha256: sha256(file) });
    }

    let pdfFile = null;
    if (options.pdf !== false) {
      const name = `${slug(model.meta.title ?? 'cards')}-${model.meta.locale}-${g.profile}.pdf`;
      pdfFile = path.resolve(ROOT, 'out', name);
      fs.mkdirSync(path.dirname(pdfFile), { recursive: true });

      // The PDF is built from a second, millimetre-sized page. Printing the
      // pixel page would place an 816 CSS px card on paper as 8.5 inches.
      const pdfPage = await browser.newPage();
      await settle(pdfPage, buildHtml(model, cards, 'mm'));
      // Explicit width/height rather than preferCSSPageSize: Chromium quantizes
      // an @page size and landed ~0.09 mm off the printer's spec.
      await pdfPage.pdf({
        path: pdfFile,
        printBackground: true,
        width: `${((g.widthPx / g.dpi) * 25.4).toFixed(4)}mm`,
        height: `${((g.heightPx / g.dpi) * 25.4).toFixed(4)}mm`,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        pageRanges: `1-${cards.length}`,
      });
      await pdfPage.close();
    }

    const manifest = {
      theme: model.meta.theme,
      locale: model.meta.locale,
      profile: g.profile,
      canvas: [g.widthPx, g.heightPx],
      dpi: g.dpi,
      trimMm: g.trimMm,
      bleedMm: g.bleedMm,
      cards: written,
    };
    fs.writeFileSync(
      path.join(outDir, 'manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
      'utf8',
    );

    return { written, pdfFile, outDir };
  } finally {
    await browser.close();
  }
}
