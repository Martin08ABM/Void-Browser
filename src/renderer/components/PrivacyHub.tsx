import React from "react";
import PopupPortal from "./PopupPortal";
import { usePrivacyHub, PrivacyProvider } from "../hooks/usePrivacyHub";

interface PrivacyHubProps {
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  onOpenUrl: (url: string) => void;
}

export default function PrivacyHub({ anchorRef, onClose, onOpenUrl }: PrivacyHubProps) {
  const { accounts, connect, disconnect, isConnected, PROVIDER_META } = usePrivacyHub();

  const providers = Object.keys(PROVIDER_META) as PrivacyProvider[];

  const handleConnect = (provider: PrivacyProvider) => {
    connect(provider);
    onOpenUrl(PROVIDER_META[provider].loginUrl);
  };

  const handleServiceClick = (url: string) => {
    onOpenUrl(url);
    onClose();
  };

  return (
    <PopupPortal anchorRef={anchorRef} onClose={onClose} width={300}>
      <div className="privacy-hub-header">
        <span className="privacy-hub-icon">
          <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
          </svg>
        </span>
        <div>
          <div className="privacy-hub-title">Privacy Hub</div>
          <div className="privacy-hub-subtitle">Tus servicios de privacidad</div>
        </div>
      </div>

      <div className="privacy-hub-list">
        {providers.map((provider) => {
          const meta = PROVIDER_META[provider];
          const connected = isConnected(provider);
          return (
            <div
              key={provider}
              className={`privacy-hub-provider${connected ? " connected" : ""}`}
              onClick={() => {
                if (!connected) handleConnect(provider);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (!connected && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  handleConnect(provider);
                }
              }}
            >
              <div className="privacy-hub-provider-header">
                <div className="privacy-hub-provider-info">
                  <span
                    className="privacy-hub-provider-dot"
                    style={{ backgroundColor: meta.color }}
                  />
                  <span className="privacy-hub-provider-name">{meta.name}</span>
                </div>
                {connected ? (
                  <button
                    className="privacy-hub-provider-action disconnect"
                    onClick={(e) => {
                      e.stopPropagation();
                      disconnect(provider);
                    }}
                    title="Desconectar"
                  >
                    Desconectar
                  </button>
                ) : (
                  <button
                    className="privacy-hub-provider-action connect"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConnect(provider);
                    }}
                  >
                    Conectar
                  </button>
                )}
              </div>

              {connected && (
                <div className="privacy-hub-services">
                  {meta.services.map((svc) => (
                    <button
                      key={svc.name}
                      className="privacy-hub-service"
                      onClick={() => handleServiceClick(svc.url)}
                      title={svc.url}
                    >
                      {svc.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {accounts.length === 0 && (
        <p className="privacy-hub-empty">
          Conecta tus cuentas de privacidad para acceder rápidamente a tus servicios.
        </p>
      )}
    </PopupPortal>
  );
}
