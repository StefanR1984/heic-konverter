'use strict';

const bridge = window.api;

const ICONS = {
  folder:
    '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5A1.5 1.5 0 0 1 4.5 6H9l2 2.5h8.5A1.5 1.5 0 0 1 21 10v7.5A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z"></path></svg>',
  close:
    '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"></path></svg>'
};

const FORMAT_LABELS = {
  jpeg: 'JPG',
  png: 'PNG',
  webp: 'WebP',
  avif: 'AVIF',
  tiff: 'TIFF'
};

const els = {
  dropzone: document.getElementById('dropzone'),
  fileSection: document.getElementById('fileSection'),
  fileList: document.getElementById('fileList'),
  filesTitle: document.getElementById('filesTitle'),
  filesSize: document.getElementById('filesSize'),
  clearBtn: document.getElementById('clearBtn'),
  addMore: document.getElementById('addMore'),
  pickFiles: document.getElementById('pickFiles'),
  pickFolder: document.getElementById('pickFolder'),
  formatGroup: document.getElementById('formatGroup'),
  quality: document.getElementById('quality'),
  qualityValue: document.getElementById('qualityValue'),
  qualityOpt: document.getElementById('qualityOpt'),
  maxSize: document.getElementById('maxSize'),
  outSame: document.getElementById('outSame'),
  outPick: document.getElementById('outPick'),
  outputPath: document.getElementById('outputPath'),
  summary: document.getElementById('summary'),
  convertBtn: document.getElementById('convertBtn'),
  options: document.getElementById('options'),
  actionbar: document.getElementById('actionbar'),
  progressPanel: document.getElementById('progressPanel'),
  progressBar: document.getElementById('progressBar'),
  progressLabel: document.getElementById('progressLabel'),
  progressCount: document.getElementById('progressCount'),
  cancelBtn: document.getElementById('cancelBtn'),
  banner: document.getElementById('banner'),
  bannerIcon: document.getElementById('bannerIcon'),
  bannerTitle: document.getElementById('bannerTitle'),
  bannerSub: document.getElementById('bannerSub'),
  revealBtn: document.getElementById('revealBtn'),
  dropOverlay: document.getElementById('dropOverlay')
};

const state = {
  files: [],
  outputDir: null,
  format: 'jpeg',
  converting: false,
  lastOutput: null
};

document.documentElement.dataset.platform = bridge.platform || 'unknown';

const REVEAL_LABEL = bridge.platform === 'darwin' ? 'Im Finder zeigen' : 'Im Explorer zeigen';

/* ---------- Formatting helpers ---------- */

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** index;
  const digits = value >= 100 || index === 0 ? 0 : 1;
  return `${value.toLocaleString('de-DE', { maximumFractionDigits: digits })} ${units[index]}`;
}

function shortenPath(target) {
  if (!target) return '';
  const home = bridge.home;
  if (home && target.toLowerCase().startsWith(home.toLowerCase())) {
    return `~${target.slice(home.length)}`;
  }
  return target;
}

function fileExtensionLabel(name) {
  const dot = name.lastIndexOf('.');
  if (dot === -1) return 'HEIC';
  return name.slice(dot + 1).toUpperCase();
}

/* ---------- Rendering ---------- */

function render() {
  const count = state.files.length;
  const totalBytes = state.files.reduce((sum, file) => sum + (file.size || 0), 0);

  els.dropzone.hidden = count > 0;
  els.fileSection.hidden = count === 0;

  els.filesTitle.textContent = count === 1 ? '1 Datei' : `${count} Dateien`;
  els.filesSize.textContent = `${formatBytes(totalBytes)} gesamt`;
  els.summary.textContent = count === 0
    ? 'Noch keine Dateien ausgewählt'
    : `${count === 1 ? '1 Datei' : `${count} Dateien`} · ${formatBytes(totalBytes)}`;

  els.clearBtn.hidden = count === 0 || state.converting;
  els.addMore.disabled = state.converting;
  els.convertBtn.disabled = count === 0 || state.converting;

  syncQuality();
}

function renderList() {
  els.fileList.replaceChildren();
  const fragment = document.createDocumentFragment();
  state.files.forEach((file, index) => fragment.appendChild(buildRow(file, index)));
  els.fileList.appendChild(fragment);
}

