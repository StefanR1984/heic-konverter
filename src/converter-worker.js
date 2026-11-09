'use strict';

const { parentPort, workerData } = require('node:worker_threads');
const { convertFile } = require('./lib/convert');

const files = Array.isArray(workerData?.files) ? workerData.files : [];
const options = workerData?.options || {};

let cancelled = false;

parentPort.on('message', (message) => {
  if (message && message.type === 'cancel') cancelled = true;
});

function describeError(error) {
  if (!error) return 'Unbekannter Fehler';
  if (typeof error === 'string') return error;
  return error.message || String(error);
}

(async () => {
  const results = [];

  for (let index = 0; index < files.length; index += 1) {
    if (cancelled) break;

    const file = files[index];

    parentPort.postMessage({
      type: 'progress',
      phase: 'start',
      index,
      total: files.length,
      file: file.name
    });

    try {
      const result = await convertFile(file, options);
      results.push({ input: file.path, output: result.output, ok: true });
      parentPort.postMessage({
        type: 'progress',
        phase: 'done',
        index,
        total: files.length,
        file: file.name,
        ok: true,
        output: result.output
      });
    } catch (error) {
      const message = describeError(error);
      results.push({ input: file.path, ok: false, error: message });
      parentPort.postMessage({
        type: 'progress',
        phase: 'done',
        index,
        total: files.length,
        file: file.name,
        ok: false,
        error: message
      });
    }
  }

  parentPort.postMessage({ type: 'done', cancelled, results });
})().catch((error) => {
  parentPort.postMessage({ type: 'fatal', error: describeError(error) });
});
