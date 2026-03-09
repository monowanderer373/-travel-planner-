import { createContext, useContext, useState, useCallback } from 'react';

const SaveStatusContext = createContext(null);

export function SaveStatusProvider({ children }) {
  const [status, setStatus] = useState('idle'); // 'idle' | 'saving' | 'saved'

  const reportSaving = useCallback(() => {
    setStatus('saving');
  }, []);

  const reportSaved = useCallback(() => {
    setStatus('saved');
  }, []);

  const resetToIdle = useCallback(() => {
    setStatus('idle');
  }, []);

  const value = { status, reportSaving, reportSaved, resetToIdle };
  return (
    <SaveStatusContext.Provider value={value}>
      {children}
    </SaveStatusContext.Provider>
  );
}

export function useSaveStatus() {
  const ctx = useContext(SaveStatusContext);
  return ctx || { status: 'idle', reportSaving: () => {}, reportSaved: () => {}, resetToIdle: () => {} };
}
