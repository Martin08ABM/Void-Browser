import React, { useState } from "react";
import { SearchEngine } from "../types";
import SearchEnginePicker from "./SearchEnginePicker";

import "../styles/SettingsPage.css";

interface SettingsPageProps {
  currentEngine: SearchEngine;
  onChangeEngine: (engine: SearchEngine) => void;
  onBack: () => void;
}

export default function SettingsPage({ currentEngine, onChangeEngine, onBack }: SettingsPageProps) {
  const [showPicker, setShowPicker] = useState(false);

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
        <section className="settings-section">
          <h3 className="settings-section-title">Motor de búsqueda</h3>
          <div className="settings-row">
            <span className="settings-current-engine">{currentEngine.name}</span>
            <button
              className="settings-change-btn"
              onClick={() => setShowPicker(true)}
            >
              Cambiar
            </button>
          </div>
        </section>
      </div>

      {showPicker && (
        <SearchEnginePicker
          title="Cambiar motor de búsqueda"
          onSelect={(engine) => {
            onChangeEngine(engine);
            setShowPicker(false);
          }}
        />
      )}
    </div>
  );
}
