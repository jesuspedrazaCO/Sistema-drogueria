import { CircleCheck } from 'lucide-react';
import { PAYMENT_METHODS } from '../../lib/labels.js';
import { formatCOP } from '../../lib/format.js';
import { Modal } from '../../components/ui/Modal.jsx';
import { Button } from '../../components/ui/Button.jsx';

export function ReceiptModal({ sale, onClose }) {
  return (
    <Modal open={Boolean(sale)} onClose={onClose} size="sm" title="Venta registrada" footer={<Button data-autofocus size="lg" className="w-full" onClick={onClose}>Nueva venta</Button>}>
      {sale && (
        <div>
          <div className="mb-5 flex flex-col items-center text-center">
            <span className="mb-3 grid h-14 w-14 place-items-center rounded-full bg-ok-bg text-ok"><CircleCheck className="h-8 w-8" aria-hidden /></span>
            <p className="num text-3xl font-semibold tracking-title text-ink">{formatCOP(sale.total)}</p>
            <p className="text-sm text-ink-mute">Recibo N.º {sale.receiptNumber} · {PAYMENT_METHODS[sale.paymentMethod]}</p>
            {sale.paymentMethod === 'cash' && sale.change > 0 && <p className="num mt-2 rounded-full bg-ok-bg px-3 py-1 text-sm font-medium text-ok">Cambio {formatCOP(sale.change)}</p>}
          </div>
          <ul className="divide-y rounded-2xl ring-1 ring-black/[0.06]">
            {sale.items.map((item) => (
              <li key={item.id ?? item.product} className="flex justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="min-w-0 truncate text-ink">{item.quantity} × {item.name}</span>
                <span className="num text-ink-soft">{formatCOP(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}
