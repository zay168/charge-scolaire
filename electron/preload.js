/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ELECTRON PRELOAD SCRIPT
 * Exposes safe IPC methods to the renderer process
 * ═══════════════════════════════════════════════════════════════════════════
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose safe methods to the renderer
contextBridge.exposeInMainWorld('electronAPI', {
    // Get stored GTK token from main process
    getGtkToken: () => ipcRenderer.invoke('get-gtk-token'),

    // Get all stored cookies for API requests
    getCookies: () => ipcRenderer.invoke('get-cookies'),

    // Notify main process to clear cookies (on logout)
    clearCookies: () => ipcRenderer.invoke('clear-cookies'),

    // Check if running in Electron
    isElectron: true,

    // App version
    getVersion: () => ipcRenderer.invoke('get-version'),

    // Auto-updater controls
    onUpdateAvailable: (callback) => ipcRenderer.on('update_available', callback),
    onUpdateDownloaded: (callback) => ipcRenderer.on('update_downloaded', callback),
    onDownloadProgress: (callback) => ipcRenderer.on('update_download_progress', callback),
    restartApp: () => ipcRenderer.send('restart_app'),
});

console.log('⚡ Electron preload script loaded');
