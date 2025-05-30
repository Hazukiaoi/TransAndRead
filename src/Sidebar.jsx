import React from 'react';

export default function Sidebar({
  collapsed,
  setCollapsed,
  setCurrentView,
  isTranslating,
  translationProgress,
  articleLoaded,
  onStartTranslation,
  onStopTranslation
}) {

  const getTranslationButtonLabel = () => {
    if (isTranslating) {
      return `停止翻译 (${translationProgress}%)`;
    }
    return "开始翻译";
  };

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <button onClick={() => setCollapsed(!collapsed)} className="sidebar-toggle-button">
        {collapsed ? '➡️' : '⬅️'}
      </button>

      {!collapsed && (
        <>
          <nav className="sidebar-nav">
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
              <li onClick={() => setCurrentView('console')}>
                控制台 (Console)
              </li>
            </ul>
          </nav>

          <div className="sidebar-actions">
            <button
              className={`translation-button ${isTranslating ? 'translating' : ''}`}
              onClick={isTranslating ? onStopTranslation : onStartTranslation}
              disabled={!articleLoaded && !isTranslating} // Disabled if no article and not currently translating
              title={!articleLoaded && !isTranslating ? "Load a file to start translation" : ""}
            >
              <div
                className="translation-progress-bar"
                style={{ width: isTranslating ? `${translationProgress}%` : '0%' }}
              ></div>
              <span className="translation-button-label">{getTranslationButtonLabel()}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
