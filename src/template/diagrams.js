/**
 * Drawn diagrams for the rules cards.
 *
 * The Objective, Setup and Turn cards describe things that are inherently
 * spatial, and a picture carries them better than a paragraph. These are the one
 * piece of drawn work here that improves comprehension rather than decoration.
 *
 * **Language-neutral by construction.** They contain no words — only digits,
 * which read the same in every locale. That keeps them out of the wording layer
 * entirely: no diagram needs translating, and adding a third language adds
 * nothing here.
 *
 * Colours come from the card's palette (`--ink`, `--accent`, `--paper`), so a
 * diagram follows whichever theme it is rendered in.
 */

const INK = 'var(--ink, #222)';
const ACCENT = 'var(--accent, #888)';
const PAPER = 'var(--paper, #fff)';
const FACE_DOWN = 'color-mix(in srgb, var(--ink) 30%, var(--paper))';

const svg = (viewBox, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="none"
        stroke="${INK}" stroke-linejoin="round" stroke-linecap="round"
        aria-hidden="true">${body}</svg>`;

const label = (x, y, text, size = 30) =>
  `<text x="${x}" y="${y}" font-family="var(--font-body)" font-size="${size}"
         font-weight="700" fill="${INK}" stroke="none" text-anchor="middle"
         dominant-baseline="central">${text}</text>`;

export const DIAGRAMS = {
  /**
   * Setup: the Apprentice, fourteen shuffled Masters face down, the Deity —
   * laid left to right.
   */
  setup: () => {
    const cardW = 34;
    const cardH = 58;
    const gap = 4;
    const top = 30;
    const parts = [];

    for (let i = 0; i < 16; i += 1) {
      const x = 12 + i * (cardW + gap);
      const isApprentice = i === 0;
      const isDeity = i === 15;
      const fill = isApprentice || isDeity ? ACCENT : FACE_DOWN;

      parts.push(
        `<rect x="${x}" y="${top}" width="${cardW}" height="${cardH}" rx="5"
               fill="${fill}" stroke-width="3"/>`,
      );
      if (isApprentice) parts.push(label(x + cardW / 2, top + cardH / 2, '0', 26));
      else if (isDeity) parts.push(label(x + cardW / 2, top + cardH / 2, 'D', 26));
      else {
        // A small mark standing in for the shared card back.
        parts.push(
          `<circle cx="${x + cardW / 2}" cy="${top + cardH / 2}" r="5"
                   fill="${PAPER}" stroke="none" opacity="0.75"/>`,
        );
      }
    }

    // Direction of travel, which is the whole point of the picture.
    parts.push(`<path d="M14 16 H614" stroke-width="3" opacity="0.5"/>`);
    parts.push(`<path d="M600 8 l14 8 l-14 8" stroke-width="3" opacity="0.5"/>`);

    return svg('0 0 628 100', parts.join(''));
  },

  /**
   * Turn order: the Hazards activate from lowest number to highest, and the
   * sequence skips 5, 7-10 and 12-14 — which the numbers show and a sentence
   * has to assert.
   */
  turnOrder: () => {
    const numbers = [1, 2, 3, 4, 6, 11];
    const r = 28;
    const step = 100;
    const y = 46;
    const parts = [];

    numbers.forEach((n, i) => {
      const cx = 40 + i * step;
      parts.push(
        `<circle cx="${cx}" cy="${y}" r="${r}" fill="${ACCENT}" stroke-width="3"/>`,
        label(cx, y + 1, String(n), 28),
      );
      if (i < numbers.length - 1) {
        const from = cx + r + 8;
        const to = cx + step - r - 8;
        parts.push(
          `<path d="M${from} ${y} H${to}" stroke-width="3" opacity="0.55"/>`,
          `<path d="M${to - 9} ${y - 7} l9 7 l-9 7" stroke-width="3" opacity="0.55"/>`,
        );
      }
    });

    return svg('0 0 580 92', parts.join(''));
  },
};
