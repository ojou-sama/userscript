#!/usr/bin/env node

// Requires esbuild installed globally: npm install -g esbuild
// Requires a configuration file (userscript.config.js)
// Usage:
//   node build.js              production build
//   node build.js --watch      dev mode

import { createHash } from 'crypto';
import { readFileSync, writeFileSync, mkdirSync, unlinkSync, watch } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEV       = process.argv.includes('--watch');

// config

let config;
try {
  config = (await import(pathToFileURL(join(__dirname, 'userscript.config.js')).href)).default;
} catch {
  console.error('[kit] ERROR: Could not load userscript.config.js');
  process.exit(1);
}

const { entry, output, meta } = config;

// create header

function makeHeader() {
  const matches  = (Array.isArray(meta.match) ? meta.match : [meta.match]).map(m => `// @match       ${m}`).join('\n');
  const grants   = (meta.grant   ?? []).map(g => `// @grant       ${g}`).join('\n');
  const connects = (meta.connect ?? []).map(c => `// @connect     ${c}`).join('\n');
  const includes = (meta.include ?? []).map(i => `// @include     ${i}`).join('\n');

  return [
    '// ==UserScript==',
    `// @name        ${meta.name}`,
    meta.namespace   ? `// @namespace   ${meta.namespace}`   : null,
    meta.version     ? `// @version     ${meta.version}`     : null,
    meta.author      ? `// @author      ${meta.author}`      : null,
    meta.description ? `// @description ${meta.description}` : null,
    meta.icon        ? `// @icon        ${meta.icon}`        : null,
    meta.downloadURL ? `// @downloadURL ${meta.downloadURL}` : null,
    meta.updateURL   ? `// @updateURL   ${meta.updateURL}`   : null,
    meta.supportURL  ? `// @supportURL  ${meta.supportURL}`  : null,
    meta.homepageURL ? `// @homepageURL ${meta.homepageURL}` : null,
    meta.runAt       ? `// @run-at      ${meta.runAt}`       : null,
    meta.license     ? `// @license     ${meta.license}`     : null,
    matches,
    grants,
    connects,
    includes,
    '// ==/UserScript==',
  ].filter(Boolean).join('\n');
}

// call esbuild

const TMP = output + '.__tmp__.js';

function runEsbuild() {
  const devFlag = DEV ? '--define:__DEV__=true' : '--define:__DEV__=false';
  try {
    execSync(
      `esbuild "${entry}" --bundle --format=iife --platform=browser ${devFlag} --outfile="${TMP}"`,
      { stdio: 'pipe' }
    );
    return true;
  } catch (e) {
    console.error('[kit] esbuild error:\n' + (e.stderr?.toString() ?? e.message));
    return false;
  }
}

// build
let buildHash = '';

function build() {
  mkdirSync(dirname(output), { recursive: true });

  if (!runEsbuild()) return false;

  const bundled = readFileSync(TMP, 'utf-8');
  writeFileSync(output, makeHeader() + '\n\n' + bundled, 'utf-8');

  try { unlinkSync(TMP); } catch (_) {}

  buildHash = createHash('md5').update(bundled).digest('hex').slice(0, 8);
  return true;
}

// production build

if (!DEV) {
  const ok = build();
  console.log(ok ? `[kit] Built: ${output}` : '[kit] Build failed.');
  process.exit(ok ? 0 : 1);
}

// dev mode

build();
console.log(`[kit] Watching ${dirname(entry)}`);

let rebuildTimer;
watch(dirname(entry), { recursive: true }, (_, filename) => {
  if (!filename?.endsWith('.js')) return;
  clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => {
    const ok = build();
    if (ok) {
      process.stdout.write(`[kit] Rebuilt (${filename})`);
      console.log(`... (hash: ${buildHash})`);
    }
  }, 50);
});