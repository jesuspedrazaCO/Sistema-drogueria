import { useQuery } from '@tanstack/react-query';
import { Pencil } from 'lucide-react';
import { api, errorMessage } from '../../lib/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { can } from '../../lib/permissions.js';
import { AREAS, STORAGE, STOCK_STATUS, expiryLabel, expiryTone } from '../../lib/labels.js';
import { formatCOP, formatDate, formatNumber } from '../../lib/format.js';
import { Modal } from '../../components/ui/Modal.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';

function Fact({ label, children }) {
  if (children === undefined || children === null || children === '') return null;
  return (
    <div>
      <dt className="text-xs text-ink-mute">{label}</dt>
      <dd className="mt-0.5 text-[15px] text-ink">{children}</dd>
    </div>
  );
}

export function ProductDetail({ id, onClose, onEdit }) {
  const { user } = useAuth();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['product', id],
    queryFn: () => api.get(`/products/${id}`),
    enabled: Boolean(id),
  });
  const product = data?.data.product;
  const batches = data?.data.batches ?? [];
  const status = product && STOCK_STATUS[product.stockStatus];
  const showCosts = product && product.costPrice !== undefined;

  return (
    <Modal
      open={Boolean(id)}
      onClose={onClose}
      size="lg"
      title={product?.name ?? 'Producto'}
      description={product ? [product.brand, product.presentation].filter(Boolean).join(' · ') : undefined}
      footer={
        product && can(user, 'manageCatalog') ? (
          <Button variant="secondary" onClick={() => onEdit(product)}>
            <Pencil className="h-4 w-4" aria-hidden /> Editar
          </Button>
        ) : undefined
      }
    >
      {isLoading && <Skeleton className="h-48 w-full" />}
      {isError && <p role="alert" className="text-bad">{errorMessage(error)}</p>}
      {product && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={status.tone}>{status.label}</Badge>
            <Badge>{AREAS[product.area]}</Badge>
            {!product.isActive && <Badge tone="bad">Inactivo</Badge>}
            {product.requiresPrescription && <Badge tone="warn">Con fórmula</Badge>}
            {product.isControlled && <Badge tone="bad">Control especial</Badge>}
            {product.storageCondition === 'cold' && <Badge tone="brand">Refrigerado</Badge>}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-black/[0.03] p-4">
              <p className="text-xs text-ink-mute">En stock</p>
              <p className="num mt-1 text-2xl font-semibold text-ink">{formatNumber(product.stock)}</p>
              <p className="text-xs text-ink-mute">Mínimo {formatNumber(product.minStock)}</p>
            </div>
            <div className="rounded-2xl bg-black/[0.03] p-4">
              <p className="text-xs text-ink-mute">Precio</p>
              <p className="num mt-1 text-2xl font-semibold text-ink">{formatCOP(product.salePrice)}</p>
              <p className="text-xs text-ink-mute">IVA {product.ivaRate}% incl.</p>
            </div>
            {showCosts && (
              <div className="rounded-2xl bg-black/[0.03] p-4">
                <p className="text-xs text-ink-mute">Costo</p>
                <p className="num mt-1 text-2xl font-semibold text-ink">{formatCOP(product.costPrice)}</p>
                <p className="text-xs text-ink-mute">Último de compra</p>
              </div>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            <Fact label="Código de barras">{product.barcode}</Fact>
            <Fact label="SKU">{product.sku}</Fact>
            <Fact label="Categoría">{product.category}</Fact>
            <Fact label="Principio activo">{product.activeIngredient}</Fact>
            <Fact label="Concentración">{product.concentration}</Fact>
            <Fact label="Forma">{product.pharmaceuticalForm}</Fact>
            <Fact label="Registro INVIMA">{product.invimaRegistry}</Fact>
            <Fact label="Almacenamiento">{product.area === 'drogueria' ? STORAGE[product.storageCondition] : undefined}</Fact>
            <Fact label="Ubicación">{product.location}</Fact>
          </dl>

          {product.trackBatches && (
            <section>
              <h3 className="mb-2 text-[15px] font-semibold text-ink">Lotes con existencias</h3>
              <p className="mb-3 text-sm text-ink-mute">Se venden en este orden: primero el que vence antes.</p>
              {batches.length === 0 ? (
                <p className="rounded-xl bg-black/[0.03] px-4 py-6 text-center text-ink-mute">No hay lotes con existencias.</p>
              ) : (
                <ul className="divide-y rounded-2xl ring-1 ring-black/[0.06]">
                  {batches.map((batch, index) => (
                    <li key={batch.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="num grid h-6 w-6 place-items-center rounded-full bg-black/5 text-xs font-medium text-ink-soft">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-ink">Lote {batch.batchNumber}</p>
                        <p className="text-sm text-ink-mute">Vence {formatDate(batch.expirationDate)}</p>
                      </div>
                      <Badge tone={expiryTone(batch.daysToExpire)}>{expiryLabel(batch.daysToExpire)}</Badge>
                      <span className="num w-14 text-right font-semibold text-ink">{formatNumber(batch.quantityAvailable)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      )}
    </Modal>
  );
}
