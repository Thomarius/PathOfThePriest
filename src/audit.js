/**
 * Layout audit: the checks that need live measurement rather than data.
 *
 * Structural problems (missing strings, unresolved tokens, bad deck
 * composition) are caught by validate.js without a browser. These are the ones
 * that only exist once the text is actually laid out:
 *
 *   overflow   text taller than the box that holds it — it would be clipped
 *   safe zone  text crossing the printer's safe inset — it could be cut off
 *   headroom   too few spare lines left for German to expand into
 *
 * The audit runs against the same document the renderer prints, so it cannot
 * drift from what is actually produced.
 */

import { chromium } from 'playwright';
import { buildCardsHtml, buildRulesHtml, embedArt, settlePage } from './template/document.js';

/** Elements that must stay inside the safe zone. Art deliberately bleeds. */
const TEXT_SELECTOR =
  '.card__number, .card__name, .card__faction, .effect, .effect-or, .effect__label';

/** Sub-pixel slack: block boxes sit flush against the safe inset by design. */
const TOLERANCE_PX = 1.5;

/** Below this, a German translation is likely to push the card into overflow. */
const MIN_SPARE_LINES = 1;

/**
 * How far a motif may sit from the centre of the visible art before it is worth
 * reporting. The measured centres in motifs.js are whole user units, and one
 * unit paints as two pixels, so a correct motif still lands a pixel or so out.
 * The drifts this exists to catch were 14 to 34 px.
 */
const MOTIF_TOLERANCE_PX = 4;

/**
 * Measures one loaded page. Exported separately so the renderer can audit the
 * exact DOM it is about to print, without loading it a second time.
 */
export async function auditPage(page, model) {
  const g = model.geometry;

  return page.evaluate(
    ({ safeX, safeY, bleedY, selector, tolerance }) => {
      const findings = [];

      for (const card of document.querySelectorAll('.card')) {
        const id = card.dataset.cardId ?? card.dataset.rulesId;
        const cardRect = card.getBoundingClientRect();
        const safe = {
          left: cardRect.left + safeX,
          top: cardRect.top + safeY,
          right: cardRect.right - safeX,
          bottom: cardRect.bottom - safeY,
        };

        const box = card.querySelector('.card__text');
        const inner = card.querySelector('.card__text-inner');
        // Only needed for its line height. A rules card reuses the same text box
        // but has no .effect in it, so keying off that alone skipped every rules
        // card silently — including the glossary, the densest card in the deck.
        const probe = card.querySelector('.effect, .rules__para, .rules__term, .rules__list li');

        if (box && inner && probe) {
          // offsetHeight, not getBoundingClientRect: it is unaffected by any
          // CSS zoom on an ancestor, which would otherwise scale the geometry
          // but not the computed lineHeight it is compared against.
          const overflow = inner.offsetHeight - box.offsetHeight;
          const lineHeight = parseFloat(getComputedStyle(probe).lineHeight) || 0;
          const spareLines = lineHeight
            ? Math.floor((box.offsetHeight - inner.offsetHeight) / lineHeight)
            : 0;

          findings.push({
            id,
            kind: 'fill',
            overflowPx: Math.round(overflow * 10) / 10,
            spareLines,
            fill: Math.round((inner.offsetHeight / box.offsetHeight) * 100),
          });
        }

        for (const el of card.querySelectorAll(selector)) {
          const r = el.getBoundingClientRect();
          const overshoot = Math.max(
            safe.left - r.left,
            safe.top - r.top,
            r.right - safe.right,
            r.bottom - safe.bottom,
          );
          if (overshoot > tolerance) {
            findings.push({
              id,
              kind: 'safe',
              element: el.getAttribute('class') ?? el.tagName.toLowerCase(),
              overshootPx: Math.round(overshoot * 10) / 10,
              text: (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 48),
            });
          }
        }

        // Where the motif's ink actually lands, against where it should. The
        // target is the field that survives trimming — below the bleed, above
        // the name plate — because that is what a player sees.
        const svg = card.querySelector('.card__art--motif > svg');
        const plate = card.querySelector('.card__plate');
        if (svg && plate) {
          let x0 = Infinity;
          let y0 = Infinity;
          let x1 = -Infinity;
          let y1 = -Infinity;
          for (const el of svg.querySelectorAll('path,circle,rect')) {
            const b = el.getBBox();
            // getBBox is geometry only, so the stroke has to be added back or a
            // heavily stroked shape measures as smaller than it paints.
            const half =
              el.getAttribute('stroke') === 'none'
                ? 0
                : parseFloat(
                    el.getAttribute('stroke-width') ?? svg.getAttribute('stroke-width') ?? 0,
                  ) / 2;
            x0 = Math.min(x0, b.x - half);
            y0 = Math.min(y0, b.y - half);
            x1 = Math.max(x1, b.x + b.width + half);
            y1 = Math.max(y1, b.y + b.height + half);
          }

          if (Number.isFinite(x0)) {
            const vb = svg.viewBox.baseVal;
            const r = svg.getBoundingClientRect();
            const inkX = r.left + ((x0 + x1) / 2 - vb.x) * (r.width / vb.width);
            const inkY = r.top + ((y0 + y1) / 2 - vb.y) * (r.height / vb.height);

            const fieldTop = cardRect.top + bleedY;
            const fieldBottom = plate.getBoundingClientRect().top;

            findings.push({
              id,
              kind: 'motif',
              dx: Math.round((inkX - (cardRect.left + cardRect.width / 2)) * 10) / 10,
              dy: Math.round((inkY - (fieldTop + fieldBottom) / 2) * 10) / 10,
            });
          }
        }
      }

      return findings;
    },
    {
      safeX: g.safeInsetXPx,
      safeY: g.safeInsetYPx,
      bleedY: g.bleedYPx,
      selector: TEXT_SELECTOR,
      tolerance: TOLERANCE_PX,
    },
  );
}

