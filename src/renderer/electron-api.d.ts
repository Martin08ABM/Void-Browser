export interface AdblockStats {
  adsBlocked: number;
  trackersBlocked: number;
}

export interface ElectronAPI {
  getPermissions: (origin: string) => Promise<Record<string, "granted" | "denied">>;
  setPermission: (
    origin: string,
    permission: string,
    decision: "granted" | "denied"
  ) => Promise<void>;
  clearPermissions: (origin: string) => Promise<void>;

  getAdblockStats: () => Promise<AdblockStats>;
  resetAdblockStats: () => Promise<AdblockStats>;
  onAdblockStatsUpdate: (
    callback: (stats: AdblockStats) => void
  ) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
