import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  getPermissions: (origin: string) => ipcRenderer.invoke("get-permissions", origin),
  setPermission: (origin: string, permission: string, decision: "granted" | "denied") =>
    ipcRenderer.invoke("set-permission", origin, permission, decision),
  clearPermissions: (origin: string) => ipcRenderer.invoke("clear-permissions", origin),

  getAllPermissions: () => ipcRenderer.invoke("get-all-permissions"),
  clearAllPermissions: () => ipcRenderer.invoke("clear-all-permissions"),

  getAdblockStats: () => ipcRenderer.invoke("adblock:get-stats"),
  resetAdblockStats: () => ipcRenderer.invoke("adblock:reset-stats"),
  onAdblockStatsUpdate: (callback: (stats: { adsBlocked: number; trackersBlocked: number }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, stats: { adsBlocked: number; trackersBlocked: number }) =>
      callback(stats);
    ipcRenderer.on("adblock:stats-update", handler);
    return () => ipcRenderer.removeListener("adblock:stats-update", handler);
  },

  // VoidShield lists
  getAdblockStatus: () => ipcRenderer.invoke("adblock:get-status"),
  updateAdblockNow: () => ipcRenderer.invoke("adblock:update-now"),
  getCustomLists: () => ipcRenderer.invoke("adblock:get-custom-lists"),
  addCustomList: (url: string) => ipcRenderer.invoke("adblock:add-custom-list", url),
  removeCustomList: (url: string) => ipcRenderer.invoke("adblock:remove-custom-list", url),
  setYtAdblock: (enabled: boolean) => ipcRenderer.invoke("adblock:set-yt-adblock", enabled),
  onAdblockStatusUpdate: (callback: (status: {
    adsBlocked: number;
    trackersBlocked: number;
    lastUpdated: number;
    listCount: number;
    customLists: string[];
    isUpdating: boolean;
  }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, status: {
      adsBlocked: number;
      trackersBlocked: number;
      lastUpdated: number;
      listCount: number;
      customLists: string[];
      isUpdating: boolean;
    }) => callback(status);
    ipcRenderer.on("adblock:status-update", handler);
    return () => ipcRenderer.removeListener("adblock:status-update", handler);
  },

  minimizeWindow: () => ipcRenderer.invoke("window-minimize"),
  maximizeWindow: () => ipcRenderer.invoke("window-maximize"),
  closeWindow: () => ipcRenderer.invoke("window-close"),
  createIncognitoWindow: () => ipcRenderer.invoke("window-create-incognito"),

  onShortcut: (shortcut: string, callback: () => void) => {
    const channel = `shortcut:${shortcut}`;
    const handler = () => callback();
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },

  onContextMenuNewTab: (callback: (url: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, url: string) => callback(url);
    ipcRenderer.on("context-menu:new-tab", handler);
    return () => ipcRenderer.removeListener("context-menu:new-tab", handler);
  },

  // Privacy APIs
  getPrivacyConfig: () => ipcRenderer.invoke("privacy:get-config"),
  setDoH: (config: { enabled: boolean; provider: string; customUrl: string }) =>
    ipcRenderer.invoke("privacy:set-doh", config),
  setDNT: (config: { enabled: boolean }) => ipcRenderer.invoke("privacy:set-dnt", config),
  setCookies: (config: { blockThirdParty: boolean; clearOnExit: boolean }) =>
    ipcRenderer.invoke("privacy:set-cookies", config),
  setUserAgent: (config: { preset: string; customUA: string }) =>
    ipcRenderer.invoke("privacy:set-ua", config),
  getUserAgentString: () => ipcRenderer.invoke("privacy:get-ua-string"),

  // Userscript APIs
  listUserscripts: () => ipcRenderer.invoke("userscript:list"),
  addUserscript: (code: string) => ipcRenderer.invoke("userscript:add", code),
  removeUserscript: (id: string) => ipcRenderer.invoke("userscript:remove", id),
  toggleUserscript: (id: string, enabled: boolean) => ipcRenderer.invoke("userscript:toggle", id, enabled),
});
