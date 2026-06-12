import { useState, useEffect, useCallback } from "react";

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

const DEFAULT_CONFIG: PrivacyConfig = {
  doh: { enabled: true, provider: "quad9", customUrl: "" },
  dnt: { enabled: true },
  cookies: { blockThirdParty: true, clearOnExit: false },
  userAgent: { preset: "default", customUA: "" },
};

export function usePrivacy() {
  const [config, setConfig] = useState<PrivacyConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const api = window.electronAPI;
        if (!api) {
          if (!cancelled) setConfig(DEFAULT_CONFIG);
          return;
        }
        const c = await api.getPrivacyConfig();
        if (!cancelled) {
          setConfig(c ? { ...c, userAgent: c.userAgent ?? DEFAULT_CONFIG.userAgent } : DEFAULT_CONFIG);
        }
      } catch {
        if (!cancelled) setConfig(DEFAULT_CONFIG);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const updateDoH = useCallback((doh: DoHConfig) => {
    setConfig((prev) => ({ ...prev, doh }));
    window.electronAPI?.setDoH(doh).catch(() => { /* ignore */ });
  }, []);

  const updateDNT = useCallback((dnt: DNTConfig) => {
    setConfig((prev) => ({ ...prev, dnt }));
    window.electronAPI?.setDNT(dnt).catch(() => { /* ignore */ });
  }, []);

  const updateCookies = useCallback((cookies: CookieConfig) => {
    setConfig((prev) => ({ ...prev, cookies }));
    window.electronAPI?.setCookies(cookies).catch(() => { /* ignore */ });
  }, []);

  const updateUserAgent = useCallback((userAgent: UserAgentConfig) => {
    setConfig((prev) => ({ ...prev, userAgent }));
    window.electronAPI?.setUserAgent(userAgent).catch(() => { /* ignore */ });
  }, []);

  return { config, loading, updateDoH, updateDNT, updateCookies, updateUserAgent };
}