/** Splits raw findings into hard errors and warnings. */
export function classify(findings, model) {
  const errors = [];
  const warnings = [];
  const nameOf = (id) => {
    const card = model.cards.find((c) => c.id === id);
    return card ? `${card.numberLabel} ${card.name ?? card.ref}` : id;
  };

  for (const f of findings) {
    if (f.kind === 'safe') {
      errors.push(
        `card ${nameOf(f.id)}: "${f.text}" crosses the safe zone by ${f.overshootPx}px ` +
          `(${f.element}) — it could be cut off`,
      );
    } else if (f.kind === 'fill') {
      if (f.overflowPx > 0) {
        errors.push(
          `card ${nameOf(f.id)}: effect text overflows its box by ${f.overflowPx}px ` +
            `(${f.fill}% full) — it would be clipped`,
        );
      } else if (f.spareLines < MIN_SPARE_LINES) {
        warnings.push(
          `card ${nameOf(f.id)}: only ${f.spareLines} spare line(s) at ${f.fill}% full — ` +
            'a longer translation will not fit',
        );
      }
    } else if (f.kind === 'motif' && Math.max(Math.abs(f.dx), Math.abs(f.dy)) > MOTIF_TOLERANCE_PX) {
      warnings.push(
        `card ${nameOf(f.id)}: motif sits ${f.dx}px across and ${f.dy}px down from the ` +
          'centre of the visible art — check its measured centre in motifs.js',
      );
    }
  }

  return { errors, warnings };
}

/**
 * Standalone audit: launches its own browser. Used by `validate --deep`.
 *
 * Audits the rules cards as well as the faces. They are laid out on a separate
 * page, and checking only the faces here meant `validate --deep` quietly covered
 * less than `build` did, despite being documented as the same checks.
 */
export async function auditModel(model, { themeName }) {
  const g = model.geometry;
  const cards = embedArt(model, themeName);
  const browser = await chromium.launch();
  try {
    const findings = [];
    for (const html of [
      buildCardsHtml(model, cards, 'px'),
      ...(model.rulesCards.length ? [buildRulesHtml(model, 'px')] : []),
    ]) {
      const page = await browser.newPage({
        viewport: { width: g.widthPx, height: g.heightPx },
        deviceScaleFactor: 1,
      });
      await settlePage(page, html);
      findings.push(...(await auditPage(page, model)));
      await page.close();
    }
    return classify(findings, model);
  } finally {
    await browser.close();
  }
}
