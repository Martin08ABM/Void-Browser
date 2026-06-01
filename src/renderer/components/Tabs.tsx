import React from "react"
import { Tab } from "../types";

import "../styles/Tabs.css";

interface TabsProps {
  tabs: Tab[];
  activeTabId: number;
  onTabClick: (id: number) => void;
  onTabClose: (id: number) => void;
  onNewTab: () => void;
}

export default function Tabs({ tabs, activeTabId, onTabClick, onTabClose, onNewTab }: TabsProps) {
  return (
    <div className="tabs-bar">
      <div className="tabs-container">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              className={`tab ${isActive ? "tab--active" : "tab--inactive"}`}
              onClick={() => onTabClick(tab.id)}
            >
              <span className="tab-favicon">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                  <circle cx="8" cy="8" r="8" />
                </svg>
              </span>
              <span className="tab-title">{tab.title}</span>
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
    </div>
  )
}
