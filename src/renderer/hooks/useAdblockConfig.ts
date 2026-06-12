import { useState, useEffect, useCallback } from "react";
import type { AdblockStatus } from "../electron-api";

const DEFAULT_STATUS: AdblockStatus = {
  adsBlocked: 0,
  trackersBlocked: 0,
  lastUpdated: 0,
  listCount: 0,
  customLists: [],
  isUpdating: false,
  ytAdblockEnabled: true,
};

export function useAdblockConfig() {
  const [status, setStatus] = useState<AdblockStatus>(DEFAULT_STATUS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const api = window.electronAPI;
        if (!api) {
          if (!cancelled) setStatus(DEFAULT_STATUS);
          return;
        }
        const s = await api.getAdblockStatus();
        if (!cancelled) setStatus(s ?? DEFAULT_STATUS);
      } catch {
        if (!cancelled) setStatus(DEFAULT_STATUS);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    const unsubscribe = window.electronAPI?.onAdblockStatusUpdate((s) => {
      if (!cancelled) setStatus(s);
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const updateNow = useCallback(async () => {
    setStatus((prev) => ({ ...prev, isUpdating: true }));
    try {
      const ok = await window.electronAPI?.updateAdblockNow();
      if (ok) {
        const s = await window.electronAPI?.getAdblockStatus();
        if (s) setStatus(s);
      }
    } catch {
      // ignore
    } finally {
      setStatus((prev) => ({ ...prev, isUpdating: false }));
    }
  }, []);

  const addCustomList = useCallback(async (url: string) => {
    try {
      const ok = await window.electronAPI?.addCustomList(url);
      if (ok) {
        const s = await window.electronAPI?.getAdblockStatus();
        if (s) setStatus(s);
      }
      return ok ?? false;
    } catch {
      return false;
    }
  }, []);

  const removeCustomList = useCallback(async (url: string) => {
    try {
      const ok = await window.electronAPI?.removeCustomList(url);
      if (ok) {
        const s = await window.electronAPI?.getAdblockStatus();
        if (s) setStatus(s);
      }
      return ok ?? false;
    } catch {
      return false;
    }
  }, []);

  const setYtAdblock = useCallback(async (enabled: boolean) => {
    setStatus((prev) => ({ ...prev, ytAdblockEnabled: enabled }));
    try {
      await window.electronAPI?.setYtAdblock(enabled);
    } catch {
      // ignore — onAdblockStatusUpdate broadcast will reconcile
    }
  }, []);

  return {
    status,
    loading,
    updateNow,
    addCustomList,
    removeCustomList,
    setYtAdblock,
  };
}
