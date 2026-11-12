import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, HandCoins } from 'lucide-react';
import { api, errorMessage } from '../../lib/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { can } from '../../lib/permissions.js';
import { toNumber } from '../../lib/forms.js';
import { PAYMENT_STATUS, PURCHASE_PAYMENT } from '../../lib/labels.js';
import { formatCOP, formatDate, formatDateTime } from '../../lib/format.js';
import { Modal } from '../../components/ui/Modal.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';

const field = 'h-12 w-full rounded-xl bg-surface px-4 text-base ring-1 ring-inset ring-black/10 focus:outline-none focus:ring-2 focus:ring-brand-500';

export function PurchaseDetail({ id, onClose }) {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState(null); // 'pay' | 'void'
  const [reason, setReason] = useState('');
  const [pay, setPay] = useState({ amount: '', method: 'transfer', note: '' });
  const [error, setError] = useState('');

  const { data, isLoading, isError, error: loadError } = useQuery({ queryKey: ['purchase', id], queryFn: () => api.get(`/purchases/${id}`), enabled: Boolean(id) });
  const purchase = data?.data.purchase;

  const refresh = () => {
    for (const key of ['purchases', 'purchase', 'payables', 'products', 'product', 'batches', 'alerts', 'dashboard', 'movements']) queryClient.invalidateQueries({ queryKey: [key] });
  };
  const reset = () => { setMode(null); setReason(''); setPay({ amount: '', method: 'transfer', note: '' }); setError(''); };
  const close = () => { reset(); onClose(); };

  const registerPayment = useMutation({
    mutationFn: (body) => api.post(`/purchases/${id}/payments`, body),
    onSuccess: () => { refresh(); toast.success('Pago registrado'); reset(); },
    onError: (err) => setError(errorMessage(err)),
  });
  const voidPurchase = useMutation({
    mutationFn: () => api.post(`/purchases/${id}/void`, { reason: reason.trim() }),
    onSuccess: () => { refresh(); toast.success('Compra anulada'); reset(); },
    onError: (err) => setError(errorMessage(err)),
  });

  const canPay = purchase?.status === 'received' && purchase.balanceDue > 0 && can(user, 'paySuppliers');
  const canVoid = purchase?.status === 'received' && can(user, 'voidPurchase');
  const amount = toNumber(pay.amount);
  const status = purchase && PAYMENT_STATUS[purchase.paymentStatus];

  const footer = !purchase ? undefined : mode === 'pay' ? (
    <>
      <Button variant="secondary" onClick={reset}>Cancelar</Button>
      <Button loading={registerPayment.isPending} disabled={!amount || amount <= 0 || amount > purchase.balanceDue} onClick={() => { setError(''); registerPayment.mutate({ amount, method: pay.method, ...(pay.note.trim() && { note: pay.note.trim() }) }); }}>Registrar pago</Button>
    </>
  ) : mode === 'void' ? (
    <>
      <Button variant="secondary" onClick={reset}>Cancelar</Button>
      <Button variant="danger" loading={voidPurchase.isPending} disabled={reason.trim().length < 5} onClick={() => { setError(''); voidPurchase.mutate(); }}>Confirmar anulación</Button>
    </>
  ) : (
    <>
      {canVoid && <Button variant="secondary" onClick={() => setMode('void')}><Ban className="h-4 w-4" aria-hidden /> Anular</Button>}
      {canPay && <Button onClick={() => { setPay((c) => ({ ...c, amount: String(purchase.balanceDue) })); setMode('pay'); }}><HandCoins className="h-4 w-4" aria-hidden /> Registrar pago</Button>}
    </>
  );

  return (
    <Modal open={Boolean(id)} onClose={close} size="lg" title={purchase ? `Factura ${purchase.invoiceNumber}` : 'Compra'} description={purchase ? `${purchase.supplier?.name} · ${formatDate(purchase.purchaseDate)}` : undefined} footer={footer}>
      {isLoading && <Skeleton className="h-48 w-full" />}
      {isError && <p role="alert" className="text-bad">{errorMessage(loadError)}</p>}
      {purchase && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            {purchase.status === 'voided' ? <Badge tone="bad">Anulada</Badge> : <Badge tone={status.tone}>{status.label}</Badge>}
            <Badge>{PURCHASE_PAYMENT[purchase.paymentMethod]}</Badge>
            {purchase.dueDate && purchase.balanceDue > 0 && <Badge tone={new Date(purchase.dueDate) < new Date() ? 'bad' : 'neutral'}>Vence {formatDate(purchase.dueDate)}</Badge>}
          </div>

          <ul className="divide-y rounded-2xl ring-1 ring-black/[0.06]">
            {purchase.items.map((item) => (
              <li key={item.id} className="px-4 py-3">
                <div className="flex justify-between gap-3">
                  <p className="min-w-0 font-medium text-ink">{item.quantity} × {item.product?.name}</p>
                  <p className="num shrink-0 font-semibold text-ink">{formatCOP(item.lineTotal)}</p>
                </div>
                <p className="num text-sm text-ink-mute">
                  {formatCOP(item.unitCost)} c/u · IVA {item.ivaRate}%
                  {item.batchNumber && ` · lote ${item.batchNumber} vence ${formatDate(item.expirationDate)}`}
                </p>
              </li>
            ))}
          </ul>

          <div className="space-y-1.5 text-[15px]">
            <div className="flex justify-between text-ink-soft"><span>Subtotal</span><span className="num">{formatCOP(purchase.subtotal)}</span></div>
            <div className="flex justify-between text-ink-soft"><span>IVA</span><span className="num">{formatCOP(purchase.taxTotal)}</span></div>
            <div className="flex justify-between text-lg font-semibold text-ink"><span>Total</span><span className="num">{formatCOP(purchase.total)}</span></div>
            {purchase.balanceDue > 0 && purchase.status === 'received' && <div className="flex justify-between font-medium text-warn"><span>Saldo pendiente</span><span className="num">{formatCOP(purchase.balanceDue)}</span></div>}
          </div>

          {purchase.payments?.length > 0 && (
            <section>
              <h3 className="mb-2 text-[15px] font-semibold text-ink">Pagos</h3>
              <ul className="divide-y rounded-2xl ring-1 ring-black/[0.06]">
                {purchase.payments.map((p, i) => (
                  <li key={p.id ?? i} className="flex justify-between gap-3 px-4 py-2.5 text-sm">
                    <span className="text-ink-soft">{formatDateTime(p.paidAt)} · {PURCHASE_PAYMENT[p.method]}{p.note && ` · ${p.note}`}</span>
                    <span className="num font-medium text-ink">{formatCOP(p.amount)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {purchase.status === 'voided' && (
            <div className="rounded-2xl bg-bad-bg p-4 text-sm text-bad"><p className="font-semibold">Compra anulada</p><p>{purchase.voidReason}</p></div>
          )}

          {mode === 'pay' && (
            <div className="space-y-3 rounded-2xl bg-black/[0.03] p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium text-ink-soft">Valor a pagar<input data-autofocus inputMode="numeric" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} className={`${field} mt-1.5`} /></label>
                <Select label="Medio" value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}>
                  <option value="transfer">Transferencia</option>
                  <option value="cash">Efectivo</option>
                </Select>
              </div>
              <input aria-label="Nota" placeholder="Nota (opcional)" maxLength={200} value={pay.note} onChange={(e) => setPay({ ...pay, note: e.target.value })} className={field} />
              <p className="text-sm text-ink-mute">Saldo pendiente: {formatCOP(purchase.balanceDue)}</p>
            </div>
          )}
          {mode === 'void' && (
            <div>
              <label htmlFor="void-purchase" className="mb-1.5 block text-sm font-medium text-ink-soft">Motivo de la anulación</label>
              <textarea id="void-purchase" data-autofocus rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-xl bg-surface p-3 text-base ring-1 ring-inset ring-black/10 focus:outline-none focus:ring-2 focus:ring-brand-500" />
              <p className="mt-1 text-sm text-ink-mute">Se retira del inventario lo que entró con esta factura. Si ya se vendió parte, el sistema no te dejará anularla.</p>
            </div>
          )}
          {error && <p role="alert" className="rounded-xl bg-bad-bg px-4 py-3 text-sm text-bad">{error}</p>}
        </div>
      )}
    </Modal>
  );
}
