import React, { useState } from "react";
import { SearchEngine } from "../types";
import { useHistorySettings } from "../hooks/usePreferences";
import { usePrivacy } from "../hooks/usePrivacy";
import { useSitePermissions } from "../hooks/useSitePermissions";
import { useAdblockConfig } from "../hooks/useAdblockConfig";
import SearchEnginePicker from "./SearchEnginePicker";
import UserscriptManager from "./UserscriptManager";

import "../styles/SettingsPage.css";

interface SettingsPageProps {
  currentEngine: SearchEngine;
  onChangeEngine: (engine: SearchEngine) => void;
  onBack: () => void;
}

const RETENTION_OPTIONS = [
  { value: 0, label: "Nunca" },
  { value: 7, label: "7 días" },
  { value: 30, label: "30 días" },
  { value: 90, label: "90 días" },
  { value: 365, label: "1 año" },
];

const UA_OPTIONS = [
  { value: "default", label: "Predeterminado (Chrome · Windows)" },
  { value: "chrome-mac", label: "Chrome · macOS" },
  { value: "chrome-linux", label: "Chrome · Linux" },
  { value: "edge-windows", label: "Edge · Windows" },
  { value: "firefox-windows", label: "Firefox · Windows" },
  { value: "safari-mac", label: "Safari · macOS" },
  { value: "android-chrome", label: "Chrome · Android" },
  { value: "ios-safari", label: "Safari · iPhone" },
  { value: "custom", label: "Personalizado" },
];

const DOH_OPTIONS = [
  { value: "quad9", label: "Quad9" },
  { value: "cloudflare", label: "Cloudflare" },
  { value: "google", label: "Google" },
  { value: "adguard", label: "AdGuard" },
  { value: "opendns", label: "OpenDNS" },
  { value: "custom", label: "Personalizado" },
];

function PermissionBadge({ type, decision }: { type: string; decision: "granted" | "denied" }) {
  return (
    <span className={`permission-badge ${decision}`}>
      {type}
    </span>
  );
}

function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return "Nunca";
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "Hace un momento";
  if (minutes < 60) return `Hace ${minutes} min`;
  if (hours < 24) return `Hace ${hours} h`;
  if (days < 30) return `Hace ${days} d`;
  return new Date(timestamp).toLocaleDateString();
}

