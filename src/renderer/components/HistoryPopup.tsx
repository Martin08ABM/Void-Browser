import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { HistoryEntry, groupHistory } from "../hooks/useHistory";

interface HistoryPopupProps {
  history: HistoryEntry[];
  onClose: () => void;
  onClear: () => void;
  onNavigate: (url: string) => void;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HistoryPopup({
  history,
  onClose,
  onClear,
  onNavigate,
}: HistoryPopupProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const groups = groupHistory(history);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Click outside to close
  useEffect(() => {
    const id = setTimeout(() => {
      const handler = (e: PointerEvent) => {
        const target = e.target as Node;
        if (modalRef.current && !modalRef.current.contains(target)) {
          onClose();
        }
      };
      document.addEventListener("pointerdown", handler);
      return () => document.removeEventListener("pointerdown", handler);
    }, 50);
    return () => clearTimeout(id);
  }, [onClose]);

  return createPortal(
    <div className="history-popup-overlay">
      <div ref={modalRef} className="history-popup-modal">
        <div className="history-popup-header">
          <h3 className="history-popup-title">Historial</h3>
          <button className="history-popup-close" onClick={onClose} aria-label="Cerrar">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
            </svg>
          </button>
        </div>

        {history.length === 0 ? (
          <div className="history-popup-empty">
            <p>No hay páginas en el historial</p>
          </div>
        ) : (
          <div className="history-popup-list">
            {groups.map((group) => (
              <div key={group.label} className="history-popup-group">
                <div className="history-popup-group-label">{group.label}</div>
                {group.entries.map((entry, idx) => (
                  <div
                    key={`${entry.timestamp}-${idx}`}
                    className="history-popup-item"
                    onClick={() => {
                      onNavigate(entry.url);
                      onClose();
                    }}
                    title={entry.url}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onNavigate(entry.url);
                        onClose();
                      }
                    }}
                  >
                    <div className="history-popup-item-main">
                      <span className="history-popup-item-title">
                        {entry.title || entry.url}
                      </span>
                      <span className="history-popup-item-url">
                        {entry.url}
                      </span>
                    </div>
                    <span className="history-popup-item-time">
                      {formatTime(entry.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {history.length > 0 && (
          <div className="history-popup-footer">
            <button className="history-popup-clear" onClick={onClear}>
              Borrar historial
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
