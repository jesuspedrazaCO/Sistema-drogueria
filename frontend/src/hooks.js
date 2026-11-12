import { useEffect, useState } from 'react';

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Droguería` : 'Droguería';
  }, [title]);
}

// Devuelve el valor solo después de que el usuario deja de escribir (evita una petición por tecla)
export function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// true cuando la pantalla es de escritorio (lg de Tailwind). Evita montar dos veces el mismo panel.
export function useIsDesktop() {
  const query = '(min-width: 1024px)';
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = (event) => setMatches(event.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  return matches;
}