export default function SettingsPage({ currentEngine, onChangeEngine, onBack }: SettingsPageProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [showUserscripts, setShowUserscripts] = useState(false);
  const { enabled, setEnabled, retentionDays, setRetentionDays } = useHistorySettings();
  const { config, updateDoH, updateDNT, updateCookies, updateUserAgent } = usePrivacy();
  const { sites, loading: sitesLoading, clearAll, clearSite } = useSitePermissions();
  const {
    status,
    updateNow,
    addCustomList,
    removeCustomList,
    setYtAdblock,
  } = useAdblockConfig();

  const [customUrl, setCustomUrl] = useState("");
  const [adding, setAdding] = useState(false);

  const dohEnabled = config.doh.enabled;
  const dohProvider = config.doh.provider;
  const dohCustomUrl = config.doh.customUrl;
  const dntEnabled = config.dnt.enabled;
  const cookies = config.cookies;
  const userAgent = config.userAgent ?? { preset: "default", customUA: "" };

  const handleAddCustomList = async () => {
    if (!customUrl.trim() || adding) return;
    setAdding(true);
    const ok = await addCustomList(customUrl.trim());
    if (ok) setCustomUrl("");
    setAdding(false);
  };

  if (showUserscripts) {
    return <UserscriptManager onBack={() => setShowUserscripts(false)} />;
  }

  return (
    <div className="settings-page">
      <div className="settings-page-header">
        <button className="settings-page-back" onClick={onBack} aria-label="Volver">
          <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
            <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
          </svg>
        </button>
        <h1 className="settings-page-title">Ajustes</h1>
      </div>

      <div className="settings-page-content">
        {/* Motor de búsqueda */}
        <section className="settings-section">
          <h3 className="settings-section-title">Motor de búsqueda</h3>
          <div className="settings-row">
            <span className="settings-current-engine">{currentEngine.name}</span>
            <button className="settings-change-btn" onClick={() => setShowPicker(true)}>
              Cambiar
            </button>
          </div>
        </section>

        {/* VoidShield */}
        <section className="settings-section">
          <h3 className="settings-section-title">VoidShield</h3>
          <p className="settings-label-sub" style={{ marginBottom: 12 }}>
            Bloqueador de anuncios y rastreadores integrado
          </p>

          <div className="settings-row">
            <div className="settings-label-group">
              <span className="settings-label">Listas activas</span>
              <span className="settings-label-sub">{status.listCount} listas de filtros cargadas</span>
            </div>
            <span className="voidshield-stat">{status.adsBlocked + status.trackersBlocked} bloqueados</span>
          </div>

          <div className="settings-row" style={{ marginTop: 10 }}>
            <div className="settings-label-group">
              <span className="settings-label">Última actualización</span>
              <span className="settings-label-sub">{formatRelativeTime(status.lastUpdated)}</span>
            </div>
            <button
              className="settings-change-btn"
              onClick={updateNow}
              disabled={status.isUpdating}
            >
              {status.isUpdating ? "Actualizando…" : "Actualizar ahora"}
            </button>
          </div>

          <div className="settings-row" style={{ marginTop: 10 }}>
            <div className="settings-label-group">
              <span className="settings-label">Bloquear anuncios de YouTube</span>
              <span className="settings-label-sub">
                Salta automáticamente los anuncios de video (pre-roll y mid-roll). Recarga la pestaña para aplicar.
              </span>
            </div>
            <button
              className={`settings-toggle ${status.ytAdblockEnabled ? "on" : ""}`}
              onClick={() => setYtAdblock(!status.ytAdblockEnabled)}
              aria-label={status.ytAdblockEnabled ? "Desactivar bloqueo de anuncios de YouTube" : "Activar bloqueo de anuncios de YouTube"}
            >
              <span className="settings-toggle-thumb" />
            </button>
          </div>

          {/* Listas personalizadas */}
          <div className="voidshield-custom-section">
            <h4 className="voidshield-subtitle">Listas personalizadas</h4>
            {status.customLists.length === 0 ? (
              <p className="settings-empty-text">No tienes listas personalizadas.</p>
            ) : (
              <div className="voidshield-custom-list">
                {status.customLists.map((url) => (
                  <div key={url} className="voidshield-custom-item">
                    <span className="voidshield-custom-url" title={url}>{url}</span>
                    <button
                      className="permission-item-clear"
                      onClick={() => removeCustomList(url)}
                      aria-label={`Eliminar ${url}`}
                      title="Eliminar"
                    >
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="voidshield-add-row">
              <input
                type="text"
                className="settings-input voidshield-input"
                placeholder="https://ejemplo.com/filtros.txt"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddCustomList();
                }}
                spellCheck={false}
              />
              <button
                className="settings-change-btn"
                onClick={handleAddCustomList}
                disabled={adding || !customUrl.trim()}
              >
                {adding ? "Agregando…" : "Agregar"}
              </button>
            </div>
          </div>
        </section>

        {/* Historial */}
        <section className="settings-section">
          <h3 className="settings-section-title">Historial</h3>
          <div className="settings-row">
            <span className="settings-label">Guardar historial de navegación</span>
            <button
              className={`settings-toggle ${enabled ? "on" : ""}`}
              onClick={() => setEnabled(!enabled)}
              aria-label={enabled ? "Desactivar historial" : "Activar historial"}
            >
              <span className="settings-toggle-thumb" />
            </button>
          </div>
          {enabled && (
            <div className="settings-row settings-row--indented">
              <span className="settings-label">Eliminar entradas antiguas</span>
              <select
                className="settings-select"
                value={retentionDays}
                onChange={(e) => setRetentionDays(Number(e.target.value))}
              >
                {RETENTION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}
        </section>

        {/* DNS over HTTPS */}
        <section className="settings-section">
          <h3 className="settings-section-title">DNS sobre HTTPS (DoH)</h3>
          <div className="settings-row">
            <span className="settings-label">Activar DoH</span>
            <button
              className={`settings-toggle ${dohEnabled ? "on" : ""}`}
              onClick={() => updateDoH({ enabled: !dohEnabled, provider: dohProvider, customUrl: dohCustomUrl })}
              aria-label={dohEnabled ? "Desactivar DoH" : "Activar DoH"}
            >
              <span className="settings-toggle-thumb" />
            </button>
          </div>
          {dohEnabled && (
            <>
              <div className="settings-row settings-row--indented">
                <span className="settings-label">Proveedor</span>
                <select
                  className="settings-select"
                  value={dohProvider}
                  onChange={(e) => updateDoH({ enabled: true, provider: e.target.value, customUrl: dohCustomUrl })}
                >
                  {DOH_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              {dohProvider === "custom" && (
                <div className="settings-row settings-row--indented">
                  <span className="settings-label">URL personalizada</span>
                  <input
                    type="text"
                    className="settings-input"
                    value={dohCustomUrl}
                    onChange={(e) => updateDoH({ enabled: true, provider: "custom", customUrl: e.target.value })}
                    placeholder="https://…/dns-query"
                    spellCheck={false}
                  />
                </div>
              )}
            </>
          )}
        </section>

        {/* Do Not Track */}
        <section className="settings-section">
          <h3 className="settings-section-title">Privacidad</h3>
          <div className="settings-row">
            <div className="settings-label-group">
              <span className="settings-label">No rastrear (Do Not Track)</span>
              <span className="settings-label-sub">Envía la señal DNT y GPC en cada petición</span>
            </div>
            <button
              className={`settings-toggle ${dntEnabled ? "on" : ""}`}
              onClick={() => updateDNT({ enabled: !dntEnabled })}
              aria-label={dntEnabled ? "Desactivar DNT" : "Activar DNT"}
            >
              <span className="settings-toggle-thumb" />
            </button>
          </div>
        </section>

        {/* User-Agent */}
        <section className="settings-section">
          <h3 className="settings-section-title">Identidad del navegador (User-Agent)</h3>
          <div className="settings-row">
            <div className="settings-label-group">
              <span className="settings-label">Identificarse como</span>
              <span className="settings-label-sub">
                Cambia el User-Agent y las cabeceras sec-ch-ua que se envían a los sitios
              </span>
            </div>
            <select
              className="settings-select"
              value={userAgent.preset}
              onChange={(e) => updateUserAgent({ preset: e.target.value, customUA: userAgent.customUA })}
            >
              {UA_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          {userAgent.preset === "custom" && (
            <div className="settings-row settings-row--indented">
              <span className="settings-label">User-Agent personalizado</span>
              <input
                type="text"
                className="settings-input"
                value={userAgent.customUA}
                onChange={(e) => updateUserAgent({ preset: "custom", customUA: e.target.value })}
                placeholder="Mozilla/5.0 (…)"
                spellCheck={false}
              />
            </div>
          )}
          <p className="settings-label-sub" style={{ marginTop: 8 }}>
            Los cambios se aplican a las pestañas nuevas y al recargar las existentes.
          </p>
        </section>

        {/* Cookies */}
        <section className="settings-section">
          <h3 className="settings-section-title">Cookies y datos</h3>
          <div className="settings-row">
            <div className="settings-label-group">
              <span className="settings-label">Bloquear cookies de terceros</span>
              <span className="settings-label-sub">Evita que sitios externos te rastreen mediante cookies</span>
            </div>
            <button
              className={`settings-toggle ${cookies.blockThirdParty ? "on" : ""}`}
              onClick={() => updateCookies({ ...cookies, blockThirdParty: !cookies.blockThirdParty })}
              aria-label={cookies.blockThirdParty ? "Desactivar bloqueo" : "Activar bloqueo"}
            >
              <span className="settings-toggle-thumb" />
            </button>
          </div>
          <div className="settings-row settings-row--indented">
            <div className="settings-label-group">
              <span className="settings-label">Limpiar al cerrar</span>
              <span className="settings-label-sub">Borra cookies y caché al salir del navegador</span>
            </div>
            <button
              className={`settings-toggle ${cookies.clearOnExit ? "on" : ""}`}
              onClick={() => updateCookies({ ...cookies, clearOnExit: !cookies.clearOnExit })}
              aria-label={cookies.clearOnExit ? "Desactivar limpieza" : "Activar limpieza"}
            >
              <span className="settings-toggle-thumb" />
            </button>
          </div>
        </section>

        {/* Userscripts */}
        <section className="settings-section">
          <h3 className="settings-section-title">Userscripts</h3>
          <div className="settings-row">
            <div className="settings-label-group">
              <span className="settings-label">Gestor de userscripts</span>
              <span className="settings-label-sub">Instala scripts personalizados desde GreasyFork o URLs propias</span>
            </div>
            <button className="settings-change-btn" onClick={() => setShowUserscripts(true)}>
              Abrir gestor
            </button>
          </div>
        </section>

        {/* Permisos de sitios */}
        <section className="settings-section">
          <h3 className="settings-section-title">Permisos de sitios</h3>
          {sites.length === 0 ? (
            <p className="settings-empty-text">
              {sitesLoading ? "Cargando permisos…" : "No hay permisos guardados todavía."}
            </p>
          ) : (
            <>
              <div className="permissions-list">
                {sites.map((site) => (
                  <div key={site.origin} className="permission-item">
                    <div className="permission-item-header">
                      <span className="permission-origin" title={site.origin}>
                        {site.origin}
                      </span>
                      <button
                        className="permission-item-clear"
                        onClick={() => clearSite(site.origin)}
                        aria-label={`Limpiar permisos de ${site.origin}`}
                        title="Limpiar"
                      >
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                        </svg>
                      </button>
                    </div>
                    <div className="permission-badges">
                      {Object.entries(site.permissions).map(([perm, decision]) => (
                        <PermissionBadge key={perm} type={perm} decision={decision} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <button className="settings-danger-btn" onClick={clearAll}>
                Limpiar todos los permisos
              </button>
            </>
          )}
        </section>
      </div>

      {showPicker && (
        <SearchEnginePicker
          title="Cambiar motor de búsqueda"
          onSelect={(engine) => {
            onChangeEngine(engine);
            setShowPicker(false);
          }}
          onCancel={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
