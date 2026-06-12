import { app, BrowserWindow, ipcMain, session, Menu, MenuItem } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { initializeAdblocker, refreshBlocker } from './adblocker';
import {
  getPrivacyConfig,
  setDoH,
  setDNT,
  setCookies,
  setUserAgent,
  applyDoH,
  applyUserAgent,
  getCookieConfig,
  getUserAgentString,
  getUserAgentHeaders,
} from './privacy';
import { listScripts, addScript, removeScript, toggleScript, injectScripts } from './userscripts';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const started = require('electron-squirrel-startup');
  if (started) {
    app.quit();
  }
} catch (e) {
  // Ignore squirrel startup errors to prevent crash on launch
  console.warn('[Squirrel] Startup handling skipped:', e);
}

// ─── User-Agent spoofing (configurable; also avoids OAuth blocks) ───
// Must be set before app is ready
app.userAgentFallback = getUserAgentString();

// ─── Permission storage ───
type PermissionDecision = 'granted' | 'denied';
const permissionsMap = new Map<string, Map<string, PermissionDecision>>();

const PERMISSIONS_FILE = path.join(app.getPath('userData'), 'permissions.json');

function loadPermissions(): void {
  try {
    if (fs.existsSync(PERMISSIONS_FILE)) {
      const data = JSON.parse(fs.readFileSync(PERMISSIONS_FILE, 'utf-8'));
      if (data && typeof data === 'object') {
        permissionsMap.clear();
        for (const [origin, perms] of Object.entries(data)) {
          if (perms && typeof perms === 'object') {
            const map = new Map<string, PermissionDecision>();
            for (const [perm, decision] of Object.entries(perms)) {
              if (decision === 'granted' || decision === 'denied') {
                map.set(perm, decision);
              }
            }
            permissionsMap.set(origin, map);
          }
        }
      }
    }
  } catch (err) {
    console.error('[Permissions] Failed to load:', err);
  }
}

function savePermissions(): void {
  try {
    const data: Record<string, Record<string, PermissionDecision>> = {};
    for (const [origin, perms] of permissionsMap) {
      data[origin] = Object.fromEntries(perms);
    }
    fs.writeFileSync(PERMISSIONS_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('[Permissions] Failed to save:', err);
  }
}

function getOriginKey(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

function getPermissionsForOrigin(origin: string): Record<string, PermissionDecision> {
  const perms = permissionsMap.get(origin);
  if (!perms) return {};
  return Object.fromEntries(perms);
}

function setPermission(origin: string, permission: string, decision: PermissionDecision) {
  if (!permissionsMap.has(origin)) {
    permissionsMap.set(origin, new Map());
  }
  permissionsMap.get(origin)!.set(permission, decision);
  savePermissions();
}

// IPC handlers
ipcMain.handle('get-permissions', (_, origin: string) => {
  return getPermissionsForOrigin(origin);
});

ipcMain.handle('set-permission', (_, origin: string, permission: string, decision: PermissionDecision) => {
  setPermission(origin, permission, decision);
});

ipcMain.handle('clear-permissions', (_, origin: string) => {
  permissionsMap.delete(origin);
  savePermissions();
});

// ─── Permissions ───
ipcMain.handle('get-all-permissions', () => {
  const result: Array<{ origin: string; permissions: Record<string, PermissionDecision> }> = [];
  for (const [origin, perms] of permissionsMap) {
    result.push({ origin, permissions: Object.fromEntries(perms) });
  }
  return result;
});

ipcMain.handle('clear-all-permissions', () => {
  permissionsMap.clear();
  savePermissions();
});

// ─── Privacy (DoH, DNT & Cookies) ───
ipcMain.handle('privacy:get-config', () => getPrivacyConfig());
ipcMain.handle('privacy:set-doh', (_, config) => setDoH(config));
ipcMain.handle('privacy:set-dnt', (_, config) => setDNT(config));
ipcMain.handle('privacy:set-cookies', (_, config) => setCookies(config));
ipcMain.handle('privacy:set-ua', (_, config) => setUserAgent(config));
ipcMain.handle('privacy:get-ua-string', () => getUserAgentString());

// ─── Userscripts ───
ipcMain.handle('userscript:list', () => listScripts());
ipcMain.handle('userscript:add', (_, code: string) => addScript(code));
ipcMain.handle('userscript:remove', (_, id: string) => removeScript(id));
ipcMain.handle('userscript:toggle', (_, id: string, enabled: boolean) => toggleScript(id, enabled));

// ─── Window controls ───
ipcMain.handle('window-minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  win?.minimize();
});

ipcMain.handle('window-maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win?.isMaximized()) {
    win.unmaximize();
  } else {
    win?.maximize();
  }
});

