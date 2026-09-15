/**
 * Structural validation of the data layers.
 *
 * These are the checks that can be made without a browser. Text overflow and
 * safe-zone violations need live layout measurement and arrive in M5.
 */

import fs from 'node:fs';
import path from 'node:path';
import { buildModel, ROOT } from './model.js';
import { missingIconFiles } from './icons/index.js';
import { vendoredFamilies } from './template/fonts.js';
import { DIAGRAMS } from './template/diagrams.js';

const EXPECTED = {
  true: [5, 7, 8, 9, 10, 12, 13, 14],
  fake: [1, 2, 3, 4, 6, 11],
};

export function validate(overrides = {}) {
  const errors = [];
  const warnings = [];

  let built;
  try {
    built = buildModel(overrides);
  } catch (err) {
    return { errors: [err.message], warnings, model: null };
  }

  const { model, sources } = built;
  errors.push(...built.errors);

  const { deck, cardData, theme, localeName, themeName } = sources;

  // --- deck composition -----------------------------------------------------

  const duplicates = deck.faces.filter((id, i) => deck.faces.indexOf(id) !== i);
  if (duplicates.length) {
    errors.push(`deck.faces: duplicate entries ${[...new Set(duplicates)].join(', ')}`);
  }
  if (deck.faces.length !== 16) {
    errors.push(`deck.faces: expected 16 playing cards, found ${deck.faces.length}`);
  }

  const byFaction = (f) => model.cards.filter((c) => c.faction === f);
  for (const [faction, numbers] of Object.entries(EXPECTED)) {
    const actual = byFaction(faction)
      .map((c) => c.number)
      .sort((a, b) => a - b);
    if (actual.join(',') !== numbers.join(',')) {
      errors.push(
        `${faction} masters: expected numbers [${numbers.join(', ')}], found [${actual.join(', ')}]`,
      );
    }
  }
  for (const faction of ['apprentice', 'deity']) {
    const count = byFaction(faction).length;
    if (count !== 1) errors.push(`expected exactly 1 ${faction} card, found ${count}`);
  }

  // --- theme completeness ---------------------------------------------------

  for (const card of model.cards) {
    if (!card.name) {
      errors.push(`theme ${themeName}: card "${card.id}" (${card.ref}) has no name`);
    }
    if (!card.palette) {
      warnings.push(`theme ${themeName}: no palette for faction "${card.faction}"`);
    }
  }

  const themeCardIds = Object.keys(theme.cards ?? {});
  const knownIds = new Set(cardData.cards.map((c) => c.id));
  for (const id of themeCardIds) {
    if (!knownIds.has(id)) {
      warnings.push(`theme ${themeName}: card "${id}" is not part of the game`);
    }
  }

  // --- locale completeness --------------------------------------------------

  const usedKeys = new Set(cardData.cards.flatMap((c) => c.effects.map((e) => e.key)));
  const localeKeys = Object.keys(sources.locale.effects ?? {});
  for (const key of localeKeys) {
    if (!usedKeys.has(key)) {
      warnings.push(`locale ${localeName}: effect "${key}" is never used by any card`);
    }
  }

  // --- icon glyphs ----------------------------------------------------------

  for (const name of missingIconFiles()) {
    errors.push(`icon "${name}" is a valid token but src/icons/${name}.svg does not exist`);
  }

  // --- fonts ----------------------------------------------------------------

  // A theme naming a font we have not vendored would silently fall back to
  // whatever is installed locally, and output would stop matching between
  // machines — the whole reason the files are committed.
  const families = vendoredFamilies();
  if (families.length === 0) {
    errors.push('no fonts vendored — run "npm run fonts"');
  }
  for (const [role, stack] of Object.entries(theme.typography ?? {})) {
    if (role.startsWith('$') || typeof stack !== 'string') continue;
    const first = stack.split(',')[0].trim().replace(/^["']|["']$/g, '');
    if (!families.includes(first)) {
      errors.push(
        `theme ${themeName}: typography.${role} leads with "${first}", which is not vendored ` +
          `(have: ${families.join(', ')}) — rendering would differ between machines`,
      );
    }
  }

  // --- diagrams -------------------------------------------------------------

  for (const card of model.rulesCards) {
    for (const block of card.blocks) {
      if (block.type === 'diagram' && !DIAGRAMS[block.name]) {
        errors.push(`rules card ${card.id}: unknown diagram "${block.name}"`);
      }
    }
  }

  // --- card backs -----------------------------------------------------------

  const covered = new Map();
  for (const back of model.backs) {
    for (const id of back.appliesTo) {
      if (covered.has(id)) {
        errors.push(`card "${id}" is assigned two backs: ${covered.get(id)} and ${back.id}`);
      }
      covered.set(id, back.id);
    }
  }
  for (const card of model.cards) {
    if (!covered.has(card.id)) errors.push(`card "${card.id}" (${card.ref}) has no card back`);
  }

  // The 14 Masters are shuffled during setup, so they must be indistinguishable
  // from behind. Anything less than a single shared back leaks information.
  const masterBacks = new Set(
    model.cards
      .filter((c) => c.faction === 'true' || c.faction === 'fake')
      .map((c) => covered.get(c.id)),
  );
  if (masterBacks.size !== 1) {
    errors.push(
      `the 14 Masters must share exactly 1 back design, found ${masterBacks.size}: ` +
        `${[...masterBacks].join(', ')} — a shuffled card would be identifiable`,
    );
  }

  // --- artwork (M6 still pending, so absence is a warning) ------------------

  let missingArt = 0;
  let artFiles = 0;
  for (const card of model.cards) {
    // A card with a drawn motif has its art window filled procedurally and
    // needs no file — see decor.js.
    if (!card.art) {
      if (!card.motif) missingArt += 1;
      continue;
    }
    artFiles += 1;
    const artPath = path.join(ROOT, 'themes', themeName, 'art', card.art);
    if (!fs.existsSync(artPath)) {
      errors.push(`card "${card.id}": art file themes/${themeName}/art/${card.art} not found`);
    }
  }
  if (missingArt) {
    warnings.push(`${missingArt} of ${model.cards.length} cards have no artwork assigned yet (M6)`);
  }

  // Required only when actual image files are used. A drawn motif is ours and
  // needs no attribution; counting it as "art in use" wrongly failed a theme
  // that had no image files at all.
  const attribution = path.join(ROOT, 'themes', themeName, 'ATTRIBUTION.md');
  if (artFiles > 0 && !fs.existsSync(attribution)) {
    errors.push(`theme ${themeName}: artwork is in use but ATTRIBUTION.md is missing`);
  }

  return { errors, warnings, model };
}
