import React, { createContext, useContext } from 'react';

export const LoggingContext = createContext({
  logs: [],
  addLog: (message, level = 'info') => {}, // Default empty function
});

export const useLogger = () => useContext(LoggingContext);
