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
import { fileURLToPath } from 'node:url';
import { parseSegments, toPlain } from './tokens.js';
import { decorFor } from './template/decor.js';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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
/**
 * Resolves `theme.extends`: a theme may inherit from another and override only
 * what differs. Two themes sharing a setting should not have to duplicate 16
 * card names in two languages.
 *
 * Artwork is NOT inherited. Art belongs to a visual style, and a bright theme
 * pointing at an engraving theme's files would reference images that do not
 * exist in its own art directory. A child opts in with `inheritArt: true`.
 */
export function resolveExtends(theme, loadTheme, seen = []) {
  if (!theme.extends) return theme;
  if (seen.includes(theme.extends)) {
    throw new Error(`theme inheritance loop: ${[...seen, theme.extends].join(' -> ')}`);
  }

  const parent = resolveExtends(loadTheme(theme.extends), loadTheme, [...seen, theme.extends]);

  const mergeById = (base = {}, patch = {}) => {
    const out = {};
    for (const [id, value] of Object.entries(base)) out[id] = { ...value };
    for (const [id, value] of Object.entries(patch)) out[id] = { ...(out[id] ?? {}), ...value };
    return out;
  };

  const cards = mergeById(parent.cards, theme.cards);
  if (!theme.inheritArt) {
    for (const card of Object.values(cards)) {
      delete card.art;
      delete card.focus;
    }
    for (const [id, own] of Object.entries(theme.cards ?? {})) {
      if (own.art) cards[id].art = own.art;
      if (own.focus) cards[id].focus = own.focus;
    }
  }

  const localeOverrides = {};
  for (const code of new Set([
    ...Object.keys(parent.localeOverrides ?? {}),
    ...Object.keys(theme.localeOverrides ?? {}),
  ])) {
    const p = parent.localeOverrides?.[code] ?? {};
    const c = theme.localeOverrides?.[code] ?? {};
    localeOverrides[code] = {
      ...p,
      ...c,
      factions: mergeById(p.factions, c.factions),
      terms: mergeById(p.terms, c.terms),
      cards: mergeById(p.cards, c.cards),
    };
  }

  return {
    ...parent,
    ...theme,
    factions: mergeById(parent.factions, theme.factions),
    terms: mergeById(parent.terms, theme.terms),
    palette: mergeById(parent.palette, theme.palette),
    typography: { ...parent.typography, ...theme.typography },
    decor: { ...parent.decor, ...theme.decor },
    cards,
    localeOverrides,
  };
}

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
    terms: mergeById(theme.terms, override.terms),
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

  const loadTheme = (name) => loadJson(`themes/${name}/theme.json`);
  const theme = applyLocaleOverride(
    resolveExtends(loadTheme(themeName), loadTheme),
    localeName,
  );
  const locale = loadJson(`locales/${localeName}.json`);

  const profile = profiles.profiles[profileName];
  if (!profile) {
    throw new Error(
      `unknown print profile "${profileName}" (have: ${Object.keys(profiles.profiles).join(', ')})`,
    );
  }

  const errors = [];
  const byId = new Map(cardData.cards.map((c) => [c.id, c]));

  /*
   * Cards this language is allowed to hyphenate. Breaking a word across lines is
   * a last resort, not a default: the browser will do it wherever it tidies the
   * ragged edge, which on a card with five spare lines just costs legibility for
   * nothing. It belongs to the locale because the need is language-specific —
   * German requires it on card 7 and English requires it nowhere.
   */
  const hyphenate = new Set(locale.meta?.hyphenate ?? []);

  const ctx = {
    // `inline` is the name as it reads *inside a sentence*; `name` is what is
    // printed on the card. Only cards 0 and 2 are ever referenced by token, and
    // a flavourful multi-word name ("Hungry Mimic") reads badly after a
    // preposition, where "the Mimic" is what you would actually say.
    cardName: (id) => theme.cards?.[id]?.inline ?? theme.cards?.[id]?.name,
    factionLabel: (id, form) => theme.factions?.[id]?.[form],
    term: (id, form) => theme.terms?.[id]?.[form],
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
      motif: themeCard.motif ?? null,
      artFocus: themeCard.focus ?? [0.5, 0.5],
      palette: theme.palette?.[card.faction] ?? null,
      hyphenate: hyphenate.has(card.id),
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

  /*
   * The title card. Not a playing card and not a rules card: it carries no
   * mechanics, so it is declared in deck.json rather than in cards.json, which
   * the rules fix at 16 faces.
   *
   * Its three pieces come from three different layers, which is the whole point
   * of the split: the title and subtitle are theme data (and language-specific,
   * so they fold through localeOverrides), the hero motif is a drawing shared by
   * every theme, and the credit is theme-blind wording and therefore locale.
   */
  let titleCard = null;
  if (deck.titleCard) {
    const content = resolvePath(locale, deck.titleCard.key);
    if (content == null) {
      errors.push(
        `title card: "${deck.titleCard.key}" missing from locale ${localeName}`,
      );
    }
    const colophon = (content?.colophon ?? []).map(
      (line, i) => parse(line, `title card colophon line ${i + 1}`).segments,
    );
    titleCard = {
      id: deck.titleCard.id,
      title: theme.title ?? null,
      subtitle: theme.subtitle ?? null,
      colophon,
      motif: theme.titleMotif ?? null,
      // The goal card's palette, not the master back's: a title card in the
      // back's colours reads as a back, which is the thing this layout exists
      // to avoid.
      palette: theme.palette?.title ?? theme.palette?.deity ?? null,
      /*
       * The back is the deck's blue instead, so front and back read as two
       * sides rather than two cards, and it carries the Apprentice, the
       * antagonist and the Deity — the three fixed points of the Path, in the
       * order they stand on it, with the antagonist between them.
       */
      back: {
        id: `${deck.titleCard.id}-back`,
        palette: theme.palette?.master ?? null,
        motifs: ['0', '2', 'D'].map((id) => theme.cards?.[id]?.motif ?? null),
      },
    };
  }

  const backs = deck.backs.map((back) => ({
    id: back.id,
    design: back.design,
    appliesTo: back.appliesTo,
    reuseFront: back.reuseFront ?? null,
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
      decor: decorFor(theme),
      rulesPalette: theme.palette?.rules ?? theme.palette?.apprentice ?? null,
      // The turn-order diagram draws the Hazards as they appear on their own
      // cards, so it needs their palette rather than the rules card's.
      // `fake` is a mechanical faction id from data/cards.json, not a topic.
      hazardPalette: theme.palette?.fake ?? null,
      ui: locale.ui ?? {},
      cards: cards.filter(Boolean),
      titleCard,
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

  // Language-neutral, so it carries no translatable content — just a name.
  if (content.diagram) {
    blocks.push({ type: 'diagram', name: content.diagram });
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
