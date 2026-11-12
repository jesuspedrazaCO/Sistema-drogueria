import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

// Ventana accesible: en móvil sube desde abajo (como iOS), en escritorio queda centrada.
// Cierra con Escape o tocando el fondo, bloquea el scroll y devuelve el foco al cerrar.
export function Modal({ open, onClose, title, description, children, footer, size = 'md' }) {
  const titleId = useId();
  const panelRef = useRef(null);
  // onClose suele ser una función nueva en cada render: se guarda en una ref para no reiniciar el efecto (y el foco)
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const onKey = (event) => {
      if (event.key === 'Escape') closeRef.current();
      if (event.key !== 'Tab') return;
      const focusable = panelRef.current?.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    panelRef.current?.querySelector('[data-autofocus]')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  const width = { md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', sm: 'sm:max-w-sm' }[size];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button type="button" tabIndex={-1} aria-label="Cerrar" onClick={onClose} className="absolute inset-0 animate-fade bg-black/35" />
      <div ref={panelRef} className={`relative flex max-h-[92vh] w-full animate-sheet flex-col rounded-t-[28px] bg-surface shadow-pop sm:animate-rise sm:rounded-3xl ${width}`}>
        <div className="flex items-start justify-between gap-4 px-6 pb-2 pt-6">
          <div className="min-w-0">
            <h2 id={titleId} className="text-xl font-semibold text-ink">{title}</h2>
            {description && <p className="mt-1 text-sm text-ink-mute">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="-mr-2 -mt-1 rounded-full bg-black/5 p-2 text-ink-soft hover:bg-black/10">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
        {footer && <div className="safe-bottom flex flex-wrap justify-end gap-2 border-t px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}
