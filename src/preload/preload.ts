import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  getPermissions: (origin: string) => ipcRenderer.invoke("get-permissions", origin),
  setPermission: (origin: string, permission: string, decision: "granted" | "denied") =>
    ipcRenderer.invoke("set-permission", origin, permission, decision),
  clearPermissions: (origin: string) => ipcRenderer.invoke("clear-permissions", origin),

  getAdblockStats: () => ipcRenderer.invoke("adblock:get-stats"),
  resetAdblockStats: () => ipcRenderer.invoke("adblock:reset-stats"),
  onAdblockStatsUpdate: (callback: (stats: { adsBlocked: number; trackersBlocked: number }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, stats: { adsBlocked: number; trackersBlocked: number }) =>
      callback(stats);
    ipcRenderer.on("adblock:stats-update", handler);
    return () => ipcRenderer.removeListener("adblock:stats-update", handler);
  },
});
