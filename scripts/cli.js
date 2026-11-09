#!/usr/bin/env node
'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { convertFile, FORMATS } = require('../src/lib/convert');

const HEIC_EXTENSIONS = new Set(['.heic', '.heif', '.hif']);

const FORMAT_ALIASES = {
  jpg: 'jpeg',
  jpeg: 'jpeg',
  png: 'png',
  webp: 'webp',
  avif: 'avif',
  tif: 'tiff',
  tiff: 'tiff'
};

function usage() {
  console.log(`
HEIC Konverter (CLI)

Aufruf:
  node scripts/cli.js <datei-oder-ordner> [...] [optionen]

Optionen:
  --format <jpg|png|webp|avif|tiff>   Zielformat (Standard: jpg)
  --quality <1-100>                   Qualität für JPG/WebP/AVIF (Standard: 85)
  --max-size <pixel>                  Längste Kante begrenzen, 0 = Original (Standard: 0)
  --out <ordner>                      Zielordner (Standard: neben dem Original)
  --help                              Diese Hilfe anzeigen
`);
}

function parseArgs(argv) {
  const options = {
    format: 'jpeg',
    quality: 85,
    maxSize: 0,
    outputDir: null
  };
  const inputs = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      usage();
      process.exit(0);
    }

    if (arg === '--format') {
      const value = String(argv[index + 1] || '').toLowerCase();
      if (!FORMAT_ALIASES[value]) throw new Error(`Unbekanntes Format: ${value}`);
      options.format = FORMAT_ALIASES[value];
      index += 1;
      continue;
    }

    if (arg === '--quality') {
      options.quality = Number(argv[index + 1]);
      index += 1;
      continue;
    }

    if (arg === '--max-size') {
      options.maxSize = Number(argv[index + 1]);
      index += 1;
      continue;
    }

    if (arg === '--out') {
      options.outputDir = path.resolve(String(argv[index + 1] || ''));
      index += 1;
      continue;
    }

    inputs.push(arg);
  }

  if (!FORMATS[options.format]) throw new Error(`Unbekanntes Format: ${options.format}`);
  if (!Number.isFinite(options.quality) || options.quality < 1 || options.quality > 100) {
    throw new Error('--quality muss zwischen 1 und 100 liegen.');
  }
  if (!Number.isFinite(options.maxSize) || options.maxSize < 0) {
    throw new Error('--max-size muss 0 oder größer sein.');
  }

  return { inputs, options };
}

async function collect(inputs) {
  const files = [];

  async function walk(target) {
    let stat;
    try {
      stat = await fs.stat(target);
    } catch {
      return;
    }

    if (stat.isDirectory()) {
      const entries = await fs.readdir(target, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        await walk(path.join(target, entry.name));
      }
      return;
    }

    if (stat.isFile() && HEIC_EXTENSIONS.has(path.extname(target).toLowerCase())) {
      files.push(path.resolve(target));
    }
  }

  for (const input of inputs) await walk(path.resolve(input));
  return files.sort((a, b) => a.localeCompare(b, 'de', { numeric: true, sensitivity: 'base' }));
}

(async () => {
  let parsed;
  try {
    parsed = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`Fehler: ${error.message}`);
    usage();
    process.exit(1);
  }

  if (parsed.inputs.length === 0) {
    usage();
    process.exit(1);
  }

  const files = await collect(parsed.inputs);
  if (files.length === 0) {
    console.error('Keine HEIC-/HEIF-Dateien gefunden.');
    process.exit(1);
  }

  let failures = 0;

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const label = `[${index + 1}/${files.length}] ${path.basename(file)}`;
    process.stdout.write(`${label} … `);

    try {
      const result = await convertFile({ path: file }, parsed.options);
      console.log(`→ ${path.basename(result.output)} (${result.width}×${result.height})`);
    } catch (error) {
      failures += 1;
      console.log('FEHLER');
      console.error(`  ${error && error.message ? error.message : error}`);
    }
  }

  if (failures > 0) {
    console.error(`\n${failures} von ${files.length} Datei(en) fehlgeschlagen.`);
    process.exit(1);
  }

  console.log(`\nFertig: ${files.length} Datei(en) konvertiert.`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
