import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react";

import SecurityPopup from "./SecurityPopup";
import VoidShieldPopup from "./VoidShieldPopup";

import "../styles/Navbar.css";
import "../styles/Popups.css";

export interface NavbarHandle {
  focusUrlBar: () => void;
}

interface NavbarProps {
  url: string;
  isSecure: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  isLoading: boolean;
  permissions: Record<string, "granted" | "denied">;
  adblockStats: { adsBlocked: number; trackersBlocked: number };
  onGoBack: () => void;
  onGoForward: () => void;
  onReload: () => void;
  onNavigate: (url: string) => void;
  onOpenSettings: () => void;
  onClearPermissions: () => void;
  onResetAdblockStats: () => void;
}

function Navbar({
  url,
  isSecure,
  canGoBack,
  canGoForward,
  isLoading,
  permissions,
  adblockStats,
  onGoBack,
  onGoForward,
  onReload,
  onNavigate,
  onOpenSettings,
  onClearPermissions,
  onResetAdblockStats,
}: NavbarProps,
ref: React.ForwardedRef<NavbarHandle>
) {
  const [inputValue, setInputValue] = useState(url);
  const [showSecurityPopup, setShowSecurityPopup] = useState(false);
  const [showVoidShieldPopup, setShowVoidShieldPopup] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lockRef = useRef<HTMLSpanElement>(null);
  const voidShieldRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    focusUrlBar: () => {
      inputRef.current?.focus();
      inputRef.current?.select();
    },
  }));

  useEffect(() => {
    setInputValue(url);
  }, [url]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = inputValue.trim();
    if (!value) return;
    onNavigate(value);
  };

  const openSecurity = () => {
    setShowSecurityPopup(true);
    setShowVoidShieldPopup(false);
  };

  const openVoidShield = () => {
    setShowVoidShieldPopup(true);
    setShowSecurityPopup(false);
  };

  return (
    <>
      <div className="navbar">
        <button
          className="navbar-btn"
          onClick={onGoBack}
          disabled={!canGoBack}
          aria-label="Atrás"
          title="Atrás"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
          </svg>
        </button>

        <button
          className="navbar-btn"
          onClick={onGoForward}
          disabled={!canGoForward}
          aria-label="Adelante"
          title="Adelante"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
          </svg>
        </button>

        <button
          className={`navbar-btn ${isLoading ? "loading" : ""}`}
          onClick={onReload}
          aria-label={isLoading ? "Detener" : "Recargar"}
          title={isLoading ? "Detener" : "Recargar"}
        >
          {isLoading ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="navbar-spin">
              <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
              <path d="M11.534 5.5a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41h3.932z"/>
              <path d="M4.466 5.5a.25.25 0 0 1 .192.41L2.692 8.27a.25.25 0 0 1-.384 0L.342 5.91a.25.25 0 0 1 .192-.41h3.932z"/>
              <path d="M8 11.534v3.932a.25.25 0 0 1-.41.192l-2.36-1.966a.25.25 0 0 1 0-.384l2.36-1.966a.25.25 0 0 1 .41.192z"/>
              <path d="M4.466 10.5a.25.25 0 0 1-.192-.41l1.966-2.36a.25.25 0 0 1 .384 0l1.966 2.36a.25.25 0 0 1-.192.41H4.466z"/>
              <path d="M11.534 10.5a.25.25 0 0 1-.192-.41l1.966-2.36a.25.25 0 0 1 .384 0l1.966 2.36a.25.25 0 0 1-.192.41h-3.932z"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
              <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
            </svg>
          )}
        </button>

        <span
          ref={lockRef}
          className={`navbar-lock ${isSecure ? "" : "insecure"}`}
          title={isSecure ? "Conexión segura (HTTPS)" : "Conexión no segura (HTTP)"}
          onClick={openSecurity}
        >
          {isSecure ? (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM5 8h6a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/>
            </svg>
          )}
        </span>

        <form className="navbar-urlbar" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            className="navbar-urlbar-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Busca o escribe una URL"
            spellCheck={false}
          />
        </form>

        <div
          ref={voidShieldRef}
          className="navbar-blocker"
          title="VoidShield"
          onClick={openVoidShield}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            <path d="M11 5.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-1zm-3 0a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-1zm-3 0a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-1z"/>
          </svg>
          <span className="navbar-blocker-label">VoidShield</span>
        </div>

        <button
          className="navbar-btn"
          onClick={onOpenSettings}
          aria-label="Ajustes"
          title="Ajustes"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
            <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319z"/>
          </svg>
        </button>
      </div>

      {showSecurityPopup && (
        <SecurityPopup
          url={url}
          isSecure={isSecure}
          permissions={permissions}
          anchorRef={lockRef}
          onClose={() => setShowSecurityPopup(false)}
          onClearPermissions={onClearPermissions}
        />
      )}

      {showVoidShieldPopup && (
        <VoidShieldPopup
          stats={adblockStats}
          anchorRef={voidShieldRef}
          onClose={() => setShowVoidShieldPopup(false)}
          onReset={onResetAdblockStats}
        />
      )}
    </>
  );
}

export default forwardRef<NavbarHandle, NavbarProps>(Navbar);