function buildRow(file, index) {
  const row = document.createElement('li');
  row.className = 'file-row';
  row.dataset.index = String(index);

  const icon = document.createElement('span');
  icon.className = 'file-icon';
  icon.textContent = fileExtensionLabel(file.name);

  const meta = document.createElement('div');
  meta.className = 'file-meta';

  const name = document.createElement('span');
  name.className = 'file-name';
  name.textContent = file.name;
  name.title = file.path;

  const sub = document.createElement('span');
  sub.className = 'file-sub';
  sub.textContent = `${formatBytes(file.size)} · ${shortenPath(file.dir)}`;
  sub.title = file.dir;

  meta.append(name, sub);

  const badge = document.createElement('span');
  badge.className = 'badge';
  badge.textContent = 'Wartet';

  const actions = document.createElement('div');
  actions.className = 'file-actions';

  const reveal = document.createElement('button');
  reveal.type = 'button';
  reveal.className = 'icon-btn';
  reveal.title = REVEAL_LABEL;
  reveal.setAttribute('aria-label', REVEAL_LABEL);
  reveal.innerHTML = ICONS.folder;
  reveal.hidden = true;
  reveal.addEventListener('click', () => {
    if (file.output) bridge.reveal(file.output);
  });

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'icon-btn';
  remove.title = 'Entfernen';
  remove.setAttribute('aria-label', 'Entfernen');
  remove.innerHTML = ICONS.close;
  remove.addEventListener('click', () => removeFile(index));

  actions.append(reveal, remove);
  row.append(icon, meta, badge, actions);

  if (file.status === 'done') {
    badge.className = 'badge badge-done';
    badge.textContent = 'Fertig';
    reveal.hidden = false;
  } else if (file.status === 'error') {
    badge.className = 'badge badge-error';
    badge.textContent = 'Fehler';
    row.title = file.error || '';
  }

  return row;
}

function updateRow(index, status, payload = {}) {
  const row = els.fileList.querySelector(`[data-index="${index}"]`);
  if (!row) return;

  const badge = row.querySelector('.badge');
  const reveal = row.querySelector('.file-actions .icon-btn');

  if (status === 'working') {
    badge.className = 'badge badge-working';
    badge.textContent = 'Läuft …';
  } else if (status === 'done') {
    badge.className = 'badge badge-done';
    badge.textContent = 'Fertig';
    if (reveal) reveal.hidden = false;
  } else if (status === 'error') {
    badge.className = 'badge badge-error';
    badge.textContent = 'Fehler';
    row.title = payload.error || 'Konvertierung fehlgeschlagen';
  } else {
    badge.className = 'badge';
    badge.textContent = 'Wartet';
  }
}

/* ---------- Files ---------- */

function addFiles(incoming) {
  if (!Array.isArray(incoming) || incoming.length === 0) return;

  const known = new Set(state.files.map((file) => file.path));
  let added = 0;

  for (const file of incoming) {
    if (!file || typeof file.path !== 'string' || known.has(file.path)) continue;
    known.add(file.path);
    state.files.push({
      path: file.path,
      name: file.name || file.path.split(/[\\/]/).pop(),
      dir: file.dir || '',
      size: Number(file.size) || 0,
      status: 'idle',
      output: null,
      error: null
    });
    added += 1;
  }

  if (added === 0) return;

  hideBanner();
  renderList();
  render();
}

function removeFile(index) {
  if (state.converting) return;
  if (index < 0 || index >= state.files.length) return;
  state.files.splice(index, 1);
  hideBanner();
  renderList();
  render();
}

function clearFiles() {
  if (state.converting) return;
  state.files = [];
  hideBanner();
  renderList();
  render();
}

async function pickFiles() {
  if (state.converting) return;
  const files = await bridge.pickFiles();
  addFiles(files);
}

async function pickFolder() {
  if (state.converting) return;
  const files = await bridge.pickFolder();
  addFiles(files);
}

/* ---------- Options ---------- */

function isLossy(format) {
  return format !== 'png' && format !== 'tiff';
}

function updateSliderFill() {
  const min = Number(els.quality.min) || 0;
  const max = Number(els.quality.max) || 100;
  const value = Number(els.quality.value);
  const percent = max > min ? ((value - min) / (max - min)) * 100 : 100;
  els.quality.style.setProperty('--fill', `${percent}%`);
}

function syncQuality() {
  const lossy = isLossy(state.format);
  els.quality.disabled = !lossy || state.converting;
  els.qualityOpt.classList.toggle('is-disabled', !lossy);
  els.qualityValue.textContent = lossy ? String(els.quality.value) : 'verlustfrei';
}

