import React, { useState } from "react"
import { Tab } from "../types";

import "../styles/Tabs.css";

interface TabsProps {
  tabs: Tab[];
  activeTabId: number;
  loadingTabs: Set<number>;
  onTabClick: (id: number) => void;
  onTabClose: (id: number) => void;
  onNewTab: () => void;
  onTabContextMenu?: (tabId: number, x: number, y: number) => void;
  onReorderTabs?: (fromIndex: number, toIndex: number) => void;
}

export default function Tabs({ tabs, activeTabId, loadingTabs, onTabClick, onTabClose, onNewTab, onTabContextMenu, onReorderTabs }: TabsProps) {
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);

  const handleMinimize = () => window.electronAPI?.minimizeWindow();
  const handleMaximize = () => window.electronAPI?.maximizeWindow();
  const handleClose = () => window.electronAPI?.closeWindow();

  const handleDragStart = (e: React.DragEvent, tabId: number) => {
    setDraggingId(tabId);
    e.dataTransfer.effectAllowed = 'move';
    // Required for Firefox
    e.dataTransfer.setData('text/plain', String(tabId));
  };

  const handleDragOver = (e: React.DragEvent, tabId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverId !== tabId) {
      setDragOverId(tabId);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    setDragOverId(null);
    if (draggingId === null || draggingId === targetId) {
      setDraggingId(null);
      return;
    }
    const fromIndex = tabs.findIndex((t) => t.id === draggingId);
    const toIndex = tabs.findIndex((t) => t.id === targetId);
    if (fromIndex !== -1 && toIndex !== -1 && onReorderTabs) {
      onReorderTabs(fromIndex, toIndex);
    }
    setDraggingId(null);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverId(null);
  };

  return (
    <div className="tabs-bar">
      <div className="tabs-container">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isDragging = tab.id === draggingId;
          const isDragOver = tab.id === dragOverId;
          return (
            <div
              key={tab.id}
              className={`tab ${isActive ? "tab--active" : "tab--inactive"} ${isDragging ? "tab--dragging" : ""} ${isDragOver ? "tab--drag-over" : ""}`}
              onClick={() => onTabClick(tab.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                onTabContextMenu?.(tab.id, e.clientX, e.clientY);
              }}
              draggable={!!onReorderTabs}
              onDragStart={(e) => handleDragStart(e, tab.id)}
              onDragOver={(e) => handleDragOver(e, tab.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, tab.id)}
              onDragEnd={handleDragEnd}
              title={tab.title}
            >
              <span className="tab-favicon">
                {loadingTabs.has(tab.id) ? (
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="tab-spinner">
                    <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                  </svg>
                ) : tab.favicon ? (
                  <img src={tab.favicon} alt="" width="12" height="12" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                    <circle cx="8" cy="8" r="8" />
                  </svg>
                )}
              </span>
              <span className="tab-title">{tab.title}</span>
              {tab.isPlayingAudio && (
                <span className="tab-audio" title="Reproduciendo audio">
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M11.536 14.01A8.473 8.473 0 0 0 14.026 8a8.473 8.473 0 0 0-2.49-6.01l-.708.707A7.476 7.476 0 0 1 13.025 8c0 2.071-.84 3.946-2.197 5.303l.708.707z"/>
                    <path d="M10.121 12.596A6.48 6.48 0 0 0 12.025 8a6.48 6.48 0 0 0-1.904-4.596l-.707.707A5.483 5.483 0 0 1 11.025 8a5.483 5.483 0 0 1-1.61 3.89l.706.706z"/>
                    <path d="M10.025 8a4.486 4.486 0 0 1-1.318 3.182L8 10.475A3.489 3.489 0 0 0 9.025 8c0-.966-.392-1.841-1.025-2.475l.707-.707A4.486 4.486 0 0 1 10.025 8zM7 4a.5.5 0 0 0-.812-.39L3.825 5.5H1.5A.5.5 0 0 0 1 6v4a.5.5 0 0 0 .5.5h2.325l2.363 1.89A.5.5 0 0 0 7 12V4zM4.312 6.39 6 5.04v5.92L4.312 9.61A.5.5 0 0 0 4 9.5H2v-3h2a.5.5 0 0 0 .312-.11z"/>
                  </svg>
                </span>
              )}
              <button
                className="tab-close"
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }}
                aria-label="Cerrar pestaña"
              >
                <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                </svg>
              </button>
            </div>
          );
        })}
        <button className="tabs-new-tab" onClick={onNewTab} aria-label="Nueva pestaña">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
          </svg>
        </button>
      </div>

      <div className="window-controls">
        <button className="window-btn window-btn--minimize" onClick={handleMinimize} aria-label="Minimizar">
          <svg width="10" height="10" viewBox="0 0 10 10">
            <rect x="0" y="4.5" width="10" height="1" fill="currentColor" />
          </svg>
        </button>
        <button className="window-btn window-btn--maximize" onClick={handleMaximize} aria-label="Maximizar">
          <svg width="10" height="10" viewBox="0 0 10 10">
            <rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>
        <button className="window-btn window-btn--close" onClick={handleClose} aria-label="Cerrar">
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path d="M1 1 L9 9 M9 1 L1 9" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>
      </div>
    </div>
  )
}
