/**
 * Merges the three data layers — mechanics (data/), theme (themes/) and
 * wording (locales/) — into a single render model.
 *
 * The model is deliberately renderer-agnostic and deterministic: no timestamps,
 * no randomness, no HTML. Templates (M2) and the Playwright renderer (M4)
 * consume it; nothing here knows what the theme's topic is.
 */

import fs from 'node:fs';
import path from 'node:path';
import { parseSegments, toPlain } from './tokens.js';

export const ROOT = path.resolve(import.meta.dirname, '..');

export function loadJson(relPath) {
  const full = path.join(ROOT, relPath);
  try {
    return JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch (err) {
    throw new Error(`cannot read ${relPath}: ${err.message}`);
  }
}

const round2 = (n) => Math.round(n * 100) / 100;
const mmToPx = (mm, dpi) => (mm / 25.4) * dpi;

/**
 * Resolves a print profile into concrete pixel geometry.
 *
 * Everything downstream must take its dimensions from here. Bleed is derived
 * from the finished canvas rather than from millimetres, so a pxOverride can
 * never drift out of sync with the trim box it is supposed to surround.
 */
export function resolveGeometry(profile, name) {
  const [trimWmm, trimHmm] = profile.trimMm;
  const { dpi, bleedMm, safeMm } = profile;

  const trimWidthPx = mmToPx(trimWmm, dpi);
  const trimHeightPx = mmToPx(trimHmm, dpi);

  const bleedPx = mmToPx(bleedMm, dpi);
  let widthPx = Math.round(trimWidthPx + 2 * bleedPx);
  let heightPx = Math.round(trimHeightPx + 2 * bleedPx);

  // Without an override the declared bleed is authoritative and the canvas is
  // rounded to it. With an override the canvas is authoritative, so bleed is
  // re-derived from it — otherwise a service's published pixel size and its
  // declared bleed would disagree about where the trim box sits.
  let bleedXPx = bleedPx;
  let bleedYPx = bleedPx;
  if (profile.pxOverride) {
    [widthPx, heightPx] = profile.pxOverride;
    bleedXPx = (widthPx - trimWidthPx) / 2;
    bleedYPx = (heightPx - trimHeightPx) / 2;
  }

  const safePx = mmToPx(safeMm, dpi);

  return {
    profile: name,
    label: profile.label,
    dpi,
    trimMm: profile.trimMm,
    bleedMm,
    safeMm,
    widthPx,
    heightPx,
    // Reported as the canvas minus bleed so the trim box nests exactly inside
    // the rendered image, rather than being recomputed from mm and drifting.
    trimWidthPx: round2(widthPx - 2 * bleedXPx),
    trimHeightPx: round2(heightPx - 2 * bleedYPx),
    bleedXPx: round2(bleedXPx),
    bleedYPx: round2(bleedYPx),
    safeInsetXPx: round2(bleedXPx + safePx),
    safeInsetYPx: round2(bleedYPx + safePx),
    imposition: profile.imposition ?? null,
  };
}

/**
 * Folds `theme.localeOverrides[<locale>]` into the theme.
 *
 * Card names and faction labels are theme data, but they are also
 * language-specific, so one theme must be able to serve more than one locale
 * without duplicating its artwork and palette. German additionally needs case
 * forms for faction labels ("einen *Wahren* Meister"), which is why faction
 * forms are an open-ended map rather than a fixed singular/plural pair.
 */
export function applyLocaleOverride(theme, localeName) {
  const override = theme.localeOverrides?.[localeName];
  if (!override) return theme;

  const mergeById = (base = {}, patch = {}) => {
    const out = { ...base };
    for (const [id, value] of Object.entries(patch)) {
      out[id] = { ...(base[id] ?? {}), ...value };
    }
    return out;
  };

  return {
    ...theme,
    ...override,
    factions: mergeById(theme.factions, override.factions),
    cards: mergeById(theme.cards, override.cards),
    palette: mergeById(theme.palette, override.palette),
    typography: { ...theme.typography, ...override.typography },
  };
}

/**
 * @param {{theme?: string, locale?: string, profile?: string}} overrides
 */
export function buildModel(overrides = {}) {
  const deck = loadJson('data/deck.json');
  const cardData = loadJson('data/cards.json');
  const profiles = loadJson('config/print-profiles.json');

  const themeName = overrides.theme ?? deck.theme;
  const localeName = overrides.locale ?? deck.locale;
  const profileName = overrides.profile ?? deck.profile ?? profiles.default;

  const theme = applyLocaleOverride(loadJson(`themes/${themeName}/theme.json`), localeName);
  const locale = loadJson(`locales/${localeName}.json`);

  const profile = profiles.profiles[profileName];
  if (!profile) {
    throw new Error(
      `unknown print profile "${profileName}" (have: ${Object.keys(profiles.profiles).join(', ')})`,
    );
  }

  const errors = [];
  const byId = new Map(cardData.cards.map((c) => [c.id, c]));

  const ctx = {
    cardName: (id) => theme.cards?.[id]?.name,
    factionLabel: (id, form) => theme.factions?.[id]?.[form],
  };

  /** Parses one string, attributing any token error to a source location. */
  const parse = (text, where) => {
    const result = parseSegments(text, ctx);
    for (const e of result.errors) errors.push(`${where}: ${e}`);
    return result;
  };

  const cards = deck.faces.map((id) => {
    const card = byId.get(id);
    if (!card) {
      errors.push(`deck.faces: no card "${id}" in data/cards.json`);
      return null;
    }
    const themeCard = theme.cards?.[id] ?? {};
    const effects = card.effects.map((effect) => {
      const raw = locale.effects?.[effect.key];
      if (raw == null) {
        errors.push(`card ${id}: effect "${effect.key}" missing from locale ${localeName}`);
        return { ...effect, segments: [], plain: '' };
      }
      const { segments, plain } = parse(raw, `card ${id} effect ${effect.key}`);
      return { key: effect.key, kind: effect.kind, segments, plain };
    });

    return {
      id: card.id,
      ref: card.ref,
      number: card.number,
      numberLabel: card.numberLabel ?? String(card.number),
      faction: card.faction,
      factionLabel: theme.factions?.[card.faction]?.one ?? null,
      name: themeCard.name ?? null,
      art: themeCard.art ?? null,
      artFocus: themeCard.focus ?? [0.5, 0.5],
      palette: theme.palette?.[card.faction] ?? null,
      effects,
    };
  });

  const rulesCards = deck.rulesCards.map((entry) => {
    const content = resolvePath(locale, entry.key);
    if (content == null) {
      errors.push(`rules card ${entry.id}: "${entry.key}" missing from locale ${localeName}`);
      return { id: entry.id, layout: entry.layout, title: null, blocks: [] };
    }
    return {
      id: entry.id,
      layout: entry.layout,
      title: content.title ?? null,
      blocks: buildRulesBlocks(content, entry.layout, parse, entry.id),
    };
  });

  const backs = deck.backs.map((back) => ({
    id: back.id,
    design: back.design,
    appliesTo: back.appliesTo,
    palette: theme.palette?.[back.design] ?? null,
  }));

  return {
    model: {
      meta: {
        theme: themeName,
        locale: localeName,
        htmlLang: locale.meta?.htmlLang ?? localeName,
        title: theme.title ?? null,
        subtitle: theme.subtitle ?? null,
      },
      geometry: resolveGeometry(profile, profileName),
      typography: theme.typography ?? {},
      ui: locale.ui ?? {},
      cards: cards.filter(Boolean),
      rulesCards,
      backs,
    },
    errors,
    sources: { deck, cardData, theme, locale, themeName, localeName, profileName },
  };
}

/*
 * German runs 20-30% longer than English and brings compound words that resist
 * wrapping. Since the translation does not exist yet (M0), this inflates the
 * current text so the layout can be proven against it in advance, instead of
 * discovering the overflow after the wording is locked.
 */
const STRESS_FILLER = [
  'Handlungsmöglichkeit',
  'zurückzuziehen',
  'Nachbarkarte',
  'entsprechend',
  'Bewegungsrichtung',
  'ausgeführt',
];

export function applyStress(model, factor) {
  let fillerIndex = 0;

  for (const card of model.cards) {
    for (const effect of card.effects) {
      // Filler is woven through the sentence rather than appended in one blob.
      // Appending pushed the whole increase onto the last line, so a short
      // effect could absorb +40% without gaining a line and the measurement
      // reported no change at all.
      effect.segments = effect.segments.map((segment) => {
        if (segment.t !== 'text') return segment;

        let need = Math.round(segment.v.trim().length * (factor - 1));
        if (need <= 0) return segment;

        const parts = [];
        for (const token of segment.v.split(/(\s+)/)) {
          parts.push(token);
          if (need > 0 && /\S/.test(token)) {
            const filler = STRESS_FILLER[fillerIndex % STRESS_FILLER.length];
            fillerIndex += 1;
            parts.push(` ${filler}`);
            need -= filler.length + 1;
          }
        }
        return { ...segment, v: parts.join('') };
      });

      effect.plain = toPlain(effect.segments);
    }
  }

  model.meta.stress = factor;
  return model;
}

/** Normalizes the per-layout rules card shapes into a uniform block list. */
function buildRulesBlocks(content, layout, parse, where) {
  const blocks = [];

  if (Array.isArray(content.body)) {
    blocks.push({
      type: 'paragraphs',
      items: content.body.map((t, i) => parse(t, `${where} body[${i}]`).segments),
    });
  }

  if (Array.isArray(content.items)) {
    blocks.push({
      type: 'list',
      ordered: layout === 'steps',
      items: content.items.map((t, i) => parse(t, `${where} items[${i}]`).segments),
    });
  }

  if (Array.isArray(content.entries)) {
    blocks.push({
      type: 'glossary',
      entries: content.entries.map((entry, i) => ({
        term: entry.term,
        icon: entry.icon ?? null,
        segments: parse(entry.text, `${where} entries[${i}]`).segments,
      })),
    });
  }

  for (const [i, section] of (content.sections ?? []).entries()) {
    blocks.push({
      type: 'section',
      heading: section.heading ?? null,
      items: (section.items ?? []).map(
        (t, j) => parse(t, `${where} sections[${i}].items[${j}]`).segments,
      ),
    });
  }

  return blocks;
}

function resolvePath(obj, dotted) {
  return dotted.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}
