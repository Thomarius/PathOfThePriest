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
  for (const card of model.cards) {
    if (!card.art) {
      missingArt += 1;
      continue;
    }
    const artPath = path.join(ROOT, 'themes', themeName, 'art', card.art);
    if (!fs.existsSync(artPath)) {
      errors.push(`card "${card.id}": art file themes/${themeName}/art/${card.art} not found`);
    }
  }
  if (missingArt) {
    warnings.push(`${missingArt} of ${model.cards.length} cards have no artwork assigned yet (M6)`);
  }

  const attribution = path.join(ROOT, 'themes', themeName, 'ATTRIBUTION.md');
  if (missingArt < model.cards.length && !fs.existsSync(attribution)) {
    errors.push(`theme ${themeName}: artwork is in use but ATTRIBUTION.md is missing`);
  }

  return { errors, warnings, model };
}
