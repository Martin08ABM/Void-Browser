import { app } from "electron";
import fs from "node:fs";
import path from "node:path";

export interface FilterListsConfig {
  lastUpdated: number;
  customUrls: string[];
  ytAdblock: boolean;
}

export const DEFAULT_LISTS = [
  // EasyList family
  "https://easylist.to/easylist/easylist.txt",
  "https://easylist.to/easylist/easyprivacy.txt",
  "https://easylist.to/easylist/fanboy-annoyance.txt",
  "https://easylist.to/easylist/fanboy-social.txt",
  // AdGuard
  "https://filters.adtidy.org/extension/chromium/filters/2.txt",   // Base
  "https://filters.adtidy.org/extension/chromium/filters/3.txt",   // Tracking
  "https://filters.adtidy.org/extension/chromium/filters/4.txt",   // Social
  "https://filters.adtidy.org/extension/chromium/filters/14.txt",  // Annoyances
  "https://filters.adtidy.org/extension/chromium/filters/9.txt",   // Spanish/Portuguese
  // uBlock Origin
  "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt",
  "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/badware.txt",
  "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/privacy.txt",
  "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/unbreak.txt",
  "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/quick-fixes.txt",
];

const LISTS_FILE = path.join(app.getPath("userData"), "filter-lists.json");

let config: FilterListsConfig = {
  lastUpdated: 0,
  customUrls: [],
  ytAdblock: true,
};

export function loadListsConfig(): void {
  try {
    if (fs.existsSync(LISTS_FILE)) {
      const data = JSON.parse(fs.readFileSync(LISTS_FILE, "utf-8"));
      config = {
        lastUpdated: data.lastUpdated || 0,
        customUrls: Array.isArray(data.customUrls) ? data.customUrls : [],
        ytAdblock: data.ytAdblock !== false,
      };
    }
  } catch (err) {
    console.error("[VoidShield] Failed to load lists config:", err);
  }
}

export function saveListsConfig(): void {
  try {
    fs.writeFileSync(LISTS_FILE, JSON.stringify(config, null, 2));
  } catch (err) {
    console.error("[VoidShield] Failed to save lists config:", err);
  }
}

export function getListsConfig(): FilterListsConfig {
  return { ...config, customUrls: [...config.customUrls] };
}

export function getActiveListUrls(): string[] {
  return [...DEFAULT_LISTS, ...config.customUrls];
}

export function addCustomListUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (config.customUrls.includes(trimmed)) return false;
  config.customUrls.push(trimmed);
  saveListsConfig();
  return true;
}

export function removeCustomListUrl(url: string): boolean {
  const idx = config.customUrls.indexOf(url);
  if (idx === -1) return false;
  config.customUrls.splice(idx, 1);
  saveListsConfig();
  return true;
}

export function setLastUpdated(timestamp: number): void {
  config.lastUpdated = timestamp;
  saveListsConfig();
}

export function getYtAdblockEnabled(): boolean {
  return config.ytAdblock;
}

export function setYtAdblockEnabled(enabled: boolean): void {
  config.ytAdblock = enabled;
  saveListsConfig();
}
