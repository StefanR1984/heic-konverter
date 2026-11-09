'use strict';

const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('api', {
  platform: process.platform,
  home: process.env.HOME || process.env.USERPROFILE || '',
  pickFiles: () => ipcRenderer.invoke('files:pick'),
  pickFolder: () => ipcRenderer.invoke('files:pick-folder'),
  fromPaths: (paths) => ipcRenderer.invoke('files:from-paths', paths),
  pickOutputDir: () => ipcRenderer.invoke('dialog:pick-output'),
  getPathForFile: (file) => {
    try {
      return webUtils.getPathForFile(file);
    } catch {
      return '';
    }
  },
  convert: (files, options) => ipcRenderer.invoke('convert:start', files, options),
  cancel: () => ipcRenderer.invoke('convert:cancel'),
  reveal: (target) => ipcRenderer.invoke('shell:reveal', target),
  onProgress: (callback) => {
    const handler = (_event, message) => callback(message);
    ipcRenderer.on('convert:progress', handler);
    return () => ipcRenderer.removeListener('convert:progress', handler);
  },
  onMenu: (callback) => {
    const filesHandler = () => callback('open-files');
    const folderHandler = () => callback('open-folder');
    ipcRenderer.on('menu:open-files', filesHandler);
    ipcRenderer.on('menu:open-folder', folderHandler);
    return () => {
      ipcRenderer.removeListener('menu:open-files', filesHandler);
      ipcRenderer.removeListener('menu:open-folder', folderHandler);
    };
  },
  onFiles: (callback) => {
    const handler = (_event, files) => callback(files);
    ipcRenderer.on('app:files', handler);
    return () => ipcRenderer.removeListener('app:files', handler);
  }
});
