'use strict';

const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);

// macOS ships ImageIO-based `sips`, which decodes HEIC natively and very fast.
// It is used as the primary decoder on Apple machines.
const SIPS_PATH = '/usr/bin/sips';

let cachedDecoder = null;

function getHeicDecode() {
  if (!cachedDecoder) {
    // heic-decode bundles libheif as WebAssembly, so this works on every platform.
    cachedDecoder = require('heic-decode');
  }
  return cachedDecoder;
}

function createTempPngPath() {
  const id = crypto.randomBytes(6).toString('hex');
  return path.join(os.tmpdir(), `heic-konverter-${process.pid}-${Date.now()}-${id}.png`);
}

async function decodeWithSips(inputPath) {
  const pngPath = createTempPngPath();
  try {
    await execFileAsync(
      SIPS_PATH,
      ['-s', 'format', 'png', inputPath, '--out', pngPath],
      { timeout: 120000, maxBuffer: 4 * 1024 * 1024 }
    );
    const stat = await fs.stat(pngPath);
    if (!stat.size) throw new Error('sips hat keine Bilddaten erzeugt.');
    return { input: pngPath, raw: null, cleanup: true };
  } catch (error) {
    await fs.rm(pngPath, { force: true }).catch(() => {});
    throw error;
  }
}

async function decodeWithLibheif(inputPath) {
  const buffer = await fs.readFile(inputPath);
  const decode = getHeicDecode();
  const result = await decode({ buffer });
  const { width, height, data } = result || {};

  if (!width || !height || !data || !data.length) {
    throw new Error('Die Datei enthält keine lesbaren HEIC-Bilddaten.');
  }

  const channels = Math.round(data.length / (width * height));
  if (channels !== 3 && channels !== 4) {
    throw new Error('Unerwartetes Pixelformat beim Dekodieren.');
  }

  return {
    input: Buffer.from(data.buffer, data.byteOffset, data.byteLength),
    raw: { width, height, channels },
    cleanup: false
  };
}

/**
 * Decode a HEIC/HEIF file into something sharp can read.
 * Returns { input: path|Buffer, raw: {width,height,channels}|null, cleanup }.
 */
async function decodeHeic(inputPath, { preferSips = true } = {}) {
  if (preferSips && process.platform === 'darwin') {
    try {
      return await decodeWithSips(inputPath);
    } catch {
      // Fall through to the portable decoder (e.g. unusual HEIF variants).
    }
  }
  return decodeWithLibheif(inputPath);
}

module.exports = { decodeHeic };
