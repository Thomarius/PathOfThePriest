/**
 * Renders card faces to PNG and a combined print PDF via Playwright.
 *
 * The page is fully self-contained: fonts and artwork are inlined as data URIs,
 * so nothing is fetched at render time. That removes asset-path failures and is
 * what makes the output byte-identical across machines — the renderer writes a
 * manifest of SHA-256 hashes so that can be verified rather than assumed.
 *
 * The layout audit runs against this same loaded page, before anything is
 * written, so a card that overflows or breaks the safe zone never reaches disk.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium } from 'playwright';
import {
  buildBacksHtml,
  buildCardsHtml,
  buildRulesHtml,
  buildProofHtml,
  drawnBacks,
  embedArt,
  settlePage,
} from './template/document.js';
import { auditPage, classify } from './audit.js';
import { ROOT } from './model.js';

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

const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

/**
 * @param {object} model render model
 * @param {{themeName: string, outDir?: string, pdf?: boolean, proof?: boolean,
 *          audit?: boolean}} options
 */
export async function renderAll(model, options) {
  const { themeName } = options;
  const outDir = path.resolve(
    ROOT,
    options.outDir ?? `out/${slug(model.meta.theme)}-${model.meta.locale}`,
  );
  const cards = embedArt(model, themeName);
  const g = model.geometry;

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: g.widthPx, height: g.heightPx },
      deviceScaleFactor: 1,
    });

    await settlePage(page, buildCardsHtml(model, cards, 'px'));

    // Audit before writing anything: a printed defect is expensive, a refused
    // build is free.
    const audit =
      options.audit === false ? { errors: [], warnings: [] } : classify(await auditPage(page, model), model);
    if (audit.errors.length) {
      return { audit, written: [], pdfFile: null, proofFile: null, outDir };
    }

    fs.mkdirSync(outDir, { recursive: true });

    const written = [];
    for (const card of cards) {
      const name = `${cardFileName(card)}.png`;
      const file = path.join(outDir, name);
      await page.locator(`[data-card-id="${card.id}"]`).screenshot({ path: file });
      written.push({ id: card.id, file: name, sha256: sha256(file) });
    }

    // --- card backs ---------------------------------------------------------
    // Drawn backs are rendered; the Apprentice and Deity backs are copies of
    // their own fronts, so they are copied rather than re-rendered — that way
    // the two files are guaranteed identical rather than merely similar.
    const backs = [];
    const toDraw = drawnBacks(model);
    if (toDraw.length) {
      const backPage = await browser.newPage({
        viewport: { width: g.widthPx, height: g.heightPx },
        deviceScaleFactor: 1,
      });
      await settlePage(backPage, buildBacksHtml(model, 'px'));
      for (const back of toDraw) {
        const name = `${back.id}.png`;
        const file = path.join(outDir, name);
        await backPage.locator(`[data-back-id="${back.id}"]`).screenshot({ path: file });
        backs.push({ id: back.id, file: name, sha256: sha256(file) });
      }
      await backPage.close();
    }

    for (const back of model.backs.filter((b) => b.reuseFront)) {
      const front = written.find((w) => w.id === back.reuseFront);
      if (!front) {
        throw new Error(`back ${back.id}: reuseFront "${back.reuseFront}" is not a rendered card`);
      }
      const name = `${back.id}.png`;
      fs.copyFileSync(path.join(outDir, front.file), path.join(outDir, name));
      backs.push({ id: back.id, file: name, sha256: front.sha256, copiedFrom: front.file });
    }

    // --- title card and rules cards -----------------------------------------
    // One page: both are non-playing cards, both are audited, and neither has a
    // back of its own.
    const rules = [];
    if (model.rulesCards.length || model.titleCard) {
      const rulesPage = await browser.newPage({
        viewport: { width: g.widthPx, height: g.heightPx },
        deviceScaleFactor: 1,
      });
      await settlePage(rulesPage, buildRulesHtml(model, 'px'));

      // Rules cards carry far more text than a card face, so they are audited
      // too — the same .card__text structure makes that automatic.
      const rulesAudit = options.audit === false
        ? { errors: [], warnings: [] }
        : classify(await auditPage(rulesPage, model), model);
      audit.errors.push(...rulesAudit.errors);
      audit.warnings.push(...rulesAudit.warnings);

      if (!audit.errors.length) {
        if (model.titleCard) {
          const name = `${model.titleCard.id}.png`;
          const file = path.join(outDir, name);
          await rulesPage.locator(`[data-title-id="${model.titleCard.id}"]`).screenshot({ path: file });
          rules.push({ id: model.titleCard.id, file: name, sha256: sha256(file) });
        }
        for (const card of model.rulesCards) {
          const name = `${card.id}.png`;
          const file = path.join(outDir, name);
          await rulesPage.locator(`[data-rules-id="${card.id}"]`).screenshot({ path: file });
          rules.push({ id: card.id, file: name, sha256: sha256(file) });
        }
      }
      await rulesPage.close();
      if (audit.errors.length) {
        return { audit, written, backs, rules: [], pdfFile: null, proofFile: null, outDir };
      }
    }

    let pdfFile = null;
    if (options.pdf !== false) {
      // Themes may share a title — dungeon-bright inherits dungeon's — so the
      // theme is what keeps two decks from writing the same PDF.
      const name = `${slug(model.meta.title ?? 'cards')}-${slug(model.meta.theme)}-${model.meta.locale}-${g.profile}.pdf`;
      pdfFile = path.resolve(ROOT, 'out', name);
      fs.mkdirSync(path.dirname(pdfFile), { recursive: true });

      // The PDF is built from a second, millimetre-sized page. Printing the
      // pixel page would place an 816 CSS px card on paper as 8.5 inches.
      const pdfPage = await browser.newPage();
      // The PDF is the whole product: faces then rules cards.
      const { nonPlayingCards } = await import('./template/document.js');
      const extrasMm = nonPlayingCards(model, 'mm');
      await settlePage(pdfPage, buildCardsHtml(model, cards, 'mm', { extras: extrasMm }));
      // Explicit width/height rather than preferCSSPageSize: Chromium quantizes
      // an @page size and landed ~0.09 mm off the printer's spec either way,
      // but this keeps the intent in one place.
      await pdfPage.pdf({
        path: pdfFile,
        printBackground: true,
        width: `${((g.widthPx / g.dpi) * 25.4).toFixed(4)}mm`,
        height: `${((g.heightPx / g.dpi) * 25.4).toFixed(4)}mm`,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        pageRanges: `1-${cards.length + extrasMm.length}`,
      });
      await pdfPage.close();
    }

    let proofFile = null;
    if (options.proof !== false) {
      proofFile = path.resolve(
        ROOT,
        'out',
        `proof-${slug(model.meta.theme)}-${model.meta.locale}.png`,
      );
      const proofPage = await browser.newPage({ deviceScaleFactor: 1 });
      await settlePage(proofPage, buildProofHtml(model, cards));
      await proofPage.locator('.sheet').screenshot({ path: proofFile });
      await proofPage.close();
    }

    // Renaming a card changes its file name, leaving the old PNG behind. An
    // orphan that still looks like a finished card is exactly the kind of thing
    // that reaches a printer by accident, so the output directory is pruned to
    // the cards actually rendered this run.
    const keep = new Set([...written.map((w) => w.file), ...backs.map((b) => b.file), ...rules.map((x) => x.file), 'manifest.json']);
    const removed = [];
    for (const entry of fs.readdirSync(outDir)) {
      if (keep.has(entry) || !entry.toLowerCase().endsWith('.png')) continue;
      fs.rmSync(path.join(outDir, entry));
      removed.push(entry);
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
      backs,
      rules,
    };
    fs.writeFileSync(
      path.join(outDir, 'manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
      'utf8',
    );

    return { audit, written, backs, rules, pdfFile, proofFile, outDir, removed };
  } finally {
    await browser.close();
  }
}
