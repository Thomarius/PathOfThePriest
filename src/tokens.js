/**
 * Token expansion for localized strings.
 *
 * Locale files contain no card names and no faction names. They reference them
 * through tokens that are resolved against the active theme, so re-theming a
 * card can never silently break the text printed on another card.
 *
 *   {icon:swap}          inline glyph
 *   {card:2}             card name from the theme
 *   {faction:true.other} faction label from the theme, in the named form
 *
 * Output is a segment list rather than HTML: M1 has no renderer yet, and the
 * templates in M2 decide how an icon or a card reference is actually drawn.
 */

export const ICON_NAMES = [
  'advance',
  'moveBack',
  'move',
  'swap',
  'destroy',
  'send',
  'adjacent',
  'lowest',
];

const TOKEN_RE = /\{([a-zA-Z]+):([^}]*)\}/g;

/**
 * @param {string} text
 * @param {{cardName?: (id: string) => string | undefined,
 *          factionLabel?: (id: string, form: string) => string | undefined}} ctx
 * @returns {{segments: Array<object>, plain: string, errors: string[]}}
 */
export function parseSegments(text, ctx = {}) {
  const segments = [];
  const errors = [];
  const literalParts = [];

  let cursor = 0;
  const pushText = (value) => {
    if (!value) return;
    literalParts.push(value);
    segments.push({ t: 'text', v: value });
  };

  for (const match of text.matchAll(TOKEN_RE)) {
    pushText(text.slice(cursor, match.index));
    cursor = match.index + match[0].length;

    const [raw, kind, arg] = match;
    switch (kind) {
      case 'icon': {
        if (!ICON_NAMES.includes(arg)) {
          errors.push(`unknown icon "${arg}" in ${raw}`);
          segments.push({ t: 'text', v: raw });
          break;
        }
        segments.push({ t: 'icon', name: arg });
        break;
      }
      case 'card': {
        const name = ctx.cardName?.(arg);
        if (name == null) {
          errors.push(`unknown card reference "${arg}" in ${raw}`);
          segments.push({ t: 'text', v: raw });
          break;
        }
        segments.push({ t: 'card', id: arg, v: name });
        break;
      }
      case 'faction': {
        const dot = arg.indexOf('.');
        const id = dot === -1 ? arg : arg.slice(0, dot);
        const form = dot === -1 ? 'one' : arg.slice(dot + 1);
        const label = ctx.factionLabel?.(id, form);
        if (label == null) {
          errors.push(`unknown faction label "${id}.${form}" in ${raw}`);
          segments.push({ t: 'text', v: raw });
          break;
        }
        segments.push({ t: 'faction', id, form, v: label });
        break;
      }
      default:
        errors.push(`unknown token type "${kind}" in ${raw}`);
        segments.push({ t: 'text', v: raw });
    }
  }
  pushText(text.slice(cursor));

  // Braces surviving in literal text mean a malformed or half-written token.
  // Checked only on literal slices so a failed token above is not reported twice.
  for (const part of literalParts) {
    if (/[{}]/.test(part)) {
      errors.push(`unparsed brace in "${part.trim()}"`);
    }
  }

  return { segments, plain: toPlain(segments), errors };
}

/** Text with icons dropped — used for length estimates and validation output. */
export function toPlain(segments) {
  return segments
    .map((s) => (s.t === 'icon' ? '' : s.v))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}
