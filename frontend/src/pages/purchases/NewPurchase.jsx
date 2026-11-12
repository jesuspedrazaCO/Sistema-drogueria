import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { api, errorMessage } from '../../lib/api.js';
import { toNumber } from '../../lib/forms.js';
import { IVA_OPTIONS, PURCHASE_PAYMENT } from '../../lib/labels.js';
import { formatCOP } from '../../lib/format.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useDocumentTitle } from '../../hooks.js';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Card, CardHeader } from '../../components/ui/Card.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { ProductPicker } from '../../components/ProductPicker.jsx';

const cell = 'h-11 w-full rounded-lg bg-surface px-3 text-[15px] ring-1 ring-inset ring-black/10 placeholder:text-ink-mute/70 focus:outline-none focus:ring-2 focus:ring-brand-500';
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
const round2 = (n) => Math.round(n * 100) / 100;

const lineTotals = (line) => {
  const qty = Number(line.quantity) || 0;
  const cost = toNumber(line.unitCost) ?? 0;
  const subtotal = round2(qty * cost);
  const tax = round2((subtotal * Number(line.ivaRate)) / 100);
  return { subtotal, tax, total: round2(subtotal + tax) };
};

export default function NewPurchase() {
  useDocumentTitle('Nueva compra');
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [head, setHead] = useState({ supplierId: '', invoiceNumber: '', purchaseDate: today(), paymentMethod: 'cash', dueDate: '', notes: '' });
  const [lines, setLines] = useState([]);
  const [error, setError] = useState('');

  const { data: supplierData } = useQuery({ queryKey: ['suppliers', 'all'], queryFn: () => api.get('/suppliers', { query: { limit: 100, isActive: true } }), staleTime: 5 * 60 * 1000 });
  const suppliers = supplierData?.data.items ?? [];
  const supplier = suppliers.find((s) => s.id === head.supplierId);

  const setH = (field) => (event) => setHead((c) => ({ ...c, [field]: event.target.value }));
  const updateLine = (key, patch) => setLines((list) => list.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const addProduct = (product) => {
    if (!product) return;
    if (lines.some((l) => l.product.id === product.id && !product.trackBatches)) return; // ferretería: una línea por producto
    setLines((list) => [...list, { key: crypto.randomUUID(), product, batchNumber: '', expiration: '', quantity: '1', unitCost: String(product.costPrice ?? ''), ivaRate: product.ivaRate ?? 0 }]);
  };

  const totals = useMemo(() => lines.reduce((acc, l) => { const t = lineTotals(l); return { subtotal: acc.subtotal + t.subtotal, tax: acc.tax + t.tax, total: acc.total + t.total }; }, { subtotal: 0, tax: 0, total: 0 }), [lines]);

  const lineOk = (l) => Number(l.quantity) >= 1 && (toNumber(l.unitCost) ?? -1) >= 0 && (!l.product.trackBatches || (l.batchNumber.trim() && /^\d{4}-\d{2}(-\d{2})?$/.test(l.expiration)));
  const canSubmit = head.supplierId && head.invoiceNumber.trim() && lines.length > 0 && lines.every(lineOk);

  const create = useMutation({
    mutationFn: (body) => api.post('/purchases', body),
    onSuccess: () => {
      for (const key of ['purchases', 'payables', 'products', 'batches', 'alerts', 'dashboard', 'movements']) queryClient.invalidateQueries({ queryKey: [key] });
      toast.success('Compra registrada: el inventario ya se actualizó');
      navigate('/compras');
    },
    onError: (err) => setError(errorMessage(err)),
  });

  const submit = (event) => {
    event.preventDefault();
    setError('');
    const body = {
      supplierId: head.supplierId,
      invoiceNumber: head.invoiceNumber.trim(),
      purchaseDate: head.purchaseDate,
      paymentMethod: head.paymentMethod,
      items: lines.map((l) => ({
        productId: l.product.id,
        quantity: Number(l.quantity),
        unitCost: toNumber(l.unitCost),
        ivaRate: Number(l.ivaRate),
        ...(l.product.trackBatches && { batchNumber: l.batchNumber.trim(), expirationDate: l.expiration }),
      })),
    };
    if (head.paymentMethod === 'credit' && head.dueDate) body.dueDate = head.dueDate;
    if (head.notes.trim()) body.notes = head.notes.trim();
    create.mutate(body);
  };

  return (
    <form onSubmit={submit}>
      <Link to="/compras" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"><ArrowLeft className="h-4 w-4" aria-hidden /> Compras</Link>
      <PageHeader title="Nueva compra" subtitle="Registra la factura y el inventario entra automáticamente" />

      <Card className="mb-4">
        <CardHeader title="Factura" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select label="Proveedor" value={head.supplierId} onChange={setH('supplierId')} className="sm:col-span-2">
            <option value="">Elige un proveedor</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Input label="N.º de factura" value={head.invoiceNumber} onChange={setH('invoiceNumber')} required />
          <label className="block text-sm font-medium text-ink-soft">Fecha<input type="date" max={today()} value={head.purchaseDate} onChange={setH('purchaseDate')} className="mt-1.5 h-12 w-full rounded-xl bg-surface px-4 text-base ring-1 ring-inset ring-black/10 focus:outline-none focus:ring-2 focus:ring-brand-500" /></label>
          <Select label="Forma de pago" value={head.paymentMethod} onChange={setH('paymentMethod')}>
            {Object.entries(PURCHASE_PAYMENT).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
          {head.paymentMethod === 'credit' && (
            <label className="block text-sm font-medium text-ink-soft">Vence el<input type="date" min={head.purchaseDate} value={head.dueDate} onChange={setH('dueDate')} className="mt-1.5 h-12 w-full rounded-xl bg-surface px-4 text-base ring-1 ring-inset ring-black/10 focus:outline-none focus:ring-2 focus:ring-brand-500" />
              <span className="mt-1 block text-xs font-normal text-ink-mute">{supplier?.paymentTermsDays ? `Vacío = ${supplier.paymentTermsDays} días después de la fecha` : 'Vacío = el mismo día'}</span>
            </label>
          )}
        </div>
      </Card>

      <Card className="mb-4">
        <CardHeader title="Productos" subtitle="Busca cada producto y completa lote, vencimiento y costo" />
        <ProductPicker value={null} onChange={addProduct} label="Buscar producto para agregar" />

        {lines.length === 0 ? (
          <p className="py-10 text-center text-ink-mute">Aún no agregaste productos.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {lines.map((line) => {
              const t = lineTotals(line);
              const batch = line.product.trackBatches;
              return (
                <li key={line.key} className="rounded-2xl bg-black/[0.03] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-ink">{line.product.name} <span className="font-normal text-ink-mute">{line.product.presentation}</span></p>
                    <button type="button" onClick={() => setLines((list) => list.filter((l) => l.key !== line.key))} aria-label={`Quitar ${line.product.name}`} className="rounded-full p-1.5 text-ink-mute hover:bg-black/5 hover:text-bad"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-6">
                    {batch && (
                      <label className="block text-xs font-medium text-ink-mute">Lote
                        <input placeholder="L2401" value={line.batchNumber} onChange={(e) => updateLine(line.key, { batchNumber: e.target.value })} className={`${cell} mt-1`} />
                      </label>
                    )}
                    {batch && (
                      <label className="block text-xs font-medium text-ink-mute">Vence (AAAA-MM)
                        <input placeholder="2028-05" maxLength={10} value={line.expiration} onChange={(e) => updateLine(line.key, { expiration: e.target.value })} className={`${cell} mt-1`} />
                      </label>
                    )}
                    <label className="block text-xs font-medium text-ink-mute">Cantidad
                      <input inputMode="numeric" value={line.quantity} onChange={(e) => updateLine(line.key, { quantity: e.target.value.replace(/\D/g, '') })} className={`${cell} mt-1`} />
                    </label>
                    <label className="block text-xs font-medium text-ink-mute">Costo sin IVA
                      <input inputMode="decimal" value={line.unitCost} onChange={(e) => updateLine(line.key, { unitCost: e.target.value })} className={`${cell} mt-1`} />
                    </label>
                    <label className="block text-xs font-medium text-ink-mute">IVA
                      <select value={line.ivaRate} onChange={(e) => updateLine(line.key, { ivaRate: Number(e.target.value) })} className={`${cell} mt-1`}>
                        {IVA_OPTIONS.map((r) => <option key={r} value={r}>{r}%</option>)}
                      </select>
                    </label>
                    <p className="num flex items-end justify-end pb-2.5 font-semibold text-ink">{formatCOP(t.total)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <div className="grid gap-6 sm:grid-cols-2">
          <Input label="Notas (opcional)" value={head.notes} onChange={setH('notes')} maxLength={500} />
          <div className="space-y-1.5 text-[15px]">
            <div className="flex justify-between text-ink-soft"><span>Subtotal</span><span className="num">{formatCOP(totals.subtotal)}</span></div>
            <div className="flex justify-between text-ink-soft"><span>IVA</span><span className="num">{formatCOP(totals.tax)}</span></div>
            <div className="flex justify-between text-xl font-semibold text-ink"><span>Total</span><span className="num">{formatCOP(totals.total)}</span></div>
          </div>
        </div>
        {error && <p role="alert" className="mt-4 rounded-xl bg-bad-bg px-4 py-3 text-sm text-bad">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Link to="/compras"><Button variant="secondary">Cancelar</Button></Link>
          <Button type="submit" size="lg" loading={create.isPending} disabled={!canSubmit}>Registrar compra</Button>
        </div>
      </Card>
    </form>
  );
}
