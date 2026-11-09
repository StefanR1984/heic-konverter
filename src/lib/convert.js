'use strict';

const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const { decodeHeic } = require('./heic');

const FORMATS = {
  jpeg: { extension: '.jpg', lossy: true, label: 'JPG' },
  png: { extension: '.png', lossy: false, label: 'PNG' },
  webp: { extension: '.webp', lossy: true, label: 'WebP' },
  avif: { extension: '.avif', lossy: true, label: 'AVIF' },
  tiff: { extension: '.tiff', lossy: false, label: 'TIFF' }
};

const DEFAULT_QUALITY = 85;

function normalizeOptions(options = {}) {
  const format = Object.prototype.hasOwnProperty.call(FORMATS, options.format)
    ? options.format
    : 'jpeg';

  const rawQuality = Number(options.quality);
  const quality = Number.isFinite(rawQuality)
    ? Math.min(100, Math.max(1, Math.round(rawQuality)))
    : DEFAULT_QUALITY;

  const rawMaxSize = Number(options.maxSize);
  const maxSize = Number.isFinite(rawMaxSize) && rawMaxSize > 0 ? Math.round(rawMaxSize) : 0;

  const outputDir = typeof options.outputDir === 'string' && options.outputDir.trim().length > 0
    ? path.resolve(options.outputDir)
    : null;

  return { format, quality, maxSize, outputDir };
}

async function uniqueOutputPath(dir, baseName, extension) {
  let candidate = path.join(dir, `${baseName}${extension}`);
  let counter = 1;

  while (fsSync.existsSync(candidate)) {
    candidate = path.join(dir, `${baseName} (${counter})${extension}`);
    counter += 1;
    if (counter > 9999) throw new Error('Zu viele Dateien mit demselben Namen.');
  }

  return candidate;
}

function applyFormat(pipeline, { format, quality }) {
  switch (format) {
    case 'jpeg':
      return pipeline
        .flatten({ background: '#ffffff' })
        .jpeg({ quality, mozjpeg: true });
    case 'png':
      return pipeline.png({ compressionLevel: 9, adaptiveFiltering: true });
    case 'webp':
      return pipeline.webp({ quality, effort: 4 });
    case 'avif':
      return pipeline.avif({ quality, effort: 4 });
    case 'tiff':
      return pipeline.tiff({ compression: 'lzw' });
    default:
      throw new Error(`Unbekanntes Zielformat: ${format}`);
  }
}

/**
 * Convert a single HEIC/HEIF file.
 * @param {{path: string}} file
 * @param {{format?: string, quality?: number, maxSize?: number, outputDir?: string|null}} options
 */
async function convertFile(file, options = {}) {
  const inputPath = file && typeof file === 'object' ? file.path : file;
  if (typeof inputPath !== 'string' || inputPath.length === 0) {
    throw new Error('Ungültiger Dateipfad.');
  }

  const opts = normalizeOptions(options);
  const formatInfo = FORMATS[opts.format];

  const outputDir = opts.outputDir || path.dirname(inputPath);
  await fs.mkdir(outputDir, { recursive: true });

  const baseName = path.basename(inputPath, path.extname(inputPath));
  const outputPath = await uniqueOutputPath(outputDir, baseName, formatInfo.extension);

  let decoded = null;
  try {
    decoded = await decodeHeic(inputPath);

    let pipeline = sharp(decoded.input, {
      ...(decoded.raw ? { raw: decoded.raw } : {}),
      limitInputPixels: false,
      failOn: 'none'
    });

    if (opts.maxSize) {
      pipeline = pipeline.resize({
        width: opts.maxSize,
        height: opts.maxSize,
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    pipeline = applyFormat(pipeline, opts);
    const info = await pipeline.toFile(outputPath);

    return {
      output: outputPath,
      width: info.width,
      height: info.height,
      size: info.size
    };
  } catch (error) {
    await fs.rm(outputPath, { force: true }).catch(() => {});
    throw error;
  } finally {
    if (decoded && decoded.cleanup) {
      await fs.rm(decoded.input, { force: true }).catch(() => {});
    }
  }
}

module.exports = { convertFile, FORMATS, normalizeOptions };
