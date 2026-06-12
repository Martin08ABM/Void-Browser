import { useState, useCallback } from "react";
import { getHistoryEnabled, getHistoryRetentionDays } from "./usePreferences";

const HISTORY_KEY = "void-browser-history";
const MAX_HISTORY_ITEMS = 500;

export interface HistoryEntry {
  url: string;
  title: string;
  timestamp: number;
}

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    let entries = parsed.filter(
      (item): item is HistoryEntry =>
        item &&
        typeof item.url === "string" &&
        typeof item.title === "string" &&
        typeof item.timestamp === "number"
    );
    // Apply retention filter on load
    const retentionDays = getHistoryRetentionDays();
    if (retentionDays > 0) {
      const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
      entries = entries.filter((e) => e.timestamp >= cutoff);
    }
    return entries;
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch {
    // Ignore storage errors (e.g. quota exceeded)
  }
}

function filterByRetention(entries: HistoryEntry[], retentionDays: number): HistoryEntry[] {
  if (retentionDays <= 0) return entries;
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  return entries.filter((e) => e.timestamp >= cutoff);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isYesterday(date: Date): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(date, yesterday);
}

export interface HistoryGroup {
  label: string;
  entries: HistoryEntry[];
}

export function groupHistory(entries: HistoryEntry[]): HistoryGroup[] {
  const groups: HistoryGroup[] = [];
  let currentGroup: HistoryGroup | null = null;

  for (const entry of entries) {
    const date = new Date(entry.timestamp);
    let label: string;
    const now = new Date();

    if (isSameDay(date, now)) {
      label = "Hoy";
    } else if (isYesterday(date)) {
      label = "Ayer";
    } else {
      label = date.toLocaleDateString("es-ES", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }

    if (!currentGroup || currentGroup.label !== label) {
      currentGroup = { label, entries: [] };
      groups.push(currentGroup);
    }
    currentGroup.entries.push(entry);
  }

  return groups;
}

export function useHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);

  const addEntry = useCallback((url: string, title: string) => {
    if (!url || url === "") return;
    if (!getHistoryEnabled()) return;
    setHistory((prev) => {
      const retentionDays = getHistoryRetentionDays();
      // Update title if last entry is same URL
      if (prev.length > 0 && prev[0].url === url) {
        const updated = [{ ...prev[0], title, timestamp: Date.now() }, ...prev.slice(1)];
        const trimmed = filterByRetention(updated, retentionDays).slice(0, MAX_HISTORY_ITEMS);
        saveHistory(trimmed);
        return trimmed;
      }
      const entry: HistoryEntry = { url, title: title || url, timestamp: Date.now() };
      const next = filterByRetention([entry, ...prev], retentionDays).slice(0, MAX_HISTORY_ITEMS);
      saveHistory(next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      // ignore
    }
  }, []);

  return { history, addEntry, clearHistory };
}
