'use client';
import { useEffect, useState, useRef } from 'react';
import './toast.css';

let idSeq = 0;

// Mounted once, globally, in layout.jsx. Renders a stacked notification
// bar in the top-right corner whenever notify() (see toast.js) is called
// from anywhere in the app — admin actions, client actions, auth forms,
// chat, etc.
export default function Toast() {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  useEffect(() => {
    function handleToast(e) {
      const { message, type = 'success', duration = 3500 } = e.detail || {};
      if (!message) return;
      const id = ++idSeq;
      setToasts(prev => [...prev, { id, message, type }]);
      timers.current[id] = setTimeout(() => dismiss(id), duration);
    }
    window.addEventListener('app:toast', handleToast);
    return () => {
      window.removeEventListener('app:toast', handleToast);
      Object.values(timers.current).forEach(clearTimeout);
    };
  }, []);

  function dismiss(id) {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  if (toasts.length === 0) return null;

  return (
    <div className="app-toast-stack" role="status" aria-live="polite">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`app-toast app-toast-${t.type}`}
          onClick={() => dismiss(t.id)}
        >
          <span className="app-toast-icon">
            {t.type === 'error' ? '⚠️' : t.type === 'info' ? 'ℹ️' : '✅'}
          </span>
          <span className="app-toast-message">{t.message}</span>
          <span className="app-toast-close">✕</span>
        </div>
      ))}
    </div>
  );
}
