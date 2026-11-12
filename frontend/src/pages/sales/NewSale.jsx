import { useMemo, useRef, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShoppingBag, Lock, ScanBarcode } from 'lucide-react';
import { api, errorMessage } from '../../lib/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { can } from '../../lib/permissions.js';
import { toNumber } from '../../lib/forms.js';
import { formatCOP } from '../../lib/format.js';
import { useDebounced, useDocumentTitle, useIsDesktop } from '../../hooks.js';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { SearchInput } from '../../components/ui/SearchInput.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { CartPanel, lineTotal } from './CartPanel.jsx';
import { ReceiptModal } from './ReceiptModal.jsx';

const EMPTY_RX = { formulaNumber: '', doctorName: '', doctorLicense: '', patientName: '', patientDocument: '', issuedAt: '' };
const EMPTY_SALE = { customer: null, paymentMethod: 'cash', amountReceived: '', notes: '', prescription: EMPTY_RX };

export default function NewSale() {
  useDocumentTitle('Nueva venta');
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const searchRef = useRef(null);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [sale, setSale] = useState(EMPTY_SALE);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const debounced = useDebounced(search, 250);
  const isDesktop = useIsDesktop();
  const canDiscount = can(user, 'applyDiscount');
  const canControlled = can(user, 'sellControlled');

  const { data, isLoading, isError, error: loadError } = useQuery({
    queryKey: ['products', 'pos', debounced],
    queryFn: () => api.get('/products', { query: { search: debounced, limit: 24, isActive: true, sort: 'name' } }),
    placeholderData: keepPreviousData,
  });
  const products = data?.data.items ?? [];

  const addProduct = (product) => {
    if (product.stock <= 0 || (product.isControlled && !canControlled)) return;
    setError('');
    setCart((lines) => {
      const existing = lines.find((line) => line.product.id === product.id);
      if (existing) return lines.map((line) => (line === existing ? { ...line, quantity: Math.min(line.quantity + 1, product.stock) } : line));
      return [...lines, { product, quantity: 1, discount: 0 }];
    });
  };

  // Enter en el buscador: lector de código de barras (coincidencia exacta) o único resultado
  const onSearchKeyDown = (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const text = search.trim().toLowerCase();
    const match = products.find((p) => p.barcode && p.barcode.toLowerCase() === text) ?? (products.length === 1 ? products[0] : null);
    if (match) {
      addProduct(match);
      setSearch('');
    }
  };

  const rxNeeded = cart.some((line) => line.product.requiresPrescription || line.product.isControlled);
  const controlled = cart.some((line) => line.product.isControlled);
  const total = cart.reduce((sum, line) => sum + lineTotal(line), 0);
  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);

  const rxComplete = useMemo(() => {
    if (!rxNeeded) return true;
    const rx = sale.prescription;
    const required = ['formulaNumber', 'doctorName', 'patientName', 'patientDocument', ...(controlled ? ['doctorLicense', 'issuedAt'] : [])];
    return required.every((field) => rx[field].trim());
  }, [rxNeeded, controlled, sale.prescription]);

  const received = toNumber(sale.amountReceived);
  const cashOk = sale.paymentMethod !== 'cash' || received === undefined || received >= total;
  const canSubmit = cart.length > 0 && total > 0 && rxComplete && cashOk;

  const create = useMutation({
    mutationFn: (body) => api.post('/sales', body),
    onSuccess: ({ data: result }) => {
      setReceipt(result.sale);
      setSheetOpen(false);
      for (const key of ['products', 'dashboard', 'alerts', 'sales']) queryClient.invalidateQueries({ queryKey: [key] });
    },
    onError: (err) => setError(errorMessage(err)),
  });

  const submit = () => {
    setError('');
    const body = {
      items: cart.map((line) => ({ productId: line.product.id, quantity: line.quantity, ...(line.discount > 0 && { discount: line.discount }) })),
      paymentMethod: sale.paymentMethod,
    };
    if (sale.customer) body.customerId = sale.customer.id;
    if (sale.paymentMethod === 'cash' && received !== undefined) body.amountReceived = received;
    if (sale.notes.trim()) body.notes = sale.notes.trim();
    if (rxNeeded) {
      body.prescription = Object.fromEntries(Object.entries(sale.prescription).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v));
    }
    create.mutate(body);
  };

  const finish = () => {
    setReceipt(null);
    setCart([]);
    setSale(EMPTY_SALE);
    setSearch('');
    searchRef.current?.focus();
  };

  const panel = (
    <CartPanel cart={cart} setCart={setCart} sale={sale} setSale={setSale} canDiscount={canDiscount} error={error} submitting={create.isPending} canSubmit={canSubmit} onSubmit={submit} rxNeeded={rxNeeded} controlled={controlled} />
  );

  return (
    <>
      <PageHeader title="Nueva venta" subtitle="Busca o escanea un producto para agregarlo" />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section aria-label="Productos">
          <SearchInput ref={searchRef} autoFocus value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch('')} onKeyDown={onSearchKeyDown} placeholder="Nombre, código de barras o principio activo" label="Buscar producto" />
          <p className="mt-2 flex items-center gap-1.5 px-1 text-xs text-ink-mute"><ScanBarcode className="h-3.5 w-3.5" aria-hidden /> Con el lector, escanea y se agrega solo.</p>

          {isError && <p role="alert" className="mt-4 rounded-xl bg-bad-bg px-4 py-3 text-bad">{errorMessage(loadError)}</p>}

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {isLoading
              ? Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
              : products.map((product) => {
                  const blocked = product.isControlled && !canControlled;
                  const out = product.stock <= 0;
                  const inCart = cart.find((line) => line.product.id === product.id)?.quantity;
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => addProduct(product)}
                      disabled={out || blocked}
                      className="relative flex flex-col rounded-2xl bg-surface p-4 text-left shadow-card transition enabled:hover:shadow-pop enabled:active:scale-[0.985] disabled:opacity-55"
                    >
                      {inCart && <span className="num absolute right-3 top-3 grid h-6 min-w-6 place-items-center rounded-full bg-brand-600 px-1.5 text-xs font-semibold text-white">{inCart}</span>}
                      <span className="line-clamp-2 pr-7 font-medium leading-snug text-ink">{product.name}</span>
                      <span className="mt-0.5 truncate text-sm text-ink-mute">{[product.presentation, product.brand].filter(Boolean).join(' · ') || ' '}</span>
                      <span className="mt-auto flex items-end justify-between pt-3">
                        <span className="num text-lg font-semibold text-ink">{formatCOP(product.salePrice)}</span>
                        {blocked ? <Badge tone="warn"><Lock className="mr-1 h-3 w-3" aria-hidden />Solo regente</Badge> : out ? <Badge tone="bad">Agotado</Badge> : <Badge tone={product.stockStatus === 'low' ? 'warn' : 'neutral'}>{product.stock} disp.</Badge>}
                      </span>
                    </button>
                  );
                })}
          </div>
          {!isLoading && products.length === 0 && <p className="py-12 text-center text-ink-mute">No encontramos productos con “{debounced}”.</p>}
        </section>

        {isDesktop && (
        <aside aria-label="Venta actual">
          <div className="sticky top-6 flex max-h-[calc(100vh-12rem)] min-h-[28rem] flex-col overflow-y-auto rounded-3xl bg-surface px-5 pt-5 shadow-card">
            <h2 className="mb-3 text-[17px] font-semibold text-ink">Venta actual</h2>
            {panel}
          </div>
        </aside>
        )}
      </div>

      {!isDesktop && cart.length > 0 && (
        <button type="button" onClick={() => setSheetOpen(true)} className="fixed inset-x-4 bottom-[76px] z-30 flex items-center justify-between rounded-full bg-brand-600 px-5 py-3.5 text-white shadow-pop lg:hidden">
          <span className="flex items-center gap-2 font-medium"><ShoppingBag className="h-5 w-5" aria-hidden /> Ver venta ({itemCount})</span>
          <span className="num font-semibold">{formatCOP(total)}</span>
        </button>
      )}

      {!isDesktop && (
        <Modal open={sheetOpen} onClose={() => setSheetOpen(false)} title="Venta actual">
          {panel}
        </Modal>
      )}
      <ReceiptModal sale={receipt} onClose={finish} />
    </>
  );
}
