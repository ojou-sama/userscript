#!/usr/bin/env node

// Requires esbuild installed globally: npm install -g esbuild
// Requires a configuration file (userscript.config.js)
// Usage:
//   node build.js              production build
//   node build.js --watch      dev mode

import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync, watch } from 'fs';
import { execSync } from 'child_process';
import { createServer } from 'http';
import { join, dirname, basename } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { createHash } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEV       = process.argv.includes('--watch');
const PORT      = 4532;

// config

let config;
try {
  config = (await import(pathToFileURL(join(__dirname, 'userscript.config.js')).href)).default;
} catch {
  console.error('[kit] ERROR: Could not load userscript.config.js');
  process.exit(1);
}

const { entry, output, meta, devMode = {} } = config;
const HMR_MODE  = devMode.hmr ?? 'websocket'; // 'websocket' | 'polling'
const RELOAD_ALL = devMode.reloadAll ?? true;

// create header

function makeHeader(extra = {}) {
  const matches = (Array.isArray(meta.match) ? meta.match : [meta.match])
    .map(m => `// @match       ${m}`).join('\n');
  const grants = (meta.grant ?? [])
    .map(g => `// @grant       ${g}`).join('\n');
  const connects = (meta.connect ?? [])
    .map(c => `// @connect     ${c}`).join('\n');
  const includes = (meta.include ?? [])
    .map(i => `// @include      ${i}`).join('\n');

  return [
    '// ==UserScript==',
    `// @name        ${meta.name}${extra.nameSuffix ?? ''}`,
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

// HMR stuff

const WS_SNIPPET = `
;(function devReload() {
  var ws = new WebSocket('ws://localhost:${PORT}');
  ws.onmessage = function(e) { if (e.data === 'reload') location.reload(); };
  ws.onclose   = function()  { setTimeout(devReload, 2000); };
})();`.trimStart();

const POLL_SNIPPET = `
;(function devPoll() {
  var last = null;
  setInterval(function() {
    fetch('http://localhost:${PORT}/ping')
      .then(function(r) { return r.text(); })
      .then(function(h) { if (last && h !== last) location.reload(); last = h; })
      .catch(function() {});
  }, 1000);
})();`.trimStart();

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

  if (DEV) {
    // bundle + HMR snippet 
    const hmrSnippet = HMR_MODE === 'polling' ? POLL_SNIPPET : WS_SNIPPET;
    const devBundle  = makeHeader() + '\n\n' + bundled + '\n\n' + hmrSnippet;
    writeFileSync(output, devBundle, 'utf-8');
  } else {
    // production
    writeFileSync(output, makeHeader() + '\n\n' + bundled, 'utf-8');
  }

  // cleanup tmp
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
console.log(`[kit] Dev server @ http://localhost:${PORT}`);
// console.log(`[kit] Be sure to enable "Track external edits."\n`);

// websocket clients
const wsClients  = new Set();
let   lastClient = null;

// websocket frame encoder for short text messages
function wsFrame(msg) {
  const payload = Buffer.from(msg);
  const frame   = Buffer.alloc(2 + payload.length);
  frame[0] = 0x81;            // FIN + opcode 1 (text)
  frame[1] = payload.length;  // no masking, length < 126
  payload.copy(frame, 2);
  return frame;
}

// websocket handshake
function wsHandshake(socket, key) {
  const accept = createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
    .digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
  );
}

function sendReload() {
  const frame   = wsFrame('reload');
  const targets = RELOAD_ALL ? [...wsClients] : (lastClient ? [lastClient] : []);
  for (const sock of targets) {
    try { sock.write(frame); } catch (_) { wsClients.delete(sock); }
  }
}

// HTTP server (serves dist files + /ping endpoint)
const server = createServer((req, res) => {
  // CSP polling fallback
  if (req.url === '/ping') {
    res.writeHead(200, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
    res.end(buildHash);
    return;
  }

  const outDir   = dirname(output);
  const filename = req.url === '/' ? basename(output) : req.url.slice(1);
  const filepath = join(outDir, filename);

  try {
    const content = readFileSync(filepath, 'utf-8');
    res.writeHead(200, {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});

// websocket upgrade on the same port
server.on('upgrade', (req, socket) => {
  const key = req.headers['sec-websocket-key'];
  if (!key) { socket.destroy(); return; }

  wsHandshake(socket, key);
  wsClients.add(socket);
  lastClient = socket;

  socket.on('close', () => { wsClients.delete(socket); });
  socket.on('error', () => { wsClients.delete(socket); });
});

server.listen(PORT);

// file watcher with debounce
let rebuildTimer;
watch(dirname(entry), { recursive: true }, (_, filename) => {
  if (!filename?.endsWith('.js')) return;
  clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => {
    const ok = build();
    if (ok) {
      process.stdout.write(`[kit] Rebuilt (${filename})`);
      sendReload();
      console.log(`... reload sent (hash: ${buildHash})`);
    }
  }, 50);
});