ipcMain.handle('window-close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  win?.close();
});

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    show: false,
    frame: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    icon: path.join(__dirname, '../assets/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true,
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: true,
      spellcheck: false,
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  mainWindow.maximize();
  mainWindow.show();
};

const createIncognitoWindow = () => {
  const incognitoWindow = new BrowserWindow({
    show: false,
    frame: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    icon: path.join(__dirname, '../assets/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true,
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: true,
      spellcheck: false,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    incognitoWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL + '?incognito=1');
  } else {
    incognitoWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
      { query: { incognito: '1' } }
    );
  }

  incognitoWindow.maximize();
  incognitoWindow.show();

  // Clear all storage when incognito window is closed
  incognitoWindow.on('closed', () => {
    const partition = `persist:incognito-${incognitoWindow.id}`;
    session.fromPartition(partition).clearStorageData().catch(() => {});
  });
};

ipcMain.handle('window-create-incognito', () => {
  createIncognitoWindow();
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  // Initialize adblocker before creating window (non-blocking)
  try {
    await initializeAdblocker();
  } catch (err) {
    console.error('[Main] Adblocker initialization failed, continuing without it:', err);
  }

  // Auto-refresh filter lists every 24 hours
  setInterval(() => {
    refreshBlocker({ force: true }).catch((err) => {
      console.error('[Main] Auto-refresh failed:', err);
    });
  }, 24 * 60 * 60 * 1000);

  // Load persisted permissions
  loadPermissions();

  // Apply privacy settings (DoH)
  try {
    applyDoH();
  } catch (err) {
    console.error('[Main] Failed to apply DoH:', err);
  }

  // Apply configured User-Agent to sessions (webview session headers are
  // rewritten in adblocker.ts, which owns onBeforeSendHeaders for persist:main)
  try {
    applyUserAgent();
  } catch (err) {
    console.error('[Main] Failed to apply User-Agent:', err);
  }

  // Spoof UA + client hints on the default session (UI/renderer requests)
  try {
    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
      const uaH = getUserAgentHeaders();
      for (const key of Object.keys(details.requestHeaders)) {
        if (key.toLowerCase() === 'user-agent' || key.toLowerCase().startsWith('sec-ch-ua')) {
          delete details.requestHeaders[key];
        }
      }
      details.requestHeaders['User-Agent'] = uaH.ua;
      if (uaH.secChUa) {
        details.requestHeaders['sec-ch-ua'] = uaH.secChUa;
        details.requestHeaders['sec-ch-ua-mobile'] = uaH.mobile ? '?1' : '?0';
        details.requestHeaders['sec-ch-ua-platform'] = `"${uaH.platform}"`;
      }
      callback({ requestHeaders: details.requestHeaders });
    });
  } catch (err) {
    console.error('[Main] Failed to set up header spoofing:', err);
  }

  // Set up permission handler for the default session
  try {
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
      const url = webContents.getURL();
      const origin = getOriginKey(url);
      const existing = permissionsMap.get(origin)?.get(permission);

      if (existing) {
        callback(existing === 'granted');
        return;
      }

      // Default policy: allow only fullscreen; deny everything else silently
      const defaultAllow = ['fullscreen'].includes(permission);
      const decision: PermissionDecision = defaultAllow ? 'granted' : 'denied';
      setPermission(origin, permission, decision);
      callback(defaultAllow);
    });
  } catch (err) {
    console.error('[Main] Failed to set permission request handler:', err);
  }

  try {
    createWindow();
  } catch (err) {
    console.error('[Main] Failed to create window:', err);
  }
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Clear storage data on exit if configured
app.on('before-quit', async () => {
  const cfg = getCookieConfig();
  if (cfg.clearOnExit) {
    try {
      await session.fromPartition('persist:main').clearStorageData();
      console.log('[Privacy] Cleared storage data on exit');
    } catch (err) {
      console.error('[Privacy] Failed to clear storage on exit:', err);
    }
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// ─── Keyboard shortcuts (work even when focus is inside a webview) ───
app.on('web-contents-created', (_, wc) => {
  // Userscript injection for webviews
  if (wc.getType() === 'webview') {
    // window.open / target=_blank → open as an independent tab instead of a
    // native popup window tied to the opener
    wc.setWindowOpenHandler(({ url }) => {
      if (/^https?:/i.test(url)) {
        const hostWin = BrowserWindow.fromWebContents(wc.hostWebContents ?? wc);
        hostWin?.webContents.send('context-menu:new-tab', url);
      }
      return { action: 'deny' };
    });

    wc.on('did-start-loading', () => {
      injectScripts(wc, wc.getURL(), 'document-start');
    });
    wc.on('dom-ready', () => {
      injectScripts(wc, wc.getURL(), 'document-end');
      setTimeout(() => {
        injectScripts(wc, wc.getURL(), 'document-idle');
      }, 100);
    });

    // Context menu for webviews
    wc.on('context-menu', (event, params) => {
      const menu = new Menu();

      if (params.linkURL) {
        menu.append(new MenuItem({
          label: 'Abrir enlace en nueva pestaña',
          click: () => {
            const hostWin = BrowserWindow.fromWebContents(wc.hostWebContents ?? wc);
            if (hostWin) {
              hostWin.webContents.send('context-menu:new-tab', params.linkURL);
            }
          },
        }));
        menu.append(new MenuItem({
          label: 'Copiar dirección de enlace',
          click: () => {
            wc.copy();
          },
        }));
        menu.append(new MenuItem({ type: 'separator' }));
      }

      if (params.hasImageContents) {
        menu.append(new MenuItem({
          label: 'Guardar imagen',
          click: () => {
            wc.downloadURL(params.srcURL);
          },
        }));
        menu.append(new MenuItem({ type: 'separator' }));
      }

      menu.append(new MenuItem({
        label: 'Atrás',
        enabled: wc.canGoBack(),
        click: () => wc.goBack(),
      }));
      menu.append(new MenuItem({
        label: 'Adelante',
        enabled: wc.canGoForward(),
        click: () => wc.goForward(),
      }));
      menu.append(new MenuItem({
        label: 'Recargar',
        click: () => wc.reload(),
      }));
      menu.append(new MenuItem({ type: 'separator' }));

      menu.append(new MenuItem({
        label: 'Copiar',
        role: 'copy',
      }));
      menu.append(new MenuItem({
        label: 'Pegar',
        role: 'paste',
      }));
      menu.append(new MenuItem({ type: 'separator' }));

      menu.append(new MenuItem({
        label: 'Inspeccionar elemento',
        click: () => wc.openDevTools({ mode: 'detach' }),
      }));

      menu.popup({ window: BrowserWindow.fromWebContents(wc.hostWebContents ?? wc)! });
    });
  }

  wc.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;

    const ctrl = input.control;
    const shift = input.shift;
    const alt = input.alt;
    const key = input.key;
    const keyLower = key.toLowerCase();

    // Find target window (handle webviews via hostWebContents)
    const targetWin = BrowserWindow.fromWebContents(wc.hostWebContents ?? wc);
    if (!targetWin) return;

    const isWebview = wc.getType() === 'webview';
    const targetWebview = isWebview ? wc : undefined;

    // F5 — Reload
    if (key === 'F5' && !ctrl && !shift && !alt) {
      event.preventDefault();
      if (targetWebview) targetWebview.reload();
      else targetWin.webContents.send('shortcut:reload');
      return;
    }

    // Alt+Left — Back
    if (key === 'ArrowLeft' && alt && !ctrl && !shift) {
      event.preventDefault();
      if (targetWebview && targetWebview.canGoBack()) targetWebview.goBack();
      else targetWin.webContents.send('shortcut:go-back');
      return;
    }

    // Alt+Right — Forward
    if (key === 'ArrowRight' && alt && !ctrl && !shift) {
      event.preventDefault();
      if (targetWebview && targetWebview.canGoForward()) targetWebview.goForward();
      else targetWin.webContents.send('shortcut:go-forward');
      return;
    }

    // F11 — Toggle fullscreen
    if (key === 'F11' && !ctrl && !shift && !alt) {
      event.preventDefault();
      targetWin.setFullScreen(!targetWin.isFullScreen());
      return;
    }

    // Ctrl+Tab — Next tab
    if (key === 'Tab' && ctrl && !shift && !alt) {
      event.preventDefault();
      targetWin.webContents.send('shortcut:next-tab');
      return;
    }

    // Ctrl+Shift+Tab — Previous tab
    if (key === 'Tab' && ctrl && shift && !alt) {
      event.preventDefault();
      targetWin.webContents.send('shortcut:prev-tab');
      return;
    }

    // Ctrl+Plus / Ctrl+Equals — Zoom in
    if ((key === '+' || key === '=' || key === 'Plus') && ctrl && !shift && !alt) {
      event.preventDefault();
      const target = targetWebview ?? targetWin.webContents;
      target.setZoomLevel(target.getZoomLevel() + 1);
      return;
    }

    // Ctrl+Minus — Zoom out
    if ((key === '-' || key === 'Minus' || key === '_') && ctrl && !shift && !alt) {
      event.preventDefault();
      const target = targetWebview ?? targetWin.webContents;
      target.setZoomLevel(target.getZoomLevel() - 1);
      return;
    }

    // Ctrl+0 — Zoom reset
    if (key === '0' && ctrl && !shift && !alt) {
      event.preventDefault();
      const target = targetWebview ?? targetWin.webContents;
      target.setZoomLevel(0);
      return;
    }

    // Ctrl+F — Find in page
    if (keyLower === 'f' && ctrl && !shift && !alt) {
      event.preventDefault();
      targetWin.webContents.send('shortcut:find-in-page');
      return;
    }

    // Ctrl+L — Focus address bar
    if (keyLower === 'l' && ctrl && !shift && !alt) {
      event.preventDefault();
      targetWin.webContents.send('shortcut:focus-address-bar');
      return;
    }

    const shortcuts: { ctrl: boolean; shift: boolean; alt: boolean; key: string; name: string }[] = [
      { ctrl: true, shift: false, alt: false, key: 'h', name: 'toggle-history' },
      { ctrl: true, shift: false, alt: true, key: 'h', name: 'toggle-navbar' },
      { ctrl: true, shift: false, alt: false, key: 't', name: 'new-tab' },
      { ctrl: true, shift: true, alt: false, key: 'n', name: 'new-incognito' },
      { ctrl: true, shift: false, alt: false, key: 'w', name: 'close-tab' },
      { ctrl: true, shift: false, alt: false, key: 'r', name: 'reload' },
      { ctrl: true, shift: true, alt: false, key: 't', name: 'reopen-tab' },
      { ctrl: true, shift: false, alt: true, key: 'b', name: 'go-back' },
      { ctrl: true, shift: false, alt: true, key: 'a', name: 'go-forward' },
    ];

    for (const s of shortcuts) {
      if (ctrl === s.ctrl && shift === s.shift && alt === s.alt && keyLower === s.key) {
        event.preventDefault();
        targetWin.webContents.send(`shortcut:${s.name}`);
        return;
      }
    }
  });
});
