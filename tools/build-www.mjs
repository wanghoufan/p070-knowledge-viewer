#!/usr/bin/env node
/**
 * P070 build: app/ (business UI source) -> www/ (Capacitor web assets).
 *
 * app/ stays the single source of truth for the approved UI. www/ is a generated
 * APK asset directory: it drops the PWA-only pieces (service worker, web manifest,
 * node test scripts) and keeps everything the APK needs.
 *
 * Safety: never deletes anything unless the target is exactly <root>/www and is
 * either empty or carries our OWNER marker file.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'app');
const out = path.join(root, 'www');
const OWNER = 'p070-generated-web-assets';

const EXCLUDE = new Set(['sw.js', 'manifest.webmanifest', 'tests']);

function fail(msg) {
  console.error('[build-www] ' + msg);
  process.exit(1);
}

if (!fs.existsSync(path.join(src, 'index.html'))) fail('app/index.html not found; refusing to build');
if (path.dirname(out) !== root) fail('output directory escaped the project root');

if (fs.existsSync(out)) {
  const entries = fs.readdirSync(out);
  const marker = path.join(out, '.p070-generated');
  if (entries.length && !fs.existsSync(marker)) {
    fail('existing www/ has no owner marker; refusing to delete it');
  }
  fs.rmSync(out, { recursive: true, force: true });
}

fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, '.p070-generated'), OWNER + '\n');

function copyDir(from, to) {
  for (const ent of fs.readdirSync(from, { withFileTypes: true })) {
    if (EXCLUDE.has(ent.name)) continue;
    const a = path.join(from, ent.name);
    const b = path.join(to, ent.name);
    if (ent.isDirectory()) {
      fs.mkdirSync(b, { recursive: true });
      copyDir(a, b);
    } else if (ent.isFile()) {
      fs.copyFileSync(a, b);
    } else {
      fail('unexpected file type: ' + a);
    }
  }
}
copyDir(src, out);

// index.html: the PWA manifest is not part of the APK contract.
const indexPath = path.join(out, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
html = html.replace(/<link rel="manifest"[^>]*>\s*/i, '');
fs.writeFileSync(indexPath, html);

// Drop any leftover PWA-only asset reference and verify the required files exist.
for (const must of ['index.html', 'app.js', 'db.js', 'platform.js', 'styles.css', 'i18n.js', 'slides.js']) {
  if (!fs.existsSync(path.join(out, must))) fail('missing required web asset: ' + must);
}
if (/rel="manifest"/i.test(fs.readFileSync(indexPath, 'utf8'))) fail('manifest link still present');

const bytes = (function size(dir) {
  let n = 0;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    n += ent.isDirectory() ? size(p) : fs.statSync(p).size;
  }
  return n;
})(out);

console.log('[build-www] OK -> ' + out + ' (' + (bytes / 1024).toFixed(1) + ' KB)');
