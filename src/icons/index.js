/**
 * Loads the inline glyph set.
 *
 * Icons are authored as standalone .svg files in this directory so they can be
 * edited in a vector editor without touching code. They are stroked with
 * `currentColor` and sized in `em`, so they inherit the colour and size of the
 * text they sit in — a glyph on a dark Fake Master card needs no special case.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ICON_NAMES } from '../tokens.js';

const DIR = path.dirname(fileURLToPath(import.meta.url));

const cache = new Map();

/** Returns inline SVG markup for one icon, ready to drop into card HTML. */
export function icon(name, extraClass = '') {
  if (!ICON_NAMES.includes(name)) {
    throw new Error(`unknown icon "${name}"`);
  }
  if (!cache.has(name)) {
    const file = path.join(DIR, `${name}.svg`);
    const raw = fs.readFileSync(file, 'utf8').trim();
    cache.set(name, raw);
  }
  const cls = ['icon', `icon--${name}`, extraClass].filter(Boolean).join(' ');
  return cache
    .get(name)
    .replace('<svg ', `<svg class="${cls}" aria-hidden="true" focusable="false" `);
}

/** Verifies every declared icon has a file — called by the validator. */
export function missingIconFiles() {
  return ICON_NAMES.filter((name) => !fs.existsSync(path.join(DIR, `${name}.svg`)));
}
