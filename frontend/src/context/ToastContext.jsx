import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CircleCheck, CircleAlert, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (tone, message) => {
      const id = (nextId.current += 1);
      setToasts((list) => [...list.slice(-2), { id, tone, message }]);
      setTimeout(() => dismiss(id), 4500);
    },
    [dismiss]
  );

  const api = useMemo(
    () => ({ success: (message) => push('ok', message), error: (message) => push('bad', message) }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-3 z-[90] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === 'bad' ? 'alert' : 'status'}
            className="pointer-events-auto flex max-w-md animate-rise items-center gap-3 rounded-full bg-ink/95 py-2.5 pl-4 pr-2.5 text-sm text-white shadow-pop backdrop-blur"
          >
            {t.tone === 'ok' ? (
              <CircleCheck className="h-5 w-5 shrink-0 text-emerald-300" aria-hidden />
            ) : (
              <CircleAlert className="h-5 w-5 shrink-0 text-red-300" aria-hidden />
            )}
            <span className="min-w-0">{t.message}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="rounded-full p-1 text-white/70 hover:bg-white/10 hover:text-white"
              aria-label="Cerrar aviso"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
