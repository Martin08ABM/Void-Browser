import { useState, useCallback } from "react";
import { SearchEngine, SEARCH_ENGINES, DEFAULT_SEARCH_ENGINE } from "../types";

const STORAGE_KEY = "void-browser:search-engine";
const HISTORY_ENABLED_KEY = "void-browser:history-enabled";
const HISTORY_RETENTION_KEY = "void-browser:history-retention";

export function getSearchEngine(): SearchEngine {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as SearchEngine;
      const found = SEARCH_ENGINES.find((e) => e.name === parsed.name);
      if (found) return found;
    }
  } catch {
    // ignore
  }
  return DEFAULT_SEARCH_ENGINE;
}

export function setSearchEngine(engine: SearchEngine): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(engine));
}

export function hasSearchEngine(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

export function useSearchEngine() {
  const [engine, setEngineState] = useState<SearchEngine>(getSearchEngine);

  const setEngine = useCallback((newEngine: SearchEngine) => {
    setSearchEngine(newEngine);
    setEngineState(newEngine);
  }, []);

  return { engine, setEngine };
}

// ─── History preferences ───

export function getHistoryEnabled(): boolean {
  try {
    const stored = localStorage.getItem(HISTORY_ENABLED_KEY);
    return stored === null ? true : stored === "true";
  } catch {
    return true;
  }
}

export function setHistoryEnabled(enabled: boolean): void {
  localStorage.setItem(HISTORY_ENABLED_KEY, String(enabled));
}

export function getHistoryRetentionDays(): number {
  try {
    const stored = localStorage.getItem(HISTORY_RETENTION_KEY);
    if (stored === null) return 0;
    const parsed = parseInt(stored, 10);
    return isNaN(parsed) ? 0 : parsed;
  } catch {
    return 0;
  }
}

export function setHistoryRetentionDays(days: number): void {
  localStorage.setItem(HISTORY_RETENTION_KEY, String(days));
}

export function useHistorySettings() {
  const [enabled, setEnabledState] = useState<boolean>(getHistoryEnabled);
  const [retentionDays, setRetentionDaysState] = useState<number>(getHistoryRetentionDays);

  const setEnabled = useCallback((value: boolean) => {
    setHistoryEnabled(value);
    setEnabledState(value);
  }, []);

  const setRetentionDays = useCallback((value: number) => {
    setHistoryRetentionDays(value);
    setRetentionDaysState(value);
  }, []);

  return { enabled, setEnabled, retentionDays, setRetentionDays };
}
