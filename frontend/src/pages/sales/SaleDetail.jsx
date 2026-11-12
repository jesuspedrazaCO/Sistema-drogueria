import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban } from 'lucide-react';
import { api, errorMessage } from '../../lib/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { can } from '../../lib/permissions.js';
import { PAYMENT_METHODS } from '../../lib/labels.js';
import { formatCOP, formatDate, formatDateTime } from '../../lib/format.js';
import { Modal } from '../../components/ui/Modal.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';

export function SaleDetail({ id, onClose }) {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [voiding, setVoiding] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const { data, isLoading, isError, error: loadError } = useQuery({ queryKey: ['sale', id], queryFn: () => api.get(`/sales/${id}`), enabled: Boolean(id) });
  const sale = data?.data.sale;

  const voidSale = useMutation({
    mutationFn: () => api.post(`/sales/${id}/void`, { reason: reason.trim() }),
    onSuccess: () => {
      for (const key of ['sales', 'sale', 'products', 'dashboard', 'alerts', 'batches']) queryClient.invalidateQueries({ queryKey: [key] });
      toast.success('Venta anulada: el stock volvió a los lotes');
      setVoiding(false);
      setReason('');
    },
    onError: (err) => setError(errorMessage(err)),
  });

  const close = () => {
    setVoiding(false);
    setReason('');
    setError('');
    onClose();
  };

  return (
    <Modal
      open={Boolean(id)}
      onClose={close}
      size="lg"
      title={sale ? `Recibo N.º ${sale.receiptNumber}` : 'Venta'}
      description={sale ? formatDateTime(sale.createdAt) : undefined}
      footer={
        sale?.status === 'completed' && can(user, 'voidSale') ? (
          voiding ? (
            <>
              <Button variant="secondary" onClick={() => setVoiding(false)}>Cancelar</Button>
              <Button variant="danger" loading={voidSale.isPending} disabled={reason.trim().length < 5} onClick={() => { setError(''); voidSale.mutate(); }}>Confirmar anulación</Button>
            </>
          ) : (
            <Button variant="secondary" onClick={() => setVoiding(true)}><Ban className="h-4 w-4" aria-hidden /> Anular venta</Button>
          )
        ) : undefined
      }
    >
      {isLoading && <Skeleton className="h-48 w-full" />}
      {isError && <p role="alert" className="text-bad">{errorMessage(loadError)}</p>}
      {sale && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={sale.status === 'voided' ? 'bad' : 'ok'}>{sale.status === 'voided' ? 'Anulada' : 'Completada'}</Badge>
            <Badge>{PAYMENT_METHODS[sale.paymentMethod]}</Badge>
            {sale.prescription?.formulaNumber && <Badge tone="warn">Con fórmula</Badge>}
          </div>

          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div><dt className="text-ink-mute">Vendedor</dt><dd className="mt-0.5 text-[15px] text-ink">{sale.soldBy?.name ?? '—'}</dd></div>
            <div><dt className="text-ink-mute">Cliente</dt><dd className="mt-0.5 text-[15px] text-ink">{sale.customer?.name ?? 'Consumidor final'}</dd></div>
          </dl>

          <ul className="divide-y rounded-2xl ring-1 ring-black/[0.06]">
            {sale.items.map((item) => (
              <li key={item.id} className="px-4 py-3">
                <div className="flex justify-between gap-3">
                  <p className="min-w-0 font-medium text-ink">{item.quantity} × {item.name}</p>
                  <p className="num shrink-0 font-semibold text-ink">{formatCOP(item.lineTotal)}</p>
                </div>
                <p className="num text-sm text-ink-mute">
                  {formatCOP(item.unitPrice)} c/u{item.discount > 0 && ` · descuento ${formatCOP(item.discount)}`}
                </p>
                {item.allocations?.filter((a) => a.batchNumber).length > 0 && (
                  <p className="mt-1 text-xs text-ink-mute">
                    {item.allocations.filter((a) => a.batchNumber).map((a) => `Lote ${a.batchNumber} (${a.quantity}) · vence ${formatDate(a.expirationDate)}`).join(' — ')}
                  </p>
                )}
              </li>
            ))}
          </ul>

          <div className="space-y-1.5 text-[15px]">
            {sale.discountTotal > 0 && <div className="flex justify-between text-ink-soft"><span>Descuentos</span><span className="num">− {formatCOP(sale.discountTotal)}</span></div>}
            <div className="flex justify-between text-ink-soft"><span>IVA incluido</span><span className="num">{formatCOP(sale.taxTotal)}</span></div>
            <div className="flex justify-between text-lg font-semibold text-ink"><span>Total</span><span className="num">{formatCOP(sale.total)}</span></div>
            {sale.paymentMethod === 'cash' && <div className="flex justify-between text-ink-mute"><span>Recibido / cambio</span><span className="num">{formatCOP(sale.amountReceived)} / {formatCOP(sale.change)}</span></div>}
          </div>

          {sale.prescription?.formulaNumber && (
            <div className="rounded-2xl bg-warn-bg/60 p-4 text-sm text-ink-soft">
              <p className="mb-1 font-semibold text-warn">Fórmula médica</p>
              <p>N.º {sale.prescription.formulaNumber} · Dr(a). {sale.prescription.doctorName}</p>
              <p>Paciente: {sale.prescription.patientName} ({sale.prescription.patientDocument})</p>
            </div>
          )}

          {sale.status === 'voided' && (
            <div className="rounded-2xl bg-bad-bg p-4 text-sm text-bad">
              <p className="font-semibold">Venta anulada</p>
              <p>{sale.voidReason}</p>
            </div>
          )}

          {voiding && (
            <div>
              <label htmlFor="void-reason" className="mb-1.5 block text-sm font-medium text-ink-soft">Motivo de la anulación</label>
              <textarea id="void-reason" data-autofocus rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej.: producto equivocado, el cliente devolvió la compra…" className="w-full rounded-xl bg-surface p-3 text-base ring-1 ring-inset ring-black/10 focus:outline-none focus:ring-2 focus:ring-brand-500" />
              <p className="mt-1 text-sm text-ink-mute">Se devuelve el stock a los mismos lotes. Esta acción queda registrada.</p>
              {error && <p role="alert" className="mt-2 text-sm text-bad">{error}</p>}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
