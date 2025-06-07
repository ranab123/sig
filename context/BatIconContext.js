import React, { createContext, useContext } from 'react';

// Create the context
export const BatIconContext = createContext();

// Create a custom hook for easier usage
export const useBatIcon = () => {
  const context = useContext(BatIconContext);
  if (!context) {
    throw new Error('useBatIcon must be used within a BatIconProvider');
  }
  return context;
};

// Export the provider for convenience
export const BatIconProvider = BatIconContext.Provider; 