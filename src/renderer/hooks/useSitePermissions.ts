import { useState, useEffect, useCallback } from "react";

export interface SitePermission {
  origin: string;
  permissions: Record<string, "granted" | "denied">;
}

export function useSitePermissions() {
  const [sites, setSites] = useState<SitePermission[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const result = await window.electronAPI?.getAllPermissions();
      setSites(result ?? []);
    } catch {
      setSites([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const clearAll = useCallback(async () => {
    try {
      await window.electronAPI?.clearAllPermissions();
      setSites([]);
    } catch {
      /* ignore */
    }
  }, []);

  const clearSite = useCallback(async (origin: string) => {
    try {
      await window.electronAPI?.clearPermissions(origin);
      setSites((prev) => prev.filter((s) => s.origin !== origin));
    } catch {
      /* ignore */
    }
  }, []);

  return { sites, loading, clearAll, clearSite, reload: load };
}
