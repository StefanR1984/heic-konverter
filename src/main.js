'use strict';

const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { Worker } = require('node:worker_threads');

const HEIC_EXTENSIONS = new Set(['.heic', '.heif', '.hif']);
const IS_DEV = process.argv.includes('--dev');

function resolveWorkerPath() {
  if (app.isPackaged) {
    // The worker and its dependencies are unpacked so worker_threads can load
    // them reliably from outside the asar archive.
    return path.join(process.resourcesPath, 'app.asar.unpacked', 'src', 'converter-worker.js');
  }
  return path.join(__dirname, 'converter-worker.js');
}

let mainWindow = null;
let activeWorker = null;
let windowReady = false;
const pendingPaths = [];

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    minWidth: 880,
    minHeight: 660,
    show: false,
    backgroundColor: '#0c0d11',
    title: 'HEIC Konverter',
    autoHideMenuBar: process.platform !== 'darwin',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    trafficLightPosition: { x: 18, y: 19 },
    titleBarOverlay: process.platform === 'darwin'
      ? false
      : { color: '#0c0d11', symbolColor: '#e7e9ee', height: 52 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.webContents.on('did-finish-load', () => {
    windowReady = true;
    flushPendingFiles();
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (IS_DEV) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  mainWindow.on('closed', () => {
    stopWorker();
    windowReady = false;
    mainWindow = null;
  });
}

function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template = [];

  if (isMac) {
    template.push({
      label: app.name,
      submenu: [
        { role: 'about', label: 'Über HEIC Konverter' },
        { type: 'separator' },
        { role: 'hide', label: 'HEIC Konverter ausblenden' },
        { role: 'hideOthers', label: 'Andere ausblenden' },
        { role: 'unhide', label: 'Alle einblenden' },
        { type: 'separator' },
        { role: 'quit', label: 'HEIC Konverter beenden' }
      ]
    });
  }

  template.push(
    {
      label: 'Datei',
      submenu: [
        {
          label: 'HEIC-Dateien öffnen …',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow?.webContents.send('menu:open-files')
        },
        {
          label: 'Ordner öffnen …',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: () => mainWindow?.webContents.send('menu:open-folder')
        },
        { type: 'separator' },
        isMac ? { role: 'close', label: 'Fenster schließen' } : { role: 'quit', label: 'Beenden' }
      ]
    },
    {
      label: 'Bearbeiten',
      submenu: [
        { role: 'undo', label: 'Widerrufen' },
        { role: 'redo', label: 'Wiederholen' },
        { type: 'separator' },
        { role: 'cut', label: 'Ausschneiden' },
        { role: 'copy', label: 'Kopieren' },
        { role: 'paste', label: 'Einsetzen' },
        { role: 'selectAll', label: 'Alles auswählen' }
      ]
    },
    {
      label: 'Fenster',
      submenu: [
        { role: 'minimize', label: 'Minimieren' },
        { role: 'zoom', label: 'Zoomen' },
        ...(isMac ? [{ type: 'separator' }, { role: 'front', label: 'Alle nach vorne bringen' }] : [])
      ]
    }
  );

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function collectFiles(inputPaths) {
  const found = [];
  const seen = new Set();

  async function walk(target) {
    let stat;
    try {
      stat = await fs.stat(target);
    } catch {
      return;
    }

    if (stat.isDirectory()) {
      let entries;
      try {
        entries = await fs.readdir(target, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        await walk(path.join(target, entry.name));
      }
      return;
    }

    if (!stat.isFile()) return;
    if (!HEIC_EXTENSIONS.has(path.extname(target).toLowerCase())) return;

    const resolved = path.resolve(target);
    if (seen.has(resolved)) return;
    seen.add(resolved);

    found.push({
      path: resolved,
      name: path.basename(resolved),
      dir: path.dirname(resolved),
      size: stat.size
    });
  }

  for (const input of inputPaths) {
    if (typeof input === 'string' && input.length > 0) await walk(input);
  }

  found.sort((a, b) => a.name.localeCompare(b.name, 'de', { numeric: true, sensitivity: 'base' }));
  return found;
}

function queuePath(target) {
  if (typeof target !== 'string' || target.length === 0) return;
  const resolved = path.resolve(target);
  if (!HEIC_EXTENSIONS.has(path.extname(resolved).toLowerCase())) return;
  if (!pendingPaths.includes(resolved)) pendingPaths.push(resolved);
}

async function flushPendingFiles() {
  if (!windowReady || !mainWindow || mainWindow.isDestroyed() || pendingPaths.length === 0) return;

  const paths = pendingPaths.splice(0, pendingPaths.length);
  const files = await collectFiles(paths);

  if (files.length > 0 && mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('app:files', files);
  }
}

function sendProgress(message) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('convert:progress', message);
  }
}

function stopWorker() {
  if (!activeWorker) return;
  const worker = activeWorker;
  activeWorker = null;
  worker.terminate().catch(() => {});
}

function runConversion(files, options) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(resolveWorkerPath(), {
      workerData: { files, options }
    });
    activeWorker = worker;

    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      if (activeWorker === worker) activeWorker = null;
      worker.terminate().catch(() => {});
      callback(value);
    };

    worker.on('message', (message) => {
      if (!message || typeof message !== 'object') return;

      if (message.type === 'progress') {
        sendProgress(message);
        return;
      }

      if (message.type === 'done') {
        finish(resolve, {
          cancelled: Boolean(message.cancelled),
          results: Array.isArray(message.results) ? message.results : []
        });
        return;
      }

      if (message.type === 'fatal') {
        finish(reject, new Error(message.error || 'Unbekannter Fehler bei der Konvertierung.'));
      }
    });

    worker.on('error', (error) => {
      finish(reject, error instanceof Error ? error : new Error(String(error)));
    });

    worker.on('exit', (code) => {
      if (settled) return;
      finish(reject, new Error(`Konvertierung unerwartet beendet (Code ${code}).`));
    });
  });
}

