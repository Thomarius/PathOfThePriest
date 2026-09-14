#!/usr/bin/env node
/**
 * CLI entry point.
 *
 *   node src/build.js validate [--theme x] [--locale de] [--profile mpc]
 *   node src/build.js model    [--out out/model.json]
 *   node src/build.js preview  [--out out/preview/index.html]
 *   node src/build.js build    [--out out/cards] [--no-pdf]
 */

import fs from 'node:fs';
import path from 'node:path';
import { buildModel, applyStress, ROOT } from './model.js';
import { validate } from './validate.js';
import { renderPreview } from './template/page.js';

const COMMANDS = ['validate', 'model', 'preview', 'build'];

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

async function cmdValidate(flags) {
  const { errors, warnings, model } = validate(overridesFrom(flags));

  // --deep adds the checks that need live layout: overflow and safe zone.
  // `build` always runs them, against the page it is about to print.
  if (flags.deep && model && errors.length === 0) {
    const { sources } = buildModel(overridesFrom(flags));
    const { auditModel } = await import('./audit.js');
    const audit = await auditModel(model, { themeName: sources.themeName });
    errors.push(...audit.errors);
    warnings.push(...audit.warnings);
  }

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

function cmdPreview(flags) {
  const { model, errors, sources } = buildModel(overridesFrom(flags));
  if (errors.length) {
    console.error(`${errors.length} error(s) — run "npm run validate" for details`);
    return 1;
  }

  if (flags.stress) {
    applyStress(model, Number(flags.stress) || 1.3);
  }

  const html = renderPreview(model, { themeName: sources.themeName });
  const target = path.resolve(
    ROOT,
    typeof flags.out === 'string' ? flags.out : 'out/preview/index.html',
  );
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, html, 'utf8');

  console.log(`wrote ${path.relative(ROOT, target)} (${model.cards.length} cards)`);
  return 0;
}

async function cmdBuild(flags) {
  // Refuse to render a deck that does not validate — a printed error is
  // expensive, a failed build is free.
  const { errors, warnings, model } = validate(overridesFrom(flags));
  if (errors.length) {
    for (const e of errors) console.log(`  ERROR  ${e}`);
    console.log(`\n  ${errors.length} error(s) — not rendering`);
    return 1;
  }
  for (const w of warnings) console.log(`  warn   ${w}`);

  const { sources } = buildModel(overridesFrom(flags));
  const { renderAll } = await import('./render.js');

  const result = await renderAll(model, {
    themeName: sources.themeName,
    outDir: typeof flags.out === 'string' ? flags.out : undefined,
    pdf: !flags['no-pdf'],
    proof: !flags['no-proof'],
    audit: !flags['no-audit'],
  });

  for (const w of result.audit.warnings) console.log(`  warn   ${w}`);
  for (const e of result.audit.errors) console.log(`  ERROR  ${e}`);

  if (result.audit.errors.length) {
    console.log(`\n  ${result.audit.errors.length} layout error(s) — nothing written`);
    return 1;
  }

  console.log(`\n  ${result.written.length} cards -> ${path.relative(ROOT, result.outDir)}`);
  if (result.pdfFile) console.log(`  pdf   -> ${path.relative(ROOT, result.pdfFile)}`);
  if (result.proofFile) console.log(`  proof -> ${path.relative(ROOT, result.proofFile)}`);
  return 0;
}

const COMMAND_FNS = {
  validate: cmdValidate,
  model: cmdModel,
  preview: cmdPreview,
  build: cmdBuild,
};

const { command, flags } = parseArgs(process.argv.slice(2));

if (!COMMANDS.includes(command)) {
  console.error(`usage: node src/build.js <${COMMANDS.join('|')}> [options]`);
  process.exit(2);
}

try {
  process.exit(await COMMAND_FNS[command](flags));
} catch (err) {
  console.error(`\n  FATAL  ${err.message}`);
  process.exit(1);
}
