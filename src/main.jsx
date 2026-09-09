import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Guard against React 19 development mode cross-origin iframe $$typeof traversal
if (typeof window !== 'undefined') {
  const isSecurityError = (msg) => {
    const s = String(msg || '');
    return (
      s.includes('$$typeof') ||
      s.includes('Blocked a frame with origin') ||
      (s.includes('SecurityError') && s.includes('cross-origin frame'))
    );
  };

  window.addEventListener(
    'error',
    (event) => {
      if (isSecurityError(event?.message) || isSecurityError(event?.error?.message)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return true;
      }
    },
    true
  );

  const prevOnError = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    if (isSecurityError(message) || isSecurityError(error?.message)) {
      return true;
    }
    if (typeof prevOnError === 'function') {
      return prevOnError(message, source, lineno, colno, error);
    }
    return false;
  };
}

createRoot(document.getElementById('root')).render(<App />);
