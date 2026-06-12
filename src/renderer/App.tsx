import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from "react";

import { Tab, SearchEngine } from "./types";
import { hasSearchEngine, useSearchEngine } from "./hooks/usePreferences";
import { useHistory } from "./hooks/useHistory";

import Tabs from "./components/Tabs";
import Navbar, { NavbarHandle } from "./components/Navbar";
import Content from "./components/Content";
import SearchEnginePicker from "./components/SearchEnginePicker";
import ContextMenu, { ContextMenuItem } from "./components/ContextMenu";

import "./styles/App.css";
import "./styles/ContextMenu.css";

const SettingsPage = React.lazy(() => import("./components/SettingsPage"));
const HistoryPopup = React.lazy(() => import("./components/HistoryPopup"));

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

let nextTabId = 2;

function isUrlLike(text: string): boolean {
  if (/^https?:\/\//i.test(text)) return true;
  if (/^www\./i.test(text)) return true;
  // Dominios simples como github.com, o con subdominios como mail.google.com
  if (/^[\w-]+(\.[\w-]+)*\.[a-z]{2,}/i.test(text)) return true;
  if (/(\d{1,3}\.){3}\d{1,3}/.test(text)) return true;
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
  const [showHistory, setShowHistory] = useState(false);

  const [tabs, setTabs] = useState<Tab[]>([
    { id: 1, title: "Nueva pestaña", url: "", isActive: true },
  ]);

  const [permissions, setPermissions] = useState<Record<string, "granted" | "denied">>({});
  const [loadingTabs, setLoadingTabs] = useState<Set<number>>(new Set());
  const [adblockStats, setAdblockStats] = useState({ adsBlocked: 0, trackersBlocked: 0 });
  const [showFindBar, setShowFindBar] = useState(false);
  const [findText, setFindText] = useState("");

  const { history, addEntry, clearHistory } = useHistory();

  // User-Agent for webviews — refreshed when leaving settings so new tabs pick up changes
  const [userAgent, setUserAgent] = useState(DEFAULT_USER_AGENT);
  useEffect(() => {
    if (view !== "browser") return;
    window.electronAPI?.getUserAgentString()
      .then((ua) => { if (ua) setUserAgent(ua); })
      .catch(() => { /* keep default */ });
  }, [view]);

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tabId: number } | null>(null);

  const activeTab = useMemo(() => tabs.find((t) => t.isActive), [tabs]);
  const activeTabId = activeTab?.id ?? tabs[0]?.id ?? 0;

  const webviewRefs = useRef<Map<number, HTMLElement>>(new Map());
  const navbarRef = useRef<NavbarHandle>(null);
  const closedTabsRef = useRef<Tab[]>([]);

  // ─── Record history when active tab navigates ───
  useEffect(() => {
    if (activeTab?.url && activeTab.url !== "") {
      addEntry(activeTab.url, activeTab.title);
    }
  }, [activeTab?.url, activeTab?.title, addEntry]);

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

  const handleNewTabWithUrl = useCallback((url: string) => {
    const id = nextTabId++;
    setTabs((prev) => [
      ...prev.map((t) => ({ ...t, isActive: false })),
      { id, title: url, url, isActive: true },
    ]);
  }, []);

  const handleReorderTabs = useCallback((fromIndex: number, toIndex: number) => {
    setTabs((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  const handleCreateIncognito = useCallback(() => {
    window.electronAPI?.createIncognitoWindow();
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

  const handleNextTab = useCallback(() => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.isActive);
      if (idx === -1) return prev;
      const nextIdx = (idx + 1) % prev.length;
      return prev.map((t, i) => ({ ...t, isActive: i === nextIdx }));
    });
  }, []);

  const handlePrevTab = useCallback(() => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.isActive);
      if (idx === -1) return prev;
      const prevIdx = (idx - 1 + prev.length) % prev.length;
      return prev.map((t, i) => ({ ...t, isActive: i === prevIdx }));
    });
  }, []);

  const handleFindInPage = useCallback((text: string) => {
    const wv = getActiveWebview();
    if (wv && "findInPage" in wv) {
      (wv as any).findInPage(text, { forward: true, findNext: true });
    }
  }, [getActiveWebview]);

  const handleStopFind = useCallback((action: "clearSelection" | "keepSelection" | "activateSelection") => {
    const wv = getActiveWebview();
    if (wv && "stopFindInPage" in wv) {
      (wv as any).stopFindInPage(action);
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

  const handleFaviconUpdated = useCallback((tabId: number, faviconUrl: string) => {
    setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, favicon: faviconUrl } : t)));
  }, []);

  const handleAudioStateChanged = useCallback((tabId: number, isPlaying: boolean) => {
    setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, isPlayingAudio: isPlaying } : t)));
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
      onFaviconUpdated: handleFaviconUpdated,
      onAudioStateChanged: handleAudioStateChanged,
    }),
    [handleDidNavigate, handlePageTitleUpdated, handleUpdateNavigationState, handleLoadingState, handleFaviconUpdated, handleAudioStateChanged]
  );

  // Keyboard shortcuts via main process (works even when focus is inside webview)
  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;

    const unsubscribers: (() => void)[] = [];

    unsubscribers.push(api.onShortcut("toggle-history", () => setShowHistory((v) => !v)));
    unsubscribers.push(api.onShortcut("toggle-navbar", () => setNavbarVisible((v) => !v)));
    unsubscribers.push(api.onShortcut("new-tab", handleNewTab));
    unsubscribers.push(
      api.onShortcut("close-tab", () => {
        if (activeTabId) handleTabClose(activeTabId);
      })
    );
    unsubscribers.push(api.onShortcut("reload", handleReload));
    unsubscribers.push(api.onShortcut("reopen-tab", handleReopenTab));
    unsubscribers.push(api.onShortcut("go-back", handleGoBack));
    unsubscribers.push(api.onShortcut("go-forward", handleGoForward));
    unsubscribers.push(api.onShortcut("next-tab", handleNextTab));
    unsubscribers.push(api.onShortcut("prev-tab", handlePrevTab));
    unsubscribers.push(
      api.onShortcut("find-in-page", () => {
        setShowFindBar(true);
        setFindText("");
      })
    );
    unsubscribers.push(
      api.onShortcut("focus-address-bar", () => {
        navbarRef.current?.focusUrlBar();
      })
    );
    unsubscribers.push(
      api.onShortcut("new-incognito", handleCreateIncognito)
    );

    const unsubscribeContextMenu = api.onContextMenuNewTab((url) => {
      handleNewTabWithUrl(url);
    });
    unsubscribers.push(unsubscribeContextMenu);

    return () => {
      unsubscribers.forEach((fn) => fn());
    };
  }, [
    activeTabId,
    handleTabClose,
    handleReload,
    handleGoBack,
    handleGoForward,
    handleNewTab,
    handleReopenTab,
    handleNextTab,
    handlePrevTab,
    handleCreateIncognito,
    handleNewTabWithUrl,
  ]);

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

  const handleTabContextMenu = useCallback((tabId: number, x: number, y: number) => {
    setContextMenu({ x, y, tabId });
  }, []);

  const getContextMenuItems = (tabId: number): ContextMenuItem[] => {
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab) return [];
    return [
      {
        label: "Recargar",
        onClick: () => {
          const wv = webviewRefs.current.get(tabId);
          if (wv && "reload" in wv) (wv as any).reload();
        },
      },
      {
        label: "Duplicar",
        onClick: () => {
          const id = nextTabId++;
          setTabs((prev) => {
            const idx = prev.findIndex((t) => t.id === tabId);
            const newTab: Tab = { ...tab, id, isActive: true };
            const next = prev.map((t) => ({ ...t, isActive: false }));
            next.splice(idx + 1, 0, newTab);
            return next;
          });
        },
      },
      {
        label: "Cerrar",
        onClick: () => handleTabClose(tabId),
      },
      {
        label: "Cerrar otras",
        onClick: () => {
          setTabs((prev) => {
            const kept = prev.find((t) => t.id === tabId);
            return kept ? [{ ...kept, isActive: true }] : prev;
          });
        },
      },
      {
        label: tab.isPlayingAudio ? "Silenciar" : "Silenciar",
        onClick: () => {
          const wv = webviewRefs.current.get(tabId);
          if (wv && "setAudioMuted" in wv) {
            (wv as any).setAudioMuted?.(!(tab as any).isMuted);
          }
        },
      },
    ];
  };

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
        loadingTabs={loadingTabs}
        onTabClick={handleTabClick}
        onTabClose={handleTabClose}
        onNewTab={handleNewTab}
        onTabContextMenu={handleTabContextMenu}
        onReorderTabs={handleReorderTabs}
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
            history={history}
            onNavigate={handleNavigate}
            userAgent={userAgent}
          />

          {showFindBar && (
            <div className="find-bar">
              <input
                autoFocus
                type="text"
                placeholder="Buscar en página..."
                value={findText}
                onChange={(e) => {
                  setFindText(e.target.value);
                  if (e.target.value) handleFindInPage(e.target.value);
                  else handleStopFind("clearSelection");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleFindInPage(findText);
                  }
                  if (e.key === "Escape") {
                    handleStopFind("clearSelection");
                    setShowFindBar(false);
                  }
                }}
              />
              <button
                onClick={() => {
                  handleStopFind("clearSelection");
                  setShowFindBar(false);
                }}
              >
                ✕
              </button>
            </div>
          )}
        </>
      ) : (
        <Suspense fallback={<div className="app-loading">Cargando ajustes…</div>}>
          <SettingsPage
            currentEngine={engine}
            onChangeEngine={setEngine}
            onBack={() => setView("browser")}
          />
        </Suspense>
      )}

      {showHistory && (
        <Suspense fallback={null}>
          <HistoryPopup
            history={history}
            onClose={() => setShowHistory(false)}
            onClear={clearHistory}
            onNavigate={handleNavigate}
          />
        </Suspense>
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems(contextMenu.tabId)}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
