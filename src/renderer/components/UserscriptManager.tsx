import React, { useState, useEffect, useCallback } from "react";
import "../styles/UserscriptManager.css";

type UserScriptRisk = "low" | "medium" | "high";

interface UserScript {
  id: string;
  name: string;
  version: string;
  description: string;
  code: string;
  matches: string[];
  includes: string[];
  excludes: string[];
  runAt: "document-start" | "document-end" | "document-idle";
  enabled: boolean;
  createdAt: number;
  risk: UserScriptRisk;
  grants: string[];
  requires: string[];
  connects: string[];
}

interface UserscriptManagerProps {
  onBack: () => void;
}

interface InstallPreview {
  name: string;
  version: string;
  description: string;
  matches: string[];
  risk: UserScriptRisk;
  grants: string[];
  requires: string[];
  connects: string[];
  code: string;
}

function RiskBadge({ risk }: { risk: UserScriptRisk }) {
  const labels: Record<UserScriptRisk, string> = {
    low: "Riesgo bajo",
    medium: "Riesgo medio",
    high: "Riesgo alto",
  };
  return <span className={`userscript-risk-badge ${risk}`}>{labels[risk]}</span>;
}

function GrantList({ grants }: { grants: string[] }) {
  if (grants.length === 0) return null;
  return (
    <div className="userscript-grant-list">
      {grants.map((g) => (
        <span key={g} className="userscript-grant-chip" title={`Permiso: ${g}`}>
          {g}
        </span>
      ))}
    </div>
  );
}