function setFormat(format) {
  if (!FORMAT_LABELS[format]) return;
  state.format = format;
  for (const button of els.formatGroup.querySelectorAll('.seg')) {
    button.classList.toggle('is-active', button.dataset.format === format);
  }
  syncQuality();
}

/* ---------- Banner ---------- */

function showBanner(kind, title, sub, { reveal = false } = {}) {
  els.banner.dataset.kind = kind;
  els.bannerIcon.textContent = kind === 'error' ? '!' : kind === 'success' ? '✓' : 'i';
  els.bannerTitle.textContent = title;
  els.bannerSub.textContent = sub || '';
  els.revealBtn.hidden = !reveal;
  els.banner.hidden = false;
}

function hideBanner() {
  els.banner.hidden = true;
  state.lastOutput = null;
}

/* ---------- Conversion ---------- */

function setBusy(busy) {
  els.options.classList.toggle('is-busy', busy);
  els.actionbar.hidden = busy;
  els.progressPanel.hidden = !busy;
  els.progressBar.parentElement.classList.toggle('is-running', busy);
  els.cancelBtn.disabled = false;
  els.cancelBtn.textContent = 'Abbrechen';

  if (busy) {
    els.progressBar.style.width = '0%';
    els.progressCount.textContent = `0 von ${state.files.length}`;
    els.progressLabel.textContent = 'Konvertierung wird vorbereitet …';
  } else {
    els.progressBar.style.width = '0%';
  }

  render();
}

function updateProgress(done, total, label) {
  const percent = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  els.progressBar.style.width = `${percent}%`;
  els.progressCount.textContent = `${done} von ${total}`;
  if (label) els.progressLabel.textContent = label;
}

async function startConversion() {
  if (state.converting || state.files.length === 0) return;

  state.converting = true;
  state.lastOutput = null;
  hideBanner();

  for (const file of state.files) {
    file.status = 'idle';
    file.output = null;
    file.error = null;
  }

  renderList();
  setBusy(true);

  const total = state.files.length;

  try {
    const result = await bridge.convert(
      state.files.map((file) => ({ path: file.path, name: file.name })),
      {
        format: state.format,
        quality: Number(els.quality.value),
        maxSize: Number(els.maxSize.value) || 0,
        outputDir: state.outputDir
      }
    );

    finishConversion(result);
  } catch (error) {
    const message = error && error.message ? error.message : String(error);

    for (const [index, file] of state.files.entries()) {
      if (file.status !== 'working') continue;
      file.status = 'error';
      file.error = message;
      updateRow(index, 'error', { error: message });
    }

    showBanner('error', 'Konvertierung fehlgeschlagen', message);
  } finally {
    state.converting = false;
    setBusy(false);
  }
}

function finishConversion(result) {
  const results = Array.isArray(result?.results) ? result.results : [];
  const successful = results.filter((entry) => entry.ok);
  const failed = results.filter((entry) => !entry.ok);

  if (successful.length > 0) {
    state.lastOutput = successful[0].output;
  }

  const formatLabel = FORMAT_LABELS[state.format];
  const destination = state.outputDir ? 'im Zielordner' : 'neben den Originalen';
  const qualityPart = isLossy(state.format) ? ` mit ${els.quality.value} % Qualität` : ' verlustfrei';

  if (result?.cancelled) {
    showBanner(
      'info',
      'Konvertierung abgebrochen',
      `${successful.length} von ${state.files.length} Dateien konvertiert${failed.length ? `, ${failed.length} fehlgeschlagen` : ''}.`,
      { reveal: successful.length > 0 }
    );
    return;
  }

  if (failed.length === 0) {
    showBanner(
      'success',
      successful.length === 1 ? 'Datei konvertiert' : `${successful.length} Dateien konvertiert`,
      `Als ${formatLabel}${qualityPart} ${destination} gespeichert.`,
      { reveal: successful.length > 0 }
    );
    return;
  }

  if (successful.length === 0) {
    const firstError = failed[0]?.error ? ` ${failed[0].error}` : '';
    showBanner('error', 'Konvertierung fehlgeschlagen', `${failed.length} Datei(en) konnten nicht umgewandelt werden.${firstError}`);
    return;
  }

  showBanner(
    'error',
    `${successful.length} konvertiert, ${failed.length} fehlgeschlagen`,
    `${failed.length} Datei(en) konnten nicht umgewandelt werden. Details beim Überfahren der Fehler-Markierung.`,
    { reveal: true }
  );
}

async function cancelConversion() {
  if (!state.converting) return;
  els.cancelBtn.disabled = true;
  els.cancelBtn.textContent = 'Bricht ab …';
  els.progressLabel.textContent = 'Wird abgebrochen …';
  await bridge.cancel();
}

