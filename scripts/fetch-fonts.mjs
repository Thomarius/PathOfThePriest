/**
 * Vendors the OFL font files into assets/fonts.
 *
 * Rendered output must be identical on every machine, so the fonts cannot be
 * left to whatever happens to be installed locally. This downloads the exact
 * woff2 subsets we use, plus their licences, and writes a manifest that the
 * templates turn into @font-face rules.
 *
 *   node scripts/fetch-fonts.mjs
 *
 * Re-run only to change weights or update versions; the files are committed.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'assets', 'fonts');

// A modern UA is required or the API serves ttf instead of woff2.
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

// German needs U+00C0-00FF (äöüß), which the "latin" subset already covers;
// "latin-ext" is kept for names a theme might use.
const SUBSETS = new Set(['latin', 'latin-ext']);

const FAMILIES = [
  // Bright/anime themes: a rounded display face and a rounded, highly legible
  // body face. Both OFL, both cover latin-ext for German.
  { family: 'Baloo 2', weights: [700, 800], licence: 'baloo2' },
  { family: 'Nunito', weights: [400, 700], licence: 'nunito' },
];

async function get(url, asText = true) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return asText ? res.text() : Buffer.from(await res.arrayBuffer());
}

/** Pulls the @font-face blocks out of the Google Fonts CSS response. */
function parseCss(css) {
  const blocks = [];
  const re = /\/\*\s*([a-z-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g;
  for (const [, subset, body] of css.matchAll(re)) {
    const weight = body.match(/font-weight:\s*(\d+)/)?.[1];
    const url = body.match(/url\((https:[^)]+)\)/)?.[1];
    const range = body.match(/unicode-range:\s*([^;]+);/)?.[1]?.trim();
    if (subset && weight && url) {
      blocks.push({ subset, weight: Number(weight), url, unicodeRange: range });
    }
  }
  return blocks;
}

const manifest = [];
fs.mkdirSync(OUT, { recursive: true });

for (const spec of FAMILIES) {
  const query = `${spec.family.replace(/ /g, '+')}:wght@${spec.weights.join(';')}`;
  const css = await get(`https://fonts.googleapis.com/css2?family=${query}&display=block`);

  const wanted = parseCss(css).filter(
    (b) => SUBSETS.has(b.subset) && spec.weights.includes(b.weight),
  );

  // Some families (Cormorant Garamond) are variable: the API returns the same
  // file URL for several weights, and the browser instances the weight axis.
  // Those must become ONE @font-face carrying a weight *range* — emitting two
  // fixed-weight rules against one variable file renders both at the same
  // weight, silently losing the distinction between them.
  const byUrl = new Map();
  for (const block of wanted) {
    if (!byUrl.has(block.url)) byUrl.set(block.url, { ...block, weights: [] });
    byUrl.get(block.url).weights.push(block.weight);
  }

  const slug = spec.family.toLowerCase().replace(/ /g, '-');
  for (const block of byUrl.values()) {
    const weights = [...new Set(block.weights)].sort((a, b) => a - b);
    const variable = weights.length > 1;
    const file = `${slug}-${weights.join('-')}-${block.subset}.woff2`;
    fs.writeFileSync(path.join(OUT, file), await get(block.url, false));

    manifest.push({
      family: spec.family,
      weight: variable ? `${weights[0]} ${weights.at(-1)}` : String(weights[0]),
      variable,
      style: 'normal',
      subset: block.subset,
      file,
      unicodeRange: block.unicodeRange,
    });
    console.log(`  ${file}${variable ? '  (variable, weight range)' : ''}`);
  }

  const licence = await get(
    `https://raw.githubusercontent.com/google/fonts/main/ofl/${spec.licence}/OFL.txt`,
  );
  fs.writeFileSync(path.join(OUT, `OFL-${spec.licence}.txt`), licence);
  console.log(`  OFL-${spec.licence}.txt`);
}

manifest.sort((a, b) => a.file.localeCompare(b.file));
fs.writeFileSync(path.join(OUT, 'fonts.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`\nwrote assets/fonts/fonts.json (${manifest.length} files)`);