export default function UserscriptManager({ onBack }: UserscriptManagerProps) {
  const [scripts, setScripts] = useState<UserScript[]>([]);
  const [code, setCode] = useState("");
  const [url, setUrl] = useState("");
  const [installing, setInstalling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<InstallPreview | null>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await window.electronAPI?.listUserscripts();
      if (list) setScripts(list);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await window.electronAPI?.toggleUserscript(id, enabled);
      setScripts((prev) => prev.map((s) => (s.id === id ? { ...s, enabled } : s)));
    } catch {
      // ignore
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await window.electronAPI?.removeUserscript(id);
      setScripts((prev) => prev.filter((s) => s.id !== id));
    } catch {
      // ignore
    }
  };

  const buildPreview = async (scriptCode: string): Promise<InstallPreview | null> => {
    try {
      const script = await window.electronAPI?.addUserscript(scriptCode);
      if (!script) return null;
      // Immediately remove so it's just a preview; we'll re-add on confirm
      await window.electronAPI?.removeUserscript(script.id);
      return {
        name: script.name,
        version: script.version,
        description: script.description,
        matches: script.matches,
        risk: script.risk,
        grants: script.grants,
        requires: script.requires,
        connects: script.connects,
        code: scriptCode,
      };
    } catch {
      return null;
    }
  };

  const handleInstallCode = async () => {
    if (!code.trim() || installing) return;
    setInstalling(true);
    try {
      const p = await buildPreview(code.trim());
      if (p) setPreview(p);
      else alert("No se pudo analizar el script. Revisa el código.");
    } catch {
      // ignore
    } finally {
      setInstalling(false);
    }
  };

  const handleInstallUrl = async () => {
    if (!url.trim() || installing) return;
    setInstalling(true);
    try {
      const response = await fetch(url.trim());
      const text = await response.text();
      const p = await buildPreview(text);
      if (p) setPreview(p);
      else alert("No se pudo analizar el script. Revisa la URL.");
    } catch (err) {
      console.error("[Userscripts] Failed to fetch script from URL:", err);
      alert("No se pudo descargar el script. Verifica la URL.");
    } finally {
      setInstalling(false);
    }
  };

  const confirmInstall = async () => {
    if (!preview) return;
    setInstalling(true);
    try {
      await window.electronAPI?.addUserscript(preview.code);
      setPreview(null);
      setCode("");
      setUrl("");
      await refresh();
    } catch {
      // ignore
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div className="userscript-manager">
      <div className="settings-page-header">
        <button className="settings-page-back" onClick={onBack} aria-label="Volver">
          <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
            <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
          </svg>
        </button>
        <h1 className="settings-page-title">Userscripts</h1>
      </div>

      <div className="settings-page-content">
        {/* Install from URL */}
        <section className="settings-section">
          <h3 className="settings-section-title">Instalar desde URL</h3>
          <div className="voidshield-add-row">
            <input
              type="text"
              className="settings-input voidshield-input"
              placeholder="https://greasyfork.org/scripts/…/code.user.js"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleInstallUrl();
              }}
              spellCheck={false}
            />
            <button
              className="settings-change-btn"
              onClick={handleInstallUrl}
              disabled={installing || !url.trim()}
            >
              {installing && !preview ? "Analizando…" : "Instalar"}
            </button>
          </div>
        </section>

        {/* Install manually */}
        <section className="settings-section">
          <h3 className="settings-section-title">Instalar manualmente</h3>
          <p className="settings-label-sub" style={{ marginBottom: 10 }}>
            Pega el código del userscript (incluye metadatos <code>// @name</code>, <code>// @match</code>)
          </p>
          <textarea
            className="userscript-textarea"
            placeholder={`// ==UserScript==\n// @name         Mi Script\n// @match        *://*.ejemplo.com/*\n// @run-at       document-end\n// ==/UserScript==\n\nconsole.log("Hola mundo");`}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
          />
          <button
            className="settings-change-btn"
            onClick={handleInstallCode}
            disabled={installing || !code.trim()}
            style={{ marginTop: 10 }}
          >
            {installing && !preview ? "Analizando…" : "Instalar código"}
          </button>
        </section>

        {/* Install preview / confirmation dialog */}
        {preview && (
          <section className="settings-section userscript-preview-section">
            <div className="userscript-preview-card">
              <div className="userscript-preview-header">
                <h4 className="userscript-preview-title">Revisar instalación</h4>
                <RiskBadge risk={preview.risk} />
              </div>

              <div className="userscript-preview-body">
                <p className="userscript-preview-name">{preview.name} <span className="userscript-preview-version">v{preview.version}</span></p>
                {preview.description && (
                  <p className="userscript-preview-desc">{preview.description}</p>
                )}

                <div className="userscript-preview-row">
                  <span className="userscript-preview-label">Coincidencias:</span>
                  <span className="userscript-preview-value">{preview.matches.join(", ")}</span>
                </div>

                {preview.connects.length > 0 && (
                  <div className="userscript-preview-row">
                    <span className="userscript-preview-label">Conexiones permitidas:</span>
                    <span className="userscript-preview-value">{preview.connects.join(", ")}</span>
                  </div>
                )}

                {preview.requires.length > 0 && (
                  <div className="userscript-preview-row userscript-preview-warning">
                    <span className="userscript-preview-label">Requiere código externo:</span>
                    <span className="userscript-preview-value">{preview.requires.join(", ")}</span>
                  </div>
                )}

                {preview.grants.length > 0 && (
                  <div className="userscript-preview-row">
                    <span className="userscript-preview-label">Permisos solicitados:</span>
                    <GrantList grants={preview.grants} />
                  </div>
                )}

                {preview.risk === "high" && (
                  <p className="userscript-preview-alert">
                    Este script tiene un nivel de riesgo alto. Asegúrate de confiar en la fuente antes de instalarlo.
                  </p>
                )}
              </div>

              <div className="userscript-preview-actions">
                <button className="settings-change-btn secondary" onClick={() => setPreview(null)}>
                  Cancelar
                </button>
                <button className="settings-change-btn" onClick={confirmInstall} disabled={installing}>
                  {installing ? "Instalando…" : "Confirmar instalación"}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Installed scripts */}
        <section className="settings-section">
          <h3 className="settings-section-title">Scripts instalados</h3>
          {loading ? (
            <p className="settings-empty-text">Cargando…</p>
          ) : scripts.length === 0 ? (
            <p className="settings-empty-text">No tienes userscripts instalados.</p>
          ) : (
            <div className="userscript-list">
              {scripts.map((script) => (
                <div key={script.id} className={`userscript-item risk-${script.risk}`}>
                  <div className="userscript-item-header">
                    <div className="userscript-item-info">
                      <div className="userscript-item-top">
                        <span className="userscript-item-name" title={script.description || script.name}>
                          {script.name}
                        </span>
                        <RiskBadge risk={script.risk} />
                      </div>
                      <span className="userscript-item-meta">
                        v{script.version} · {script.matches.join(", ")} · {script.runAt}
                      </span>
                      {script.grants.length > 0 && (
                        <GrantList grants={script.grants} />
                      )}
                    </div>
                    <div className="userscript-item-actions">
                      <button
                        className={`settings-toggle ${script.enabled ? "on" : ""}`}
                        onClick={() => handleToggle(script.id, !script.enabled)}
                        aria-label={script.enabled ? "Desactivar script" : "Activar script"}
                        title={script.enabled ? "Desactivar" : "Activar"}
                      >
                        <span className="settings-toggle-thumb" />
                      </button>
                      <button
                        className="permission-item-clear"
                        onClick={() => handleRemove(script.id)}
                        aria-label={`Eliminar ${script.name}`}
                        title="Eliminar"
                      >
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
