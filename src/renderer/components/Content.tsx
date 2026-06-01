import React, { useEffect, useRef } from "react";
import { Tab } from "../types";

import "../styles/Content.css";

export interface WebviewCallbacks {
  onDidNavigate: (tabId: number, url: string) => void;
  onPageTitleUpdated: (tabId: number, title: string) => void;
  onUpdateNavigationState: (tabId: number, canGoBack: boolean, canGoForward: boolean) => void;
  onLoadingState: (tabId: number, isLoading: boolean) => void;
}

interface ContentProps {
  tabs: Tab[];
  activeTabId: number;
  callbacks: WebviewCallbacks;
  registerWebview: (tabId: number, el: HTMLElement | null) => void;
}

function WebViewWrapper({
  tab,
  callbacks,
  registerWebview,
}: {
  tab: Tab;
  callbacks: WebviewCallbacks;
  registerWebview: (tabId: number, el: HTMLElement | null) => void;
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

    wv.addEventListener("did-navigate", handleNavigate);
    wv.addEventListener("did-navigate-in-page", handleNavigate);
    wv.addEventListener("page-title-updated", handleTitle);
    wv.addEventListener("did-stop-loading", handleStopLoading);
    wv.addEventListener("did-start-loading", handleStartLoading);
    wv.addEventListener("did-fail-load", handleFailLoad);

    return () => {
      wv.removeEventListener("did-navigate", handleNavigate);
      wv.removeEventListener("did-navigate-in-page", handleNavigate);
      wv.removeEventListener("page-title-updated", handleTitle);
      wv.removeEventListener("did-stop-loading", handleStopLoading);
      wv.removeEventListener("did-start-loading", handleStartLoading);
      wv.removeEventListener("did-fail-load", handleFailLoad);
      registerWebview(tab.id, null);
    };
  }, [tab.id, callbacks, registerWebview]);

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
    <div className="webview-container active">
      <webview
        ref={wvRef as any}
        src={tab.url}
        allowpopups=""
        partition="persist:main"
        useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
        webpreferences="contextIsolation=yes,nodeIntegration=no,allowRunningInsecureContent=no"
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}

export default function Content({ tabs, activeTabId, callbacks, registerWebview }: ContentProps) {
  const activeTab = tabs.find((t) => t.id === activeTabId);

  if (!activeTab) {
    return (
      <div className="content">
        <div className="content-empty">
          <p>No hay pestañas abiertas</p>
        </div>
      </div>
    );
  }

  if (!activeTab.url) {
    return (
      <div className="content">
        <div className="content-empty">
          <p className="content-empty-title">Nueva pestaña</p>
          <p className="content-empty-subtitle">Escribe una URL o búsqueda en la barra de direcciones</p>
        </div>
      </div>
    );
  }

  return (
    <div className="content">
      <WebViewWrapper
        key={activeTab.id}
        tab={activeTab}
        callbacks={callbacks}
        registerWebview={registerWebview}
      />
    </div>
  );
}
