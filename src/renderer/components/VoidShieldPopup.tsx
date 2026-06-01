import React from "react";
import PopupPortal from "./PopupPortal";

interface VoidShieldPopupProps {
  stats: { adsBlocked: number; trackersBlocked: number };
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  onReset: () => void;
}

export default function VoidShieldPopup({
  stats,
  anchorRef,
  onClose,
  onReset,
}: VoidShieldPopupProps) {
  const enabled = true;

  return (
    <PopupPortal anchorRef={anchorRef} onClose={onClose} width={260}>
      <div className="voidshield-popup-header">
        <span className="voidshield-popup-icon">
          <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            <path d="M11 5.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-1zm-3 0a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-1zm-3 0a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-1z"/>
          </svg>
        </span>
        <div>
          <div className="voidshield-popup-title">VoidShield</div>
          <div className="voidshield-popup-subtitle">Protección de privacidad</div>
        </div>
      </div>

      <div className="voidshield-popup-stats">
        <div className="voidshield-stat">
          <span className="voidshield-stat-value">{stats.adsBlocked}</span>
          <span className="voidshield-stat-label">Anuncios bloqueados</span>
        </div>
        <div className="voidshield-stat">
          <span className="voidshield-stat-value">{stats.trackersBlocked}</span>
          <span className="voidshield-stat-label">Rastreadores bloqueados</span>
        </div>
      </div>

      <div className="voidshield-popup-section">
        <div className="voidshield-popup-label">Estado</div>
        <div className={`voidshield-status ${enabled ? "active" : "inactive"}`}>
          <span className="voidshield-status-dot" />
          {enabled ? "Protección activa" : "Protección desactivada"}
        </div>
      </div>

      <div className="voidshield-popup-actions">
        <button
          className="voidshield-popup-reset"
          onClick={() => {
            onReset();
          }}
        >
          Restablecer contadores
        </button>
      </div>
    </PopupPortal>
  );
}
