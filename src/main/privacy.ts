import { app, session } from "electron";
import fs from "node:fs";
import path from "node:path";

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

const PRIVACY_FILE = path.join(app.getPath("userData"), "privacy.json");

export const DOH_PROVIDERS: Record<string, { name: string; url: string }> = {
  quad9: { name: "Quad9", url: "https://dns.quad9.net/dns-query" },
  cloudflare: { name: "Cloudflare", url: "https://cloudflare-dns.com/dns-query" },
  google: { name: "Google", url: "https://dns.google/dns-query" },
  adguard: { name: "AdGuard", url: "https://dns.adguard-dns.com/dns-query" },
  opendns: { name: "OpenDNS", url: "https://doh.opendns.com/dns-query" },
  custom: { name: "Personalizado", url: "" },
};

export interface UAPreset {
  name: string;
  ua: string;
  // null = browser doesn't send client hints (Firefox/Safari), so we strip them
  secChUa: string | null;
  platform: string;
  mobile: boolean;
}

const CHROME_SEC_CH_UA = '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"';

export const UA_PRESETS: Record<string, UAPreset> = {
  default: {
    name: "Predeterminado (Chrome · Windows)",
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    secChUa: CHROME_SEC_CH_UA,
    platform: "Windows",
    mobile: false,
  },
  "chrome-mac": {
    name: "Chrome · macOS",
    ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    secChUa: CHROME_SEC_CH_UA,
    platform: "macOS",
    mobile: false,
  },
  "chrome-linux": {
    name: "Chrome · Linux",
    ua: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    secChUa: CHROME_SEC_CH_UA,
    platform: "Linux",
    mobile: false,
  },
  "edge-windows": {
    name: "Edge · Windows",
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0",
    secChUa: '"Chromium";v="128", "Not;A=Brand";v="24", "Microsoft Edge";v="128"',
    platform: "Windows",
    mobile: false,
  },
  "firefox-windows": {
    name: "Firefox · Windows",
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0",
    secChUa: null,
    platform: "Windows",
    mobile: false,
  },
  "safari-mac": {
    name: "Safari · macOS",
    ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15",
    secChUa: null,
    platform: "macOS",
    mobile: false,
  },
  "android-chrome": {
    name: "Chrome · Android",
    ua: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
    secChUa: CHROME_SEC_CH_UA,
    platform: "Android",
    mobile: true,
  },
  "ios-safari": {
    name: "Safari · iPhone",
    ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1",
    secChUa: null,
    platform: "iOS",
    mobile: true,
  },
  custom: {
    name: "Personalizado",
    ua: "",
    secChUa: null,
    platform: "Windows",
    mobile: false,
  },
};

const DEFAULT_PRIVACY: PrivacyConfig = {
  doh: {
    enabled: true,
    provider: "quad9",
    customUrl: "",
  },
  dnt: {
    enabled: true,
  },
  cookies: {
    blockThirdParty: true,
    clearOnExit: false,
  },
  userAgent: {
    preset: "default",
    customUA: "",
  },
};

function loadPrivacyConfig(): PrivacyConfig {
  try {
    if (fs.existsSync(PRIVACY_FILE)) {
      const data = JSON.parse(fs.readFileSync(PRIVACY_FILE, "utf-8"));
      return {
        doh: { ...DEFAULT_PRIVACY.doh, ...data.doh },
        dnt: { ...DEFAULT_PRIVACY.dnt, ...data.dnt },
        cookies: { ...DEFAULT_PRIVACY.cookies, ...data.cookies },
        userAgent: { ...DEFAULT_PRIVACY.userAgent, ...data.userAgent },
      };
    }
  } catch (err) {
    console.error("[Privacy] Failed to load config:", err);
  }
  return { ...DEFAULT_PRIVACY };
}

function savePrivacyConfig(config: PrivacyConfig): void {
  try {
    fs.writeFileSync(PRIVACY_FILE, JSON.stringify(config, null, 2));
  } catch (err) {
    console.error("[Privacy] Failed to save config:", err);
  }
}

const currentConfig = loadPrivacyConfig();

export function getPrivacyConfig(): PrivacyConfig {
  return { ...currentConfig };
}

export function setDoH(config: DoHConfig): void {
  currentConfig.doh = { ...config };
  savePrivacyConfig(currentConfig);
  applyDoH();
}

export function setDNT(config: DNTConfig): void {
  currentConfig.dnt = { ...config };
  savePrivacyConfig(currentConfig);
}

export function setCookies(config: CookieConfig): void {
  currentConfig.cookies = { ...config };
  savePrivacyConfig(currentConfig);
}

function getDoHUrl(): string | null {
  if (!currentConfig.doh.enabled) return null;
  const provider = DOH_PROVIDERS[currentConfig.doh.provider];
  if (!provider) return null;
  if (currentConfig.doh.provider === "custom") {
    const url = currentConfig.doh.customUrl.trim();
    return url || null;
  }
  return provider.url;
}

export function applyDoH(): void {
  const url = getDoHUrl();
  try {
    const ses = session.defaultSession as any;
    if (ses.dnsOverHTTPS !== undefined) {
      if (url) {
        ses.dnsOverHTTPS = { secure: true, templates: [url] };
        console.log("[Privacy] DoH enabled:", url);
      } else {
        ses.dnsOverHTTPS = { secure: false, templates: [] };
        console.log("[Privacy] DoH disabled");
      }
    } else {
      console.warn("[Privacy] dnsOverHTTPS API not available in this Electron build");
    }
  } catch (err) {
    console.error("[Privacy] Failed to apply DoH:", err);
  }
}

export function setUserAgent(config: UserAgentConfig): void {
  currentConfig.userAgent = { ...config };
  savePrivacyConfig(currentConfig);
  applyUserAgent();
}

export function getUserAgentString(): string {
  const cfg = currentConfig.userAgent;
  if (cfg.preset === "custom") {
    const ua = cfg.customUA.trim();
    if (ua) return ua;
  }
  return (UA_PRESETS[cfg.preset] ?? UA_PRESETS.default).ua;
}

export function getUserAgentHeaders(): { ua: string; secChUa: string | null; platform: string; mobile: boolean } {
  const cfg = currentConfig.userAgent;
  if (cfg.preset === "custom" && cfg.customUA.trim()) {
    return { ua: cfg.customUA.trim(), secChUa: null, platform: "Windows", mobile: false };
  }
  const preset = UA_PRESETS[cfg.preset] ?? UA_PRESETS.default;
  return { ua: preset.ua, secChUa: preset.secChUa, platform: preset.platform, mobile: preset.mobile };
}

export function applyUserAgent(): void {
  const ua = getUserAgentString();
  app.userAgentFallback = ua;
  if (app.isReady()) {
    try {
      session.defaultSession.setUserAgent(ua);
      session.fromPartition("persist:main").setUserAgent(ua);
      console.log("[Privacy] User-Agent applied:", ua);
    } catch (err) {
      console.error("[Privacy] Failed to apply User-Agent:", err);
    }
  }
}

export function getDNTEnabled(): boolean {
  return currentConfig.dnt.enabled;
}

export function getCookieConfig(): CookieConfig {
  return { ...currentConfig.cookies };
}
