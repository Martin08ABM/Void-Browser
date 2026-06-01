import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";

import { Tab, SearchEngine } from "./types";
import { hasSearchEngine, useSearchEngine } from "./hooks/usePreferences";

import Tabs from "./components/Tabs";
import Navbar, { NavbarHandle } from "./components/Navbar";
import Content from "./components/Content";
import SettingsPage from "./components/SettingsPage";
import SearchEnginePicker from "./components/SearchEnginePicker";

import "./styles/App.css";

let nextTabId = 2;

function isUrlLike(text: string): boolean {
  if (/^https?:\/\//i.test(text)) return true;
  if (/^www\./i.test(text)) return true;
  // Dominios simples como github.com, o con subdominios como mail.google.com
  if (/^[\w-]+(\.[\w-]+)*\.[a-z]{2,}/i.test(text)) return true;
  if (/^(\d{1,3}\.){3}\d{1,3}/.test(text)) return true;
  if (/^localhost(:\d+)?/i.test(text)) return true;
  return false;
}

function buildSearchUrl(engine: SearchEngine, query: string): string {
  return engine.url + encodeURIComponent(query);
}

function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("www.")) return "https://" + trimmed;
  return "https://" + trimmed;
}

function getOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

export default function App() {
  const { engine, setEngine } = useSearchEngine();
  const [showOnboarding, setShowOnboarding] = useState(!hasSearchEngine());
  const [view, setView] = useState<"browser" | "settings">("browser");
  const [navbarVisible, setNavbarVisible] = useState(true);

  const [tabs, setTabs] = useState<Tab[]>([
    { id: 1, title: "Nueva pestaña", url: "", isActive: true },
  ]);

  const [permissions, setPermissions] = useState<Record<string, "granted" | "denied">>({});
  const [loadingTabs, setLoadingTabs] = useState<Set<number>>(new Set());
  const [adblockStats, setAdblockStats] = useState({ adsBlocked: 0, trackersBlocked: 0 });

  const activeTab = useMemo(() => tabs.find((t) => t.isActive), [tabs]);
  const activeTabId = activeTab?.id ?? tabs[0]?.id ?? 0;

  const webviewRefs = useRef<Map<number, HTMLElement>>(new Map());
  const navbarRef = useRef<NavbarHandle>(null);
  const closedTabsRef = useRef<Tab[]>([]);

  // ─── Auto-focus URL bar on new/empty tabs ───
  useEffect(() => {
    if (!activeTab?.url) {
      // Small delay to ensure the input is rendered
      const id = setTimeout(() => navbarRef.current?.focusUrlBar(), 50);
      return () => clearTimeout(id);
    }
  }, [activeTab?.id, activeTab?.url]);

  // ─── Fetch permissions when active tab changes ───
  useEffect(() => {
    if (!activeTab?.url) {
      setPermissions({});
      return;
    }
    const origin = getOrigin(activeTab.url);
    if (!origin || origin === "null") {
      setPermissions({});
      return;
    }
    window.electronAPI?.getPermissions(origin).then((perms) => {
      setPermissions(perms);
    }).catch(() => setPermissions({}));
  }, [activeTab?.url]);

  // ─── Adblock stats ───
  useEffect(() => {
    window.electronAPI?.getAdblockStats().then((s) => {
      setAdblockStats(s);
    }).catch(() => { /* ignore init error */ });

    const unsubscribe = window.electronAPI?.onAdblockStatsUpdate((stats) => {
      setAdblockStats(stats);
    });

    return () => {
      unsubscribe?.();
    };
  }, []);

  const handleNewTab = useCallback(() => {
    const id = nextTabId++;
    setTabs((prev) => [
      ...prev.map((t) => ({ ...t, isActive: false })),
      { id, title: "Nueva pestaña", url: "", isActive: true },
    ]);
  }, []);

  const handleTabClick = useCallback((id: number) => {
    setTabs((prev) => prev.map((t) => ({ ...t, isActive: t.id === id })));
  }, []);

  const handleTabClose = useCallback((id: number) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      const tabToClose = prev[idx];
      if (tabToClose) {
        closedTabsRef.current.unshift({ ...tabToClose });
        if (closedTabsRef.current.length > 10) {
          closedTabsRef.current.pop();
        }
      }
      const remaining = prev.filter((t) => t.id !== id);
      if (remaining.length === 0) {
        const newTab: Tab = { id: nextTabId++, title: "Nueva pestaña", url: "", isActive: true };
        return [newTab];
      }
      const closedWasActive = prev[idx]?.isActive;
      if (closedWasActive) {
        const newActiveIdx = Math.max(0, idx - 1);
        return remaining.map((t, i) => ({ ...t, isActive: i === newActiveIdx }));
      }
      return remaining;
    });
    setLoadingTabs((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const handleReopenTab = useCallback(() => {
    const closed = closedTabsRef.current.shift();
    if (!closed) return;
    const restoredId = nextTabId++;
    const restoredTab: Tab = { ...closed, id: restoredId, isActive: true };
    setTabs((prev) => [
      ...prev.map((t) => ({ ...t, isActive: false })),
      restoredTab,
    ]);
  }, []);

  const handleNavigate = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    const url = isUrlLike(trimmed) ? normalizeUrl(trimmed) : buildSearchUrl(engine, trimmed);
    const title = isUrlLike(trimmed) ? trimmed : `${trimmed} — ${engine.name}`;

    setTabs((prev) =>
      prev.map((t) => (t.isActive ? { ...t, url, title, canGoBack: false, canGoForward: false } : t))
    );
  }, [engine]);

  const getActiveWebview = useCallback(() => {
    if (!activeTab) return null;
    return webviewRefs.current.get(activeTab.id) || null;
  }, [activeTab]);

  const handleGoBack = useCallback(() => {
    const wv = getActiveWebview();
    if (wv && "goBack" in wv) {
      const canGo = (wv as any).canGoBack?.() ?? false;
      if (canGo) {
        (wv as any).goBack();
      } else {
        // No history in webview → go back to home
        setTabs((prev) =>
          prev.map((t) =>
            t.isActive
              ? { ...t, url: "", title: "Nueva pestaña", canGoBack: false, canGoForward: false }
              : t
          )
        );
      }
    }
  }, [getActiveWebview]);

  const handleGoForward = useCallback(() => {
    const wv = getActiveWebview();
    if (wv && "goForward" in wv) {
      (wv as any).goForward();
    }
  }, [getActiveWebview]);

  const handleReload = useCallback(() => {
    const wv = getActiveWebview();
    if (wv && "reload" in wv) {
      (wv as any).reload();
    }
  }, [getActiveWebview]);

  // Webview callbacks
  const handleDidNavigate = useCallback((tabId: number, url: string) => {
    setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, url } : t)));
  }, []);

  const handlePageTitleUpdated = useCallback((tabId: number, title: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, title: title || t.title } : t))
    );
  }, []);

  const handleUpdateNavigationState = useCallback(
    (tabId: number, canGoBack: boolean, canGoForward: boolean) => {
      setTabs((prev) =>
        prev.map((t) => (t.id === tabId ? { ...t, canGoBack, canGoForward } : t))
      );
    },
    []
  );

  const handleLoadingState = useCallback((tabId: number, isLoading: boolean) => {
    setLoadingTabs((prev) => {
      const next = new Set(prev);
      if (isLoading) next.add(tabId);
      else next.delete(tabId);
      return next;
    });
  }, []);

  const registerWebview = useCallback((tabId: number, el: HTMLElement | null) => {
    if (el) {
      webviewRefs.current.set(tabId, el);
    } else {
      webviewRefs.current.delete(tabId);
    }
  }, []);

  const webviewCallbacks = useMemo(
    () => ({
      onDidNavigate: handleDidNavigate,
      onPageTitleUpdated: handlePageTitleUpdated,
      onUpdateNavigationState: handleUpdateNavigationState,
      onLoadingState: handleLoadingState,
    }),
    [handleDidNavigate, handlePageTitleUpdated, handleUpdateNavigationState, handleLoadingState]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        setNavbarVisible((v) => !v);
      }
      if (e.ctrlKey && e.key.toLowerCase() === "t") {
        e.preventDefault();
        handleNewTab();
      }
      if (e.ctrlKey && e.key.toLowerCase() === "w") {
        e.preventDefault();
        if (activeTabId) handleTabClose(activeTabId);
      }
      if (e.ctrlKey && e.key.toLowerCase() === "r") {
        e.preventDefault();
        handleReload();
      }
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "t") {
        e.preventDefault();
        handleReopenTab();
      }
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        handleGoBack();
      }
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        handleGoForward();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeTabId, handleTabClose, handleReload, handleGoBack, handleGoForward, handleNewTab, handleReopenTab]);

  const isSecure = activeTab?.url ? activeTab.url.startsWith("https://") : true;
  const isLoading = activeTabId ? loadingTabs.has(activeTabId) : false;

  const handleClearPermissions = useCallback(async () => {
    if (!activeTab?.url) return;
    const origin = getOrigin(activeTab.url);
    if (!origin || origin === "null") return;
    await window.electronAPI?.clearPermissions(origin);
    setPermissions({});
  }, [activeTab?.url]);

  const handleResetAdblockStats = useCallback(async () => {
    const result = await window.electronAPI?.resetAdblockStats();
    if (result) setAdblockStats(result);
  }, []);

  return (
    <div className="app">
      {showOnboarding && (
        <SearchEnginePicker
          onSelect={(selected) => {
            setEngine(selected);
            setShowOnboarding(false);
          }}
        />
      )}

      <Tabs
        tabs={tabs}
        activeTabId={activeTabId}
        onTabClick={handleTabClick}
        onTabClose={handleTabClose}
        onNewTab={handleNewTab}
      />

      {view === "browser" ? (
        <>
          <div
            className={`navbar-wrapper ${navbarVisible ? "visible" : "hidden"}`}
            onMouseEnter={() => setNavbarVisible(true)}
          >
            <Navbar
              ref={navbarRef}
              url={activeTab?.url ?? ""}
              isSecure={isSecure}
              canGoBack={activeTab?.canGoBack ?? false}
              canGoForward={activeTab?.canGoForward ?? false}
              isLoading={isLoading}
              permissions={permissions}
              adblockStats={adblockStats}
              onGoBack={handleGoBack}
              onGoForward={handleGoForward}
              onReload={handleReload}
              onNavigate={handleNavigate}
              onOpenSettings={() => setView("settings")}
              onClearPermissions={handleClearPermissions}
              onResetAdblockStats={handleResetAdblockStats}
            />
          </div>
          <Content
            tabs={tabs}
            activeTabId={activeTabId}
            callbacks={webviewCallbacks}
            registerWebview={registerWebview}
          />
        </>
      ) : (
        <SettingsPage
          currentEngine={engine}
          onChangeEngine={setEngine}
          onBack={() => setView("browser")}
        />
      )}
    </div>
  );
}
