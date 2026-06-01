import React from "react";
import PopupPortal from "./PopupPortal";

const PERMISSION_LABELS: Record<string, string> = {
  media: "Micrófono y cámara",
  geolocation: "Ubicación",
  notifications: "Notificaciones",
  midi: "MIDI",
  midiSysex: "MIDI SysEx",
  pointerLock: "Bloqueo de puntero",
  fullscreen: "Pantalla completa",
  openExternal: "Abrir enlaces externos",
};

interface SecurityPopupProps {
  url: string;
  isSecure: boolean;
  permissions: Record<string, "granted" | "denied">;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  onClearPermissions: () => void;
}

export default function SecurityPopup({
  url,
  isSecure,
  permissions,
  anchorRef,
  onClose,
  onClearPermissions,
}: SecurityPopupProps) {
  const domain = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return url || "Nueva pestaña";
    }
  })();

  const permissionEntries = Object.entries(permissions);

  return (
    <PopupPortal anchorRef={anchorRef} onClose={onClose} width={280}>
      <div className={`security-popup-header ${isSecure ? "secure" : "insecure"}`}>
        <span className="security-popup-icon">
          {isSecure ? (
            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM5 8h6a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/>
            </svg>
          )}
        </span>
        <div>
          <div className="security-popup-title">
            {isSecure ? "Conexión segura" : "Conexión no segura"}
          </div>
          <div className="security-popup-domain">{domain}</div>
        </div>
      </div>

      <div className="security-popup-section">
        <div className="security-popup-label">Certificado</div>
        <div className="security-popup-cert">
          {isSecure
            ? "El sitio cuenta con un certificado SSL válido. La información que envíes está encriptada."
            : "Tu conexión con este sitio no está encriptada. No introduzcas datos sensibles."}
        </div>
      </div>

      {permissionEntries.length > 0 && (
        <div className="security-popup-section">
          <div className="security-popup-label">Permisos del sitio</div>
          <ul className="security-popup-perms">
            {permissionEntries.map(([perm, decision]) => (
              <li key={perm} className={`security-popup-perm ${decision}`}>
                <span className="security-popup-perm-dot" />
                <span className="security-popup-perm-name">
                  {PERMISSION_LABELS[perm] ?? perm}
                </span>
                <span className="security-popup-perm-status">
                  {decision === "granted" ? "Permitido" : "Bloqueado"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {permissionEntries.length > 0 && (
        <button
          className="security-popup-clear"
          onClick={() => {
            onClearPermissions();
            onClose();
          }}
        >
          Restablecer permisos
        </button>
      )}
    </PopupPortal>
  );
}
