import React, { useRef, useEffect } from 'react';
import { useLogger } from '../contexts/LoggingContext';
import './ConsoleView.css';

export default function ConsoleView() {
  const { logs, clearLogs } = useLogger(); // Use clearLogs from context
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [logs]);

  const handleClearLog = () => {
    if (clearLogs) {
      clearLogs();
    } else {
      // This case should ideally not happen if context is set up correctly
      console.warn("clearLogs function not available from LoggingContext.");
      alert("Log clearing function not available.");
    }
  };

  return (
    <div className="console-view">
      <div className="console-header">
        <h2>控制台 (Console)</h2>
        <button onClick={handleClearLog} className="clear-log-button">Clear Log</button>
      </div>
      <textarea
        ref={textareaRef}
        className="console-output"
        readOnly
        value={logs.map(log => `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`).join('\n')}
        placeholder="Log messages will appear here..."
      />
    </div>
  );
}
