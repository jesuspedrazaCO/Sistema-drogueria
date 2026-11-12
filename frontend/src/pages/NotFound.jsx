import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { Button } from '../components/ui/Button.jsx';
import { useDocumentTitle } from '../hooks.js';

export default function NotFound({ standalone }) {
  useDocumentTitle('Página no encontrada');
  const content = (
    <EmptyState
      icon={Compass}
      title="No encontramos esa página"
      description="Puede que el enlace haya cambiado o ya no exista."
      action={
        <Link to="/">
          <Button>Ir al inicio</Button>
        </Link>
      }
    />
  );
  return standalone ? <div className="grid min-h-screen place-items-center bg-canvas">{content}</div> : content;
}
