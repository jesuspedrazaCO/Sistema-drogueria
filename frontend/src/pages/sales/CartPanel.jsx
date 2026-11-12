import { Minus, Plus, Trash2 } from 'lucide-react';
import { PAYMENT_METHODS } from '../../lib/labels.js';
import { toNumber } from '../../lib/forms.js';
import { formatCOP } from '../../lib/format.js';
import { Segmented } from '../../components/ui/Segmented.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { CustomerPicker } from './CustomerPicker.jsx';

const smallInput = 'h-10 w-full rounded-lg bg-surface px-3 text-[15px] ring-1 ring-inset ring-black/10 placeholder:text-ink-mute/70 focus:outline-none focus:ring-2 focus:ring-brand-500';

export const lineTotal = (line) => Math.max(0, line.product.salePrice * line.quantity - (line.discount || 0));

export function CartPanel({ cart, setCart, sale, setSale, canDiscount, error, submitting, canSubmit, onSubmit, rxNeeded, controlled }) {
  const total = cart.reduce((sum, line) => sum + lineTotal(line), 0);
  const received = toNumber(sale.amountReceived);
  const change = sale.paymentMethod === 'cash' && received !== undefined ? received - total : null;

  const update = (id, patch) => setCart((lines) => lines.map((line) => (line.product.id === id ? { ...line, ...patch } : line)));
  const setQty = (line, qty) => {
    const next = Math.min(Math.max(1, Math.floor(Number(qty) || 1)), line.product.stock);
    update(line.product.id, { quantity: next });
  };
  const setField = (field) => (event) => setSale((current) => ({ ...current, [field]: event.target.value }));
  const setRx = (field) => (event) => setSale((current) => ({ ...current, prescription: { ...current.prescription, [field]: event.target.value } }));

  return (
    <div className="flex min-h-full flex-col pb-5">
      {cart.length === 0 ? (
        <p className="py-10 text-center text-ink-mute">Agrega productos para empezar la venta.</p>
      ) : (
        <ul className="-mx-1 divide-y">
          {cart.map((line) => (
            <li key={line.product.id} className="px-1 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium leading-snug text-ink">{line.product.name}</p>
                  <p className="num text-sm text-ink-mute">{formatCOP(line.product.salePrice)} c/u</p>
                </div>
                <button type="button" onClick={() => setCart((lines) => lines.filter((l) => l.product.id !== line.product.id))} aria-label={`Quitar ${line.product.name}`} className="rounded-full p-1.5 text-ink-mute hover:bg-black/5 hover:text-bad">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <div className="flex items-center rounded-full bg-black/[0.06]">
                  <button type="button" onClick={() => setQty(line, line.quantity - 1)} disabled={line.quantity <= 1} aria-label="Menos" className="rounded-full p-2 disabled:opacity-30"><Minus className="h-4 w-4" /></button>
                  <input aria-label={`Cantidad de ${line.product.name}`} inputMode="numeric" value={line.quantity} onChange={(e) => setQty(line, e.target.value)} className="num w-10 bg-transparent text-center font-semibold focus:outline-none" />
                  <button type="button" onClick={() => setQty(line, line.quantity + 1)} disabled={line.quantity >= line.product.stock} aria-label="Más" className="rounded-full p-2 disabled:opacity-30"><Plus className="h-4 w-4" /></button>
                </div>
                <span className="num font-semibold text-ink">{formatCOP(lineTotal(line))}</span>
              </div>
              {canDiscount &&
                (line.showDiscount || line.discount > 0 ? (
                  <input aria-label={`Descuento en pesos para ${line.product.name}`} inputMode="numeric" placeholder="Descuento ($)" value={line.discountText ?? ''} onChange={(e) => update(line.product.id, { discountText: e.target.value, discount: toNumber(e.target.value) ?? 0 })} className={`${smallInput} mt-2`} />
                ) : (
                  <button type="button" onClick={() => update(line.product.id, { showDiscount: true })} className="mt-1.5 text-sm font-medium text-brand-600 hover:text-brand-700">Aplicar descuento</button>
                ))}
              {line.quantity >= line.product.stock && <p className="mt-1.5 text-xs text-warn">Máximo disponible: {line.product.stock}</p>}
            </li>
          ))}
        </ul>
      )}

      {cart.length > 0 && (
        <div className="mt-4 space-y-4 border-t pt-4">
          <CustomerPicker value={sale.customer} onChange={(customer) => setSale((current) => ({ ...current, customer }))} />

          {rxNeeded && (
            <fieldset className="space-y-2 rounded-xl bg-warn-bg/60 p-3">
              <legend className="px-1 text-sm font-semibold text-warn">Fórmula médica {controlled && '(control especial)'}</legend>
              <input aria-label="Número de fórmula" placeholder="Número de fórmula" value={sale.prescription.formulaNumber} onChange={setRx('formulaNumber')} className={smallInput} />
              <input aria-label="Médico" placeholder="Nombre del médico" value={sale.prescription.doctorName} onChange={setRx('doctorName')} className={smallInput} />
              <input aria-label="Paciente" placeholder="Nombre del paciente" value={sale.prescription.patientName} onChange={setRx('patientName')} className={smallInput} />
              <input aria-label="Documento del paciente" placeholder="Documento del paciente" value={sale.prescription.patientDocument} onChange={setRx('patientDocument')} className={smallInput} />
              {controlled && (
                <>
                  <input aria-label="Registro médico" placeholder="Registro médico del médico" value={sale.prescription.doctorLicense} onChange={setRx('doctorLicense')} className={smallInput} />
                  <label className="block text-xs text-ink-soft">Fecha de la fórmula
                    <input type="date" max={new Date().toISOString().slice(0, 10)} value={sale.prescription.issuedAt} onChange={setRx('issuedAt')} className={`${smallInput} mt-1`} />
                  </label>
                </>
              )}
            </fieldset>
          )}

          <Segmented label="Medio de pago" value={sale.paymentMethod} onChange={(paymentMethod) => setSale((current) => ({ ...current, paymentMethod }))} options={Object.entries(PAYMENT_METHODS).map(([value, label]) => ({ value, label }))} />

          {sale.paymentMethod === 'cash' && (
            <div>
              <div className="flex gap-2">
                <input aria-label="Efectivo recibido" inputMode="numeric" placeholder="Efectivo recibido" value={sale.amountReceived} onChange={setField('amountReceived')} className={smallInput} />
                <Button variant="secondary" size="sm" className="h-10 shrink-0" onClick={() => setSale((current) => ({ ...current, amountReceived: String(total) }))}>Exacto</Button>
              </div>
              {change !== null && (
                <p className={`num mt-2 text-sm font-medium ${change < 0 ? 'text-bad' : 'text-ok'}`}>
                  {change < 0 ? `Faltan ${formatCOP(-change)}` : `Cambio: ${formatCOP(change)}`}
                </p>
              )}
            </div>
          )}
          <input aria-label="Notas" placeholder="Notas (opcional)" maxLength={300} value={sale.notes} onChange={setField('notes')} className={smallInput} />
        </div>
      )}

      <div className="sticky bottom-0 z-[1] mt-auto bg-surface pt-4">
        {error && <p role="alert" className="mb-3 rounded-xl bg-bad-bg px-4 py-3 text-sm text-bad">{error}</p>}
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-ink-mute">Total</span>
          <span className="num text-3xl font-semibold tracking-title text-ink">{formatCOP(total)}</span>
        </div>
        <Button size="lg" className="w-full" loading={submitting} disabled={!canSubmit} onClick={onSubmit}>
          Cobrar {cart.length > 0 && formatCOP(total)}
        </Button>
      </div>
    </div>
  );
}
