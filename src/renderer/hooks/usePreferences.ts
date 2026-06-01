import { useState, useCallback } from "react";
import { SearchEngine, SEARCH_ENGINES, DEFAULT_SEARCH_ENGINE } from "../types";

const STORAGE_KEY = "void-browser:search-engine";

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