/* ---------- Drag & drop ---------- */

let dragDepth = 0;

function showDropOverlay() {
  els.dropOverlay.classList.add('is-visible');
  els.dropzone.classList.add('is-over');
}

function hideDropOverlay() {
  dragDepth = 0;
  els.dropOverlay.classList.remove('is-visible');
  els.dropzone.classList.remove('is-over');
}

function hasFiles(event) {
  const types = event.dataTransfer?.types;
  return Boolean(types && Array.from(types).includes('Files'));
}

window.addEventListener('dragenter', (event) => {
  if (!hasFiles(event) || state.converting) return;
  event.preventDefault();
  dragDepth += 1;
  showDropOverlay();
});

window.addEventListener('dragover', (event) => {
  event.preventDefault();
  if (!hasFiles(event)) return;
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
});

window.addEventListener('dragleave', (event) => {
  if (!hasFiles(event)) return;
  event.preventDefault();
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) hideDropOverlay();
});

window.addEventListener('drop', async (event) => {
  event.preventDefault();
  if (!hasFiles(event)) return;
  hideDropOverlay();

  if (state.converting) return;

  const dropped = Array.from(event.dataTransfer?.files || []);
  const paths = dropped
    .map((file) => bridge.getPathForFile(file))
    .filter((value) => typeof value === 'string' && value.length > 0);

  if (paths.length === 0) return;

  try {
    const files = await bridge.fromPaths(paths);
    addFiles(files);
  } catch (error) {
    showBanner('error', 'Dateien konnten nicht gelesen werden', error && error.message ? error.message : String(error));
  }
});

/* ---------- Events ---------- */

els.pickFiles.addEventListener('click', pickFiles);
els.pickFolder.addEventListener('click', pickFolder);
els.addMore.addEventListener('click', pickFiles);
els.clearBtn.addEventListener('click', clearFiles);
els.convertBtn.addEventListener('click', startConversion);
els.cancelBtn.addEventListener('click', cancelConversion);
els.revealBtn.addEventListener('click', () => {
  if (state.lastOutput) bridge.reveal(state.lastOutput);
});

els.formatGroup.addEventListener('click', (event) => {
  const button = event.target.closest('.seg');
  if (!button || state.converting) return;
  setFormat(button.dataset.format);
});

els.quality.addEventListener('input', () => {
  updateSliderFill();
  if (isLossy(state.format)) els.qualityValue.textContent = String(els.quality.value);
});

els.outSame.addEventListener('click', () => {
  if (state.converting) return;
  state.outputDir = null;
  els.outSame.classList.add('is-active');
  els.outPick.classList.remove('is-active');
  els.outputPath.textContent = '';
  els.outputPath.title = '';
});

els.outPick.addEventListener('click', async () => {
  if (state.converting) return;
  const dir = await bridge.pickOutputDir();
  if (!dir) return;
  state.outputDir = dir;
  els.outPick.classList.add('is-active');
  els.outSame.classList.remove('is-active');
  els.outputPath.textContent = shortenPath(dir);
  els.outputPath.title = dir;
});

bridge.onProgress((message) => {
  if (!message || message.type !== 'progress') return;

  const file = state.files[message.index];

  if (message.phase === 'start') {
    if (file) file.status = 'working';
    updateRow(message.index, 'working');
    updateProgress(message.index, message.total, `Konvertiere ${file ? file.name : 'Datei'} …`);
    return;
  }

  if (message.phase === 'done') {
    if (file) {
      file.status = message.ok ? 'done' : 'error';
      file.output = message.output || null;
      file.error = message.error || null;
    }
    updateRow(message.index, message.ok ? 'done' : 'error', message);
    updateProgress(message.index + 1, message.total, null);
  }
});

bridge.onMenu((action) => {
  if (state.converting) return;
  if (action === 'open-files') pickFiles();
  if (action === 'open-folder') pickFolder();
});

bridge.onFiles((files) => {
  addFiles(files);
});

window.addEventListener('keydown', (event) => {
  const modifier = event.metaKey || event.ctrlKey;

  if (modifier && event.key === 'Enter') {
    event.preventDefault();
    startConversion();
    return;
  }

  if (event.key === 'Escape' && state.converting) {
    event.preventDefault();
    cancelConversion();
  }
});

/* ---------- Init ---------- */

els.revealBtn.textContent = REVEAL_LABEL;
updateSliderFill();
setFormat('jpeg');
render();
