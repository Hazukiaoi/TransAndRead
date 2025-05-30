import React from 'react';

export default function Sidebar({ collapsed, setCollapsed, setCurrentView }) {
  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <button onClick={() => setCollapsed(!collapsed)} className="sidebar-toggle-button">
        {collapsed ? '➡️' : '⬅️'}
      </button>
      {!collapsed && (
        <nav>
          <ul>
            <li onClick={() => setCurrentView('translation')}>
              对照翻译 (Bilingual Translation)
            </li>
            <li onClick={() => setCurrentView('glossary')}>
              词表 (Glossary)
            </li>
            <li onClick={() => setCurrentView('llmConfig')}>
              LLM Configuration
            </li>
            <li onClick={() => setCurrentView('promptConfig')}>
              Prompt Configuration
            </li>
            <li onClick={() => setCurrentView('translateConfig')}>
              Translation Configuration
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}
