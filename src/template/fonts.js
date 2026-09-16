/**
 * Turns the vendored font manifest into @font-face rules with the woff2 files
 * inlined as data URIs.
 *
 * Embedding rather than linking is what makes output reproducible: the page
 * carries its own fonts, so it renders identically regardless of what is
 * installed on the machine, needs no static server, and cannot half-load a
 * face over file://. It also removes the asset-path class of bugs entirely.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'assets',
  'fonts',
);
const MANIFEST = path.join(DIR, 'fonts.json');

let cached = null;

export function fontManifest() {
  if (!fs.existsSync(MANIFEST)) return [];
  return JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
}

/** Families available to themes, for validation. */
export function vendoredFamilies() {
  return [...new Set(fontManifest().map((f) => f.family))];
}

export function fontFaceCss() {
  if (cached) return cached;

  cached = fontManifest()
    .map((font) => {
      const data = fs.readFileSync(path.join(DIR, font.file)).toString('base64');
      return [
        '@font-face{',
        `font-family:'${font.family}';`,
        `font-style:${font.style};`,
        // A variable file declares a weight *range*; the browser instances the
        // axis. Splitting it into fixed weights would render them identically.
        `font-weight:${font.weight};`,
        'font-display:block;',
        `src:url(data:font/woff2;base64,${data}) format('woff2');`,
        `unicode-range:${font.unicodeRange};`,
        '}',
      ].join('');
    })
    .join('\n');

  return cached;
}
