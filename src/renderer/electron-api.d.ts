export interface AdblockStats {
  adsBlocked: number;
  trackersBlocked: number;
}

export interface AdblockStatus extends AdblockStats {
  lastUpdated: number;
  listCount: number;
  customLists: string[];
  isUpdating: boolean;
  ytAdblockEnabled: boolean;
}

export interface DoHConfig {
  enabled: boolean;
  provider: string;
  customUrl: string;
}

export interface DNTConfig {
  enabled: boolean;
}

export interface CookieConfig {
  blockThirdParty: boolean;
  clearOnExit: boolean;
}

export interface UserAgentConfig {
  preset: string;
  customUA: string;
}

export interface PrivacyConfig {
  doh: DoHConfig;
  dnt: DNTConfig;
  cookies: CookieConfig;
  userAgent: UserAgentConfig;
}

export interface SitePermission {
  origin: string;
  permissions: Record<string, "granted" | "denied">;
}

export type UserScriptRisk = "low" | "medium" | "high";

export interface UserScript {
  id: string;
  name: string;
  version: string;
  description: string;
  code: string;
  matches: string[];
  includes: string[];
  excludes: string[];
  runAt: "document-start" | "document-end" | "document-idle";
  enabled: boolean;
  createdAt: number;
  risk: UserScriptRisk;
  grants: string[];
  requires: string[];
  connects: string[];
}

export interface ElectronAPI {
  getPermissions: (origin: string) => Promise<Record<string, "granted" | "denied">>;
  setPermission: (
    origin: string,
    permission: string,
    decision: "granted" | "denied"
  ) => Promise<void>;
  clearPermissions: (origin: string) => Promise<void>;

  getAllPermissions: () => Promise<SitePermission[]>;
  clearAllPermissions: () => Promise<void>;

  getAdblockStats: () => Promise<AdblockStats>;
  resetAdblockStats: () => Promise<AdblockStats>;
  onAdblockStatsUpdate: (
    callback: (stats: AdblockStats) => void
  ) => () => void;

  // VoidShield lists
  getAdblockStatus: () => Promise<AdblockStatus>;
  updateAdblockNow: () => Promise<boolean>;
  getCustomLists: () => Promise<string[]>;
  addCustomList: (url: string) => Promise<boolean>;
  removeCustomList: (url: string) => Promise<boolean>;
  setYtAdblock: (enabled: boolean) => Promise<boolean>;
  onAdblockStatusUpdate: (
    callback: (status: AdblockStatus) => void
  ) => () => void;

  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  createIncognitoWindow: () => Promise<void>;
  onShortcut: (shortcut: string, callback: () => void) => () => void;
  onContextMenuNewTab: (callback: (url: string) => void) => () => void;

  // Privacy
  getPrivacyConfig: () => Promise<PrivacyConfig>;
  setDoH: (config: DoHConfig) => Promise<void>;
  setDNT: (config: DNTConfig) => Promise<void>;
  setCookies: (config: CookieConfig) => Promise<void>;
  setUserAgent: (config: UserAgentConfig) => Promise<void>;
  getUserAgentString: () => Promise<string>;

  // Userscripts
  listUserscripts: () => Promise<UserScript[]>;
  addUserscript: (code: string) => Promise<UserScript>;
  removeUserscript: (id: string) => Promise<boolean>;
  toggleUserscript: (id: string, enabled: boolean) => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
