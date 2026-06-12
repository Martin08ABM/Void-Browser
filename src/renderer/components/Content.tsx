import React, { useEffect, useRef } from "react";
import { Tab } from "../types";
import { HistoryEntry } from "../hooks/useHistory";
import NewTabPage from "./NewTabPage";

import "../styles/Content.css";

export interface WebviewCallbacks {
  onDidNavigate: (tabId: number, url: string) => void;
  onPageTitleUpdated: (tabId: number, title: string) => void;
  onUpdateNavigationState: (tabId: number, canGoBack: boolean, canGoForward: boolean) => void;
  onLoadingState: (tabId: number, isLoading: boolean) => void;
  onFaviconUpdated: (tabId: number, faviconUrl: string) => void;
  onAudioStateChanged: (tabId: number, isPlaying: boolean) => void;
}

interface ContentProps {
  tabs: Tab[];
  activeTabId: number;
  callbacks: WebviewCallbacks;
  registerWebview: (tabId: number, el: HTMLElement | null) => void;
  history: HistoryEntry[];
  onNavigate: (url: string) => void;
  userAgent: string;
}

function WebViewWrapper({
  tab,
  isActive,
  callbacks,
  registerWebview,
  userAgent,
}: {
  tab: Tab;
  isActive: boolean;
  callbacks: WebviewCallbacks;
  registerWebview: (tabId: number, el: HTMLElement | null) => void;
  userAgent: string;
}) {
  const wvRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const wv = wvRef.current;
    if (!wv) return;

    registerWebview(tab.id, wv);

    const handleNavigate = (e: any) => {
      callbacks.onDidNavigate(tab.id, e.url as string);
    };
    const handleTitle = (e: any) => {
      callbacks.onPageTitleUpdated(tab.id, e.title as string);
    };
    const handleState = () => {
      const back = (wv as any).canGoBack?.() ?? false;
      const forward = (wv as any).canGoForward?.() ?? false;
      callbacks.onUpdateNavigationState(tab.id, back, forward);
    };

    const handleStartLoading = () => {
      callbacks.onLoadingState(tab.id, true);
    };

    const handleStopLoading = () => {
      callbacks.onLoadingState(tab.id, false);
      handleState();
    };

    const handleFailLoad = (e: any) => {
      const ignoredCodes = [-3, -2];
      const ignoredDescs = ["ERR_ABORTED", "ERR_FAILED"];
      if (ignoredCodes.includes(e.errorCode) || ignoredDescs.includes(e.errorDescription)) {
        callbacks.onLoadingState(tab.id, false);
        return;
      }
      callbacks.onLoadingState(tab.id, false);
      // eslint-disable-next-line no-console
      console.warn("webview did-fail-load:", e.errorDescription, e.validatedURL);
    };

    const handleFavicon = (e: any) => {
      const urls = e.favicons as string[];
      if (urls && urls.length > 0) {
        callbacks.onFaviconUpdated(tab.id, urls[0]);
      }
    };

    const handleMediaStarted = () => {
      callbacks.onAudioStateChanged(tab.id, true);
    };

    const handleMediaStopped = () => {
      callbacks.onAudioStateChanged(tab.id, false);
    };

    wv.addEventListener("did-navigate", handleNavigate);
    wv.addEventListener("did-navigate-in-page", handleNavigate);
    wv.addEventListener("page-title-updated", handleTitle);
    wv.addEventListener("did-stop-loading", handleStopLoading);
    wv.addEventListener("did-start-loading", handleStartLoading);
    wv.addEventListener("did-fail-load", handleFailLoad);
    wv.addEventListener("page-favicon-updated", handleFavicon);
    wv.addEventListener("media-started-playing", handleMediaStarted);
    wv.addEventListener("media-stopped-playing", handleMediaStopped);

    return () => {
      wv.removeEventListener("did-navigate", handleNavigate);
      wv.removeEventListener("did-navigate-in-page", handleNavigate);
      wv.removeEventListener("page-title-updated", handleTitle);
      wv.removeEventListener("did-stop-loading", handleStopLoading);
      wv.removeEventListener("did-start-loading", handleStartLoading);
      wv.removeEventListener("did-fail-load", handleFailLoad);
      wv.removeEventListener("page-favicon-updated", handleFavicon);
      wv.removeEventListener("media-started-playing", handleMediaStarted);
      wv.removeEventListener("media-stopped-playing", handleMediaStopped);
      registerWebview(tab.id, null);
    };
  }, [tab.id, callbacks, registerWebview]);

  // Suspend/resume webviews when tab becomes inactive/active
  useEffect(() => {
    const wv = wvRef.current as any;
    if (!wv) return;

    let cancelled = false;

    const applySuspendState = () => {
      if (cancelled) return;
      const wc = wv.getWebContents?.();
      if (!wc || wc.isDestroyed?.()) {
        setTimeout(applySuspendState, 150);
        return;
      }
      if (isActive) {
        wc.resume?.();
        wv.style.visibility = "visible";
      } else {
        wc.suspend?.();
        wv.style.visibility = "hidden";
      }
    };

    applySuspendState();
    return () => { cancelled = true; };
  }, [isActive]);

  // Keep src in sync when url changes from outside
  useEffect(() => {
    const wv = wvRef.current;
    if (!wv) return;
    const currentSrc = (wv as any).src;
    try {
      const current = new URL(currentSrc).href;
      const next = new URL(tab.url).href;
      if (current !== next) {
        (wv as any).src = tab.url;
      }
    } catch {
      if (currentSrc !== tab.url) {
        (wv as any).src = tab.url;
      }
    }
  }, [tab.url]);

  return (
    <div className={`webview-container ${isActive ? "active" : ""}`}>
      <webview
        ref={wvRef as any}
        src={tab.url}
        allowpopups=""
        partition="persist:main"
        useragent={userAgent}
        webpreferences="contextIsolation=yes,nodeIntegration=no,allowRunningInsecureContent=no"
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}

export default function Content({ tabs, activeTabId, callbacks, registerWebview, history, onNavigate, userAgent }: ContentProps) {
  const activeTab = tabs.find((t) => t.id === activeTabId);

  return (
    <div className="content">
      {tabs.map((tab) =>
        tab.url ? (
          <WebViewWrapper
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeTabId}
            callbacks={callbacks}
            registerWebview={registerWebview}
            userAgent={userAgent}
          />
        ) : null
      )}

      {(!activeTab || !activeTab.url) && (
        <NewTabPage history={history} onNavigate={onNavigate} />
      )}
    </div>
  );
}
