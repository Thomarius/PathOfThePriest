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
import { buildCardsHtml, embedArt, settlePage } from './template/document.js';

/** Elements that must stay inside the safe zone. Art deliberately bleeds. */
const TEXT_SELECTOR =
  '.card__number, .card__name, .card__faction, .effect, .effect-or, .effect__label';

/** Sub-pixel slack: block boxes sit flush against the safe inset by design. */
const TOLERANCE_PX = 1.5;

/** Below this, a German translation is likely to push the card into overflow. */
const MIN_SPARE_LINES = 1;

/**
 * Measures one loaded page. Exported separately so the renderer can audit the
 * exact DOM it is about to print, without loading it a second time.
 */
export async function auditPage(page, model) {
  const g = model.geometry;

  return page.evaluate(
    ({ safeX, safeY, selector, tolerance }) => {
      const findings = [];

      for (const card of document.querySelectorAll('.card')) {
        const id = card.dataset.cardId;
        const cardRect = card.getBoundingClientRect();
        const safe = {
          left: cardRect.left + safeX,
          top: cardRect.top + safeY,
          right: cardRect.right - safeX,
          bottom: cardRect.bottom - safeY,
        };

        const box = card.querySelector('.card__text');
        const inner = card.querySelector('.card__text-inner');
        const effect = card.querySelector('.effect');

        if (box && inner && effect) {
          // offsetHeight, not getBoundingClientRect: it is unaffected by any
          // CSS zoom on an ancestor, which would otherwise scale the geometry
          // but not the computed lineHeight it is compared against.
          const overflow = inner.offsetHeight - box.offsetHeight;
          const lineHeight = parseFloat(getComputedStyle(effect).lineHeight) || 0;
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
      }

      return findings;
    },
    {
      safeX: g.safeInsetXPx,
      safeY: g.safeInsetYPx,
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
    }
  }

  return { errors, warnings };
}

/** Standalone audit: launches its own browser. Used by `validate --deep`. */
export async function auditModel(model, { themeName }) {
  const g = model.geometry;
  const cards = embedArt(model, themeName);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: g.widthPx, height: g.heightPx },
      deviceScaleFactor: 1,
    });
    await settlePage(page, buildCardsHtml(model, cards, 'px'));
    return classify(await auditPage(page, model), model);
  } finally {
    await browser.close();
  }
}