ipcMain.handle('files:pick', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'HEIC-Dateien auswählen',
    buttonLabel: 'Hinzufügen',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'HEIC-Bilder', extensions: ['heic', 'heif', 'hif'] },
      { name: 'Alle Dateien', extensions: ['*'] }
    ]
  });
  if (result.canceled) return [];
  return collectFiles(result.filePaths);
});

ipcMain.handle('files:pick-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Ordner mit HEIC-Dateien auswählen',
    buttonLabel: 'Ordner durchsuchen',
    properties: ['openDirectory']
  });
  if (result.canceled) return [];
  return collectFiles(result.filePaths);
});

ipcMain.handle('files:from-paths', async (_event, paths) => {
  if (!Array.isArray(paths)) return [];
  return collectFiles(paths.filter((entry) => typeof entry === 'string'));
});

ipcMain.handle('dialog:pick-output', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Zielordner auswählen',
    buttonLabel: 'Auswählen',
    properties: ['openDirectory', 'createDirectory']
  });
  if (result.canceled || !result.filePaths.length) return null;
  return result.filePaths[0];
});

ipcMain.handle('convert:start', async (_event, files, options) => {
  if (activeWorker) throw new Error('Es läuft bereits eine Konvertierung.');
  if (!Array.isArray(files) || files.length === 0) throw new Error('Keine Dateien ausgewählt.');

  const cleanFiles = files
    .filter((file) => file && typeof file.path === 'string')
    .map((file) => ({ path: file.path, name: String(file.name || path.basename(file.path)) }));

  if (cleanFiles.length === 0) throw new Error('Keine gültigen Dateien ausgewählt.');

  return runConversion(cleanFiles, options || {});
});

ipcMain.handle('convert:cancel', () => {
  if (!activeWorker) return false;
  activeWorker.postMessage({ type: 'cancel' });
  return true;
});

ipcMain.handle('shell:reveal', (_event, target) => {
  if (typeof target !== 'string' || target.length === 0) return false;
  shell.showItemInFolder(target);
  return true;
});

const launchArgs = process.argv.slice(app.isPackaged ? 1 : 2);
for (const arg of launchArgs) {
  if (!arg.startsWith('-')) queuePath(arg);
}

app.on('open-file', (event, filePath) => {
  event.preventDefault();
  queuePath(filePath);
  flushPendingFiles();
});

app.whenReady().then(() => {
  app.setName('HEIC Konverter');
  buildMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  stopWorker();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  stopWorker();
});
