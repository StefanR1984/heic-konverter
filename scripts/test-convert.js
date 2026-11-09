'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const { convertFile, FORMATS } = require('../src/lib/convert');

const root = path.join(__dirname, '..');
const outputDir = path.join(root, 'test-output');

async function main() {
  const sample = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, 'samples', 'example.heic');

  try {
    await fs.access(sample);
  } catch {
    console.error(`Testdatei nicht gefunden: ${sample}`);
    console.error('Aufruf: node scripts/test-convert.js [pfad/zur/datei.heic]');
    process.exit(1);
  }

  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });

  const rows = [];

  for (const format of Object.keys(FORMATS)) {
    const started = Date.now();
    try {
      const result = await convertFile({ path: sample }, { format, quality: 82, outputDir });
      const metadata = await sharp(result.output).metadata();
      const stat = await fs.stat(result.output);
      rows.push({
        Format: FORMATS[format].label,
        Datei: path.basename(result.output),
        Größe: `${(stat.size / 1024).toFixed(0)} KB`,
        Auflösung: `${metadata.width}×${metadata.height}`,
        Typ: metadata.format,
        Dauer: `${Date.now() - started} ms`,
        Status: 'OK'
      });
    } catch (error) {
      rows.push({
        Format: FORMATS[format].label,
        Datei: '-',
        Größe: '-',
        Auflösung: '-',
        Typ: '-',
        Dauer: `${Date.now() - started} ms`,
        Status: `FEHLER: ${error && error.message ? error.message : error}`
      });
    }
  }

  console.table(rows);

  const failed = rows.filter((row) => row.Status !== 'OK');
  if (failed.length > 0) {
    console.error(`${failed.length} Format(e) fehlgeschlagen.`);
    process.exit(1);
  }

  console.log(`Alle Formate erfolgreich. Ausgabe: ${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
