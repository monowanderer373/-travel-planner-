import { useEffect, useState } from 'react';
import { useSaveStatus } from '../context/SaveStatusContext';
import './SaveIndicator.css';

export default function SaveIndicator() {
  const { status, resetToIdle } = useSaveStatus();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (status === 'saving' || status === 'saved') setVisible(true);
    if (status === 'saved') {
      const t = setTimeout(() => {
        setVisible(false);
        resetToIdle();
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [status, resetToIdle]);

  if (!visible || status === 'idle') return null;

  return (
    <div className={`save-indicator save-indicator-${status}`} aria-live="polite">
      {status === 'saving' && 'Saving…'}
      {status === 'saved' && 'Saved'}
    </div>
  );
}
