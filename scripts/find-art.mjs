/**
 * Searches Wikimedia Commons for candidate artwork, one query per card.
 *
 *   node scripts/find-art.mjs            # list candidates for every card
 *   node scripts/find-art.mjs 6 11       # just these cards
 *
 * Licence status is read from Commons' own metadata rather than assumed, and
 * anything not clearly public domain is dropped. Nothing is downloaded here —
 * this only produces a shortlist to review. Use scripts/fetch-art.mjs to pull
 * the chosen files.
 *
 * Queries aim at 19th-century engraving (Doré above all) and medieval
 * manuscript art, because the hard part of sourcing 16 images is not finding
 * them but finding sixteen that look like one deck.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UA = 'PathOfThePriest/0.1 (private print-and-play card project)';

/** Minimum usable size: the Master art window is 816x470, full-art is 816x1110. */
const MIN_W = 800;
const MIN_H = 600;

const QUERIES = {
  '0': ['Gustave Doré minstrel', 'medieval minstrel lute engraving'],
  '1': ['Gustave Doré whirlwind Inferno', 'engraving vortex souls'],
  '2': ['hellmouth medieval manuscript', 'Doré monstrous mouth Inferno'],
  '3': ['Gustave Doré abyss pit Inferno', 'engraving falling into pit'],
  '4': ['Golem Prague illustration', 'Der Golem 1920 film'],
  '5': ['Jacques Callot beggar etching', 'Gustave Doré thief'],
  '6': ['Gustave Doré minotaur', 'minotaur engraving'],
  '7': ['Gustave Doré wizard sorcerer', 'alchemist engraving laboratory'],
  '8': ['Gustave Doré monk friar', 'medieval monk engraving'],
  '9': ['Gustave Doré hound dog engraving', 'greyhound engraving 19th century'],
  '10': ['Gustave Doré knight armour', 'Dürer knight engraving'],
  '11': ['geldwisselaar prent Rijksmuseum', 'miser gold engraving Rijksmuseum'],
  '12': ['Rijksmuseum ezel prent etching', 'donkey laden panniers etching'],
  '13': ['Moses rod serpent engraving', 'sorcerer wand engraving Rijksmuseum'],
  '14': ['armillary sphere engraving Rijksmuseum', 'astrological circle diagram engraving'],
  D: ['treasure chest engraving', 'Gustave Doré treasure hoard'],
};

const IMAGE_EXT = /\.(jpe?g|png)$/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Commons rate-limits bursts with 429; back off rather than dropping cards. */
async function getJson(url, attempt = 0) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (res.status === 429 && attempt < 5) {
    await sleep([5000, 15000, 30000, 60000, 90000][attempt]);
    return getJson(url, attempt + 1);
  }
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function search(query, limit = 8) {
  const url =
    'https://commons.wikimedia.org/w/api.php?action=query&format=json' +
    `&generator=search&gsrsearch=${encodeURIComponent(query)}` +
    `&gsrnamespace=6&gsrlimit=${limit}` +
    '&prop=imageinfo&iiprop=url|size|extmetadata';

  await sleep(2500);
  const json = await getJson(url);

  return Object.values(json.query?.pages ?? {})
    .map((page) => {
      const info = page.imageinfo?.[0] ?? {};
      const meta = info.extmetadata ?? {};
      const strip = (v) => String(v ?? '').replace(/<[^>]*>/g, '').trim();
      return {
        title: page.title,
        width: info.width,
        height: info.height,
        url: (info.url ?? '').split('?')[0],
        descriptionUrl: info.descriptionurl,
        licence: strip(meta.LicenseShortName?.value),
        artist: strip(meta.Artist?.value).slice(0, 60),
        credit: strip(meta.Credit?.value).slice(0, 60),
      };
    })
    .filter(
      (c) =>
        IMAGE_EXT.test(c.url) &&
        c.width >= MIN_W &&
        c.height >= MIN_H &&
        /public domain|CC0|PD/i.test(c.licence),
    );
}

const wanted = process.argv.slice(2);
const ids = Object.keys(QUERIES).filter((id) => !wanted.length || wanted.includes(id));

// Card names only, to label the shortlist. Any theme will do; the base one is
// the only one that ships.
const theme = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'themes/dungeon-bright/theme.json'), 'utf8'),
);

// Commons rate-limits aggressively, so runs accumulate into one file rather
// than starting over. Re-running fills in whatever is still missing.
const OUT = path.join(ROOT, 'out', 'art-candidates.json');
const results = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
const save = () => {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(results, null, 2)}
`);
};

for (const id of ids) {
  if (results[id]?.length && !process.env.REFRESH) {
    console.log(`=== ${id} · ${theme.cards[id]?.name ?? id} === (${results[id].length} cached)`);
    continue;
  }
  const seen = new Set();
  const found = [];
  for (const query of QUERIES[id]) {
    let batch = [];
    try {
      batch = await search(query);
    } catch (err) {
      console.log(`  (${query}: ${err.message})`);
      continue;
    }
    for (const candidate of batch) {
      if (seen.has(candidate.url)) continue;
      seen.add(candidate.url);
      found.push({ ...candidate, query });
    }
  }
  results[id] = found;
  save();

  const name = theme.cards[id]?.name ?? id;
  console.log(`\n=== ${id} · ${name} === (${found.length} candidates)`);
  for (const c of found.slice(0, 5)) {
    console.log(`  ${c.width}x${c.height}  ${c.licence}  ${c.title.replace('File:', '')}`);
    console.log(`    ${c.url}`);
  }
}

save();
const missing = Object.keys(QUERIES).filter((id) => !results[id]?.length);
console.log(`\nwrote ${path.relative(ROOT, OUT)}`);
console.log(
  missing.length
    ? `still missing: ${missing.join(', ')} — re-run to continue`
    : 'all cards have candidates',
);
