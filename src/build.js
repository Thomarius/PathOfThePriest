#!/usr/bin/env node
/**
 * CLI entry point.
 *
 *   node src/build.js validate [--theme x] [--locale de] [--profile mpc]
 *   node src/build.js model    [--out out/model.json]
 *
 * Rendering commands (build, preview) arrive with M2/M4.
 */

import fs from 'node:fs';
import path from 'node:path';
import { buildModel, ROOT } from './model.js';
import { validate } from './validate.js';

const COMMANDS = ['validate', 'model'];

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const flags = {};
  for (let i = 0; i < rest.length; i += 1) {
    if (!rest[i].startsWith('--')) continue;
    const key = rest[i].slice(2);
    const next = rest[i + 1];
    flags[key] = next && !next.startsWith('--') ? (i += 1, next) : true;
  }
  return { command, flags };
}

function overridesFrom(flags) {
  const out = {};
  for (const key of ['theme', 'locale', 'profile']) {
    if (typeof flags[key] === 'string') out[key] = flags[key];
  }
  return out;
}

function cmdValidate(flags) {
  const { errors, warnings, model } = validate(overridesFrom(flags));

  for (const w of warnings) console.log(`  warn   ${w}`);
  for (const e of errors) console.log(`  ERROR  ${e}`);

  if (model) {
    const g = model.geometry;
    console.log(
      `\n  ${model.cards.length} cards, ${model.rulesCards.length} rules cards, ` +
        `${model.backs.length} backs · theme "${model.meta.theme}" · locale "${model.meta.locale}"`,
    );
    console.log(
      `  profile "${g.profile}": ${g.widthPx}x${g.heightPx} px @ ${g.dpi} dpi ` +
        `(trim ${g.trimMm[0]}x${g.trimMm[1]} mm, bleed ${g.bleedXPx}/${g.bleedYPx} px, ` +
        `safe inset ${g.safeInsetXPx}/${g.safeInsetYPx} px)`,
    );
  }

  console.log(
    `\n  ${errors.length} error(s), ${warnings.length} warning(s) — ` +
      (errors.length ? 'FAILED' : 'OK'),
  );
  return errors.length ? 1 : 0;
}

function cmdModel(flags) {
  const { model, errors } = buildModel(overridesFrom(flags));
  const json = JSON.stringify(model, null, 2);

  if (flags.out) {
    const target = path.resolve(ROOT, typeof flags.out === 'string' ? flags.out : 'out/model.json');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `${json}\n`, 'utf8');
    console.log(`wrote ${path.relative(ROOT, target)}`);
  } else {
    console.log(json);
  }

  if (errors.length) {
    console.error(`\n${errors.length} error(s) — run "npm run validate" for details`);
    return 1;
  }
  return 0;
}

const { command, flags } = parseArgs(process.argv.slice(2));

if (!COMMANDS.includes(command)) {
  console.error(`usage: node src/build.js <${COMMANDS.join('|')}> [options]`);
  process.exit(2);
}

try {
  process.exit(command === 'validate' ? cmdValidate(flags) : cmdModel(flags));
} catch (err) {
  console.error(`\n  FATAL  ${err.message}`);
  process.exit(1);
}
