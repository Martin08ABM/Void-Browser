import React from "react";
import { SearchEngine, SEARCH_ENGINES, PrivacyLevel } from "../types";

import "../styles/SearchEnginePicker.css";

interface SearchEnginePickerProps {
  onSelect: (engine: SearchEngine) => void;
  onCancel?: () => void;
  title?: string;
}

const engineColors: Record<string, string> = {
  Google: "#4285F4",
  DuckDuckGo: "#DE5833",
  "Microsoft Bing": "#00809D",
  Yandex: "#FC3F1D",
  Ecosia: "#2A6F3E",
  Qwant: "#5C97FF",
  Kagi: "#FFB545",
};

const privacyConfig: Record<
  PrivacyLevel,
  { label: string; bg: string; text: string }
> = {
  high: {
    label: "Privacidad alta",
    bg: "rgba(78, 158, 122, 0.18)",
    text: "#4E9E7A",
  },
  medium: {
    label: "Privacidad media",
    bg: "rgba(255, 181, 69, 0.18)",
    text: "#FFB545",
  },
  low: {
    label: "Privacidad baja",
    bg: "rgba(199, 91, 91, 0.18)",
    text: "#C75B5B",
  },
};

export default function SearchEnginePicker({
  onSelect,
  onCancel,
  title = "Elige tu motor de búsqueda",
}: SearchEnginePickerProps) {
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && onCancel) {
      onCancel();
    }
  };

  return (
    <div className="search-engine-picker-overlay" onClick={handleBackdropClick}>
      <div className="search-engine-picker-card">
        <div className="search-engine-picker-header">
          <h2 className="search-engine-picker-title">{title}</h2>
          {onCancel && (
            <button
              className="search-engine-picker-close"
              onClick={onCancel}
              aria-label="Cerrar"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
              </svg>
            </button>
          )}
        </div>
        <p className="search-engine-picker-subtitle">
          Selecciona el motor que se usará por defecto al buscar desde la barra de direcciones.
        </p>

        <div className="search-engine-picker-grid">
          {SEARCH_ENGINES.map((engine) => {
            const color = engineColors[engine.name] || "var(--color-accent)";
            const privacy = privacyConfig[engine.privacyLevel];
            return (
              <button
                key={engine.name}
                className="search-engine-picker-option"
                onClick={() => onSelect(engine)}
              >
                <div className="search-engine-picker-top">
                  <span
                    className="search-engine-picker-dot"
                    style={{ backgroundColor: color }}
                  />
                  <span className="search-engine-picker-name">{engine.name}</span>
                  <span
                    className="search-engine-picker-privacy"
                    style={{
                      backgroundColor: privacy.bg,
                      color: privacy.text,
                    }}
                  >
                    {privacy.label}
                  </span>
                </div>
                <p className="search-engine-picker-desc">{engine.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
