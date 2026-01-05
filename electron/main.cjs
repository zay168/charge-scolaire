/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ELECTRON MAIN PROCESS
 * Handles window creation, auto-updates, and GTK cookie management
 * ═══════════════════════════════════════════════════════════════════════════
 */

const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

// Logging
const log = require('electron-log');
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

let mainWindow;

// ─────────────────────────────────────────────────────────────────────────────
// COOKIE & GTK TOKEN STORAGE
// These are captured from API responses and injected into subsequent requests
// ─────────────────────────────────────────────────────────────────────────────

const cookieStore = {
    gtk: null,
    allCookies: [],
    sessionId: null,
};

// ─────────────────────────────────────────────────────────────────────────────
// WINDOW CREATION
// ─────────────────────────────────────────────────────────────────────────────

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 768,
        frame: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: false, // Disables CORS for direct API calls
        },
        backgroundColor: '#050505',
        show: false,
    });

    // ─────────────────────────────────────────────────────────────────────────
    // INTERCEPT API RESPONSES TO CAPTURE GTK COOKIES
    // ─────────────────────────────────────────────────────────────────────────

    const ses = mainWindow.webContents.session;

    ses.webRequest.onHeadersReceived(
        { urls: ['*://api.ecoledirecte.com/*'] },
        (details, callback) => {
            const headers = details.responseHeaders;

            // Capture Set-Cookie headers
            const setCookies = headers['set-cookie'] || headers['Set-Cookie'];
            if (setCookies) {
                for (const cookie of setCookies) {
                    const cookieValue = cookie.split(';')[0];
                    const [cookieName, cookieVal] = cookieValue.split('=');

                    if (!cookieVal || cookieVal.trim() === '') continue;

                    // Update or add cookie
                    const existingIdx = cookieStore.allCookies.findIndex(c => c.startsWith(cookieName + '='));
                    if (existingIdx >= 0) {
                        cookieStore.allCookies[existingIdx] = cookieValue;
                    } else {
                        cookieStore.allCookies.push(cookieValue);
                    }

                    // Special handling for GTK
                    if (cookieName.toLowerCase() === 'gtk') {
                        cookieStore.gtk = cookieVal;
                        log.info('🔑 GTK Token captured:', cookieVal.substring(0, 20) + '...');
                    }
                }
            }

            callback({ responseHeaders: headers });
        }
    );

    // ─────────────────────────────────────────────────────────────────────────
    // INTERCEPT API REQUESTS TO INJECT HEADERS
    // ─────────────────────────────────────────────────────────────────────────

    ses.webRequest.onBeforeSendHeaders(
        { urls: ['*://api.ecoledirecte.com/*'] },
        (details, callback) => {
            const headers = details.requestHeaders;

            // Always set required headers
            headers['Origin'] = 'https://www.ecoledirecte.com';
            headers['Referer'] = 'https://www.ecoledirecte.com/';
            headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

            // Inject GTK token if available
            if (cookieStore.gtk) {
                headers['X-GTK'] = cookieStore.gtk;
            }

            // Inject all cookies
            if (cookieStore.allCookies.length > 0) {
                const existingCookie = headers['Cookie'] || '';
                const allCookies = [...cookieStore.allCookies];
                if (existingCookie) {
                    allCookies.push(existingCookie);
                }
                headers['Cookie'] = allCookies.join('; ');
            }

            callback({ requestHeaders: headers });
        }
    );

    // ─────────────────────────────────────────────────────────────────────────
    // LOAD THE APP
    // ─────────────────────────────────────────────────────────────────────────

    if (process.env.ELECTRON_START_URL) {
        mainWindow.loadURL(process.env.ELECTRON_START_URL);
    } else {
        const indexPath = app.isPackaged
            ? path.join(process.resourcesPath, 'app.asar', 'dist', 'index.html')
            : path.join(__dirname, '..', 'dist', 'index.html');

        log.info('Loading file:', indexPath);

        mainWindow.loadFile(indexPath).catch(err => {
            log.error('Failed to load:', err);
            const fallbackPath = path.join(app.getAppPath(), 'dist', 'index.html');
            mainWindow.loadFile(fallbackPath);
        });
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Check for updates once window is loaded
    mainWindow.webContents.on('did-finish-load', () => {
        if (app.isPackaged) {
            autoUpdater.checkForUpdatesAndNotify();
        }
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// APP LIFECYCLE
// ─────────────────────────────────────────────────────────────────────────────

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// IPC HANDLERS - Communication with renderer
// ─────────────────────────────────────────────────────────────────────────────

ipcMain.handle('get-gtk-token', () => cookieStore.gtk);
ipcMain.handle('get-cookies', () => cookieStore.allCookies);
ipcMain.handle('clear-cookies', () => {
    cookieStore.gtk = null;
    cookieStore.allCookies = [];
    cookieStore.sessionId = null;
    log.info('🗑️ Cookies cleared');
    return true;
});
ipcMain.handle('get-version', () => app.getVersion());

ipcMain.on('restart_app', () => {
    autoUpdater.quitAndInstall();
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTO-UPDATER EVENTS
// ─────────────────────────────────────────────────────────────────────────────

autoUpdater.on('checking-for-update', () => {
    log.info('Checking for update...');
});

autoUpdater.on('update-available', (info) => {
    log.info('Update available.');
    if (mainWindow) mainWindow.webContents.send('update_available');
});

autoUpdater.on('update-not-available', () => {
    log.info('Update not available.');
});

autoUpdater.on('error', (err) => {
    log.error('Error in auto-updater:', err);
});

autoUpdater.on('download-progress', (progressObj) => {
    log.info(`Download: ${progressObj.percent.toFixed(1)}%`);
    if (mainWindow) mainWindow.webContents.send('update_download_progress', progressObj);
});

autoUpdater.on('update-downloaded', () => {
    log.info('Update downloaded');
    if (mainWindow) mainWindow.webContents.send('update_downloaded');
});
