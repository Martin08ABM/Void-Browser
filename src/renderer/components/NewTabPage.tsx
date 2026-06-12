import React, { useMemo, useState, useRef, useEffect } from "react";
import { HistoryEntry } from "../hooks/useHistory";
import { usePrivacyHub, PrivacyProvider } from "../hooks/usePrivacyHub";

import "../styles/NewTabPage.css";

interface NewTabPageProps {
  history: HistoryEntry[];
  onNavigate: (url: string) => void;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function getFaviconForUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch {
    return "";
  }
}

interface TopSite {
  url: string;
  title: string;
  domain: string;
  count: number;
  favicon: string;
}

function computeRecentSites(history: HistoryEntry[]): TopSite[] {
  const seen = new Set<string>();
  const sites: TopSite[] = [];
  for (const entry of history) {
    const domain = getDomain(entry.url);
    if (!domain || seen.has(domain)) continue;
    seen.add(domain);
    sites.push({
      url: entry.url,
      title: entry.title || domain,
      domain,
      count: 1,
      favicon: getFaviconForUrl(entry.url),
    });
    if (sites.length >= 5) break;
  }
  return sites;
}

export default function NewTabPage({ history, onNavigate }: NewTabPageProps) {
  const recentSites = useMemo(() => computeRecentSites(history), [history]);
  const [query, setQuery] = useState("");
  const [expandedProvider, setExpandedProvider] = useState<PrivacyProvider | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { connect, disconnect, isConnected, PROVIDER_META } = usePrivacyHub();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onNavigate(query.trim());
    }
  };

  const handleConnect = (provider: PrivacyProvider) => {
    connect(provider);
    onNavigate(PROVIDER_META[provider].loginUrl);
  };

  const providers = Object.keys(PROVIDER_META) as PrivacyProvider[];

  return (
    <div className="new-tab-page">
      <div className="new-tab-content">
        <h1 className="new-tab-logo">Void Browser</h1>

        <form className="new-tab-search" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            className="new-tab-search-input"
            placeholder="Busca o escribe una URL"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            spellCheck={false}
          />
        </form>

        {/* Privacy Hub — visible en pantalla principal */}
        <div className="new-tab-section">
          <div className="new-tab-section-header">
            <span className="new-tab-section-icon">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
              </svg>
            </span>
            <h2 className="new-tab-section-title">Privacy Hub</h2>
          </div>

          <div className="privacy-hub-dashboard">
            {providers.map((provider) => {
              const meta = PROVIDER_META[provider];
              const connected = isConnected(provider);
              const isOpen = expandedProvider === provider;
              return (
                <div
                  key={provider}
                  className={`privacy-hub-card${connected ? " connected" : ""}${isOpen ? " open" : ""}`}
                  onClick={() => onNavigate(meta.homeUrl)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onNavigate(meta.homeUrl);
                    }
                  }}
                >
                  <div className="privacy-hub-card-glow" style={{ backgroundColor: meta.color }} />

                  <div className="privacy-hub-card-header">
                    <div className="privacy-hub-card-info">
                      <span
                        className="privacy-hub-card-dot"
                        style={{ backgroundColor: meta.color }}
                      />
                      <span className="privacy-hub-card-name">{meta.name}</span>
                      {connected && (
                        <span className="privacy-hub-card-badge" style={{ color: meta.color }}>
                          ●
                        </span>
                      )}
                    </div>
                    {connected ? (
                      <button
                        className="privacy-hub-card-action small"
                        onClick={(e) => {
                          e.stopPropagation();
                          disconnect(provider);
                        }}
                        title="Desconectar"
                      >
                        ✕
                      </button>
                    ) : (
                      <button
                        className="privacy-hub-card-action connect small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConnect(provider);
                        }}
                      >
                        Conectar
                      </button>
                    )}
                  </div>

                  {connected ? (
                    <>
                      <button
                        className="privacy-hub-card-toggle"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedProvider(isOpen ? null : provider);
                        }}
                        title={isOpen ? "Ocultar servicios" : "Ver servicios"}
                      >
                        <span className="privacy-hub-card-toggle-label">
                          {isOpen ? "Ocultar servicios" : `Servicios (${meta.services.length})`}
                        </span>
                        <svg
                          className={`privacy-hub-card-toggle-arrow${isOpen ? " open" : ""}`}
                          width="14"
                          height="14"
                          viewBox="0 0 16 16"
                          fill="currentColor"
                        >
                          <path d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z" />
                        </svg>
                      </button>

                      <div className={`privacy-hub-card-dropdown${isOpen ? " open" : ""}`}>
                        <div className="privacy-hub-card-dropdown-inner">
                          <div className="privacy-hub-card-services">
                            {meta.services.map((svc) => (
                              <button
                                key={svc.name}
                                className="privacy-hub-card-service"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onNavigate(svc.url);
                                }}
                                title={svc.url}
                                style={{ "--provider-color": meta.color } as React.CSSProperties}
                              >
                                {svc.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="privacy-hub-card-hint">
                      Conecta tu cuenta de {meta.name} para acceder rápidamente a tus servicios.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {recentSites.length > 0 && (
          <div className="new-tab-section">
            <div className="new-tab-section-header">
              <span className="new-tab-section-icon">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8.186 1.113a.5.5 0 0 0-.372 0L1.846 3.5l6.347 2.806L14.746 3.5 8.186 1.113zM15 4.976v4.983l-5.933 2.62v-4.92l5.933-2.683zm-6.933 7.603v4.92L2.067 14.876V9.993l6 2.586zM2.067 8.993 8 6.407l5.933 2.586L8 11.58 2.067 8.993z"/>
                </svg>
              </span>
              <h2 className="new-tab-section-title">Sitios vistos recientemente</h2>
            </div>
            <div className="new-tab-grid">
              {recentSites.map((site) => (
                <button
                  key={site.domain}
                  className="new-tab-tile"
                  onClick={() => onNavigate(site.url)}
                  title={site.domain}
                >
                  <div className="new-tab-tile-icon">
                    {site.favicon ? (
                      <img src={site.favicon} alt="" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                      <span className="new-tab-tile-letter">{site.domain.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <span className="new-tab-tile-title">{site.title}</span>
                  <span className="new-tab-tile-domain">{site.domain}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
