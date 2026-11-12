import { Hammer } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Card } from '../components/ui/Card.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { useDocumentTitle } from '../hooks.js';

export default function ComingSoon({ title }) {
  useDocumentTitle(title);
  return (
    <>
      <PageHeader title={title} />
      <Card>
        <EmptyState icon={Hammer} title="Próximamente" description="Este módulo ya funciona en el servidor y su pantalla llega en la siguiente entrega." />
      </Card>
    </>
  );
}
