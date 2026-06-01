import { app, BrowserWindow, ipcMain, session } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { initializeAdblocker } from './adblocker';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// ─── Permission storage ───
type PermissionDecision = 'granted' | 'denied';
const permissionsMap = new Map<string, Map<string, PermissionDecision>>();

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
});

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

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  // Initialize adblocker before creating window
  await initializeAdblocker();

  // Set up permission handler for the default session
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

  createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code and import them here.
