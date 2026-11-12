import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Layers, Lock, LockOpen, Trash2 } from 'lucide-react';
import { api, errorMessage } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { can } from '../lib/permissions.js';
import { expiryLabel, expiryTone } from '../lib/labels.js';
import { formatCOP, formatDate, formatNumber } from '../lib/format.js';
import { useDebounced, useDocumentTitle } from '../hooks.js';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { SearchInput } from '../components/ui/SearchInput.jsx';
import { Segmented } from '../components/ui/Segmented.jsx';
import { Pagination } from '../components/ui/Pagination.jsx';

const STATUS = [
  { value: '', label: 'Todos' },
  { value: 'expiring', label: 'Por vencer' },
  { value: 'expired', label: 'Vencidos' },
  { value: 'blocked', label: 'Bloqueados' },
];

export default function Batches() {
  useDocumentTitle('Lotes y vencimientos');
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const canManage = can(user, 'manageInventory');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [block, setBlock] = useState(null); // lote a bloquear
  const [reason, setReason] = useState('');
  const [writeOff, setWriteOff] = useState(false);
  const [actionError, setActionError] = useState('');
  const debounced = useDebounced(search);

  const query = { page, limit: 20, status, search: debounced, days: 90 };
  const { data, isLoading, isError, error, isPlaceholderData } = useQuery({
    queryKey: ['batches', query],
    queryFn: () => api.get('/batches', { query }),
    placeholderData: keepPreviousData,
  });
  const result = data?.data;

  const refresh = () => {
    for (const key of ['batches', 'products', 'product', 'alerts', 'dashboard']) queryClient.invalidateQueries({ queryKey: [key] });
  };
  const toggleBlock = useMutation({
    mutationFn: ({ batch, blocked, why }) => api.patch(`/batches/${batch.id}/block`, { blocked, ...(why && { reason: why }) }),
    onSuccess: (_res, vars) => {
      refresh();
      toast.success(vars.blocked ? 'Lote bloqueado: no se venderá' : 'Lote desbloqueado');
      setBlock(null);
      setReason('');
    },
    onError: (err) => setActionError(errorMessage(err)),
  });
  const writeOffExpired = useMutation({
    mutationFn: () => api.post('/inventory/write-offs/expired', {}),
    onSuccess: ({ data: out }) => {
      refresh();
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      toast.success(`Baja registrada: ${formatNumber(out.units)} unidades en ${out.batches} lotes (${formatCOP(out.lostValue)})`);
      setWriteOff(false);
    },
    onError: (err) => setActionError(errorMessage(err)),
  });

  const openBlock = (batch) => { setActionError(''); setReason(''); setBlock(batch); };

  return (
    <>
      <PageHeader
        title="Lotes y vencimientos"
        subtitle="Se venden primero los que vencen antes"
        actions={canManage && <Button variant="secondary" onClick={() => { setActionError(''); setWriteOff(true); }}><Trash2 className="h-4 w-4" aria-hidden /> Dar de baja vencidos</Button>}
      />

      <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_auto]">
        <SearchInput value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} onClear={() => setSearch('')} placeholder="Número de lote" label="Buscar lote" />
        <Segmented label="Estado" value={status} onChange={(value) => { setStatus(value); setPage(1); }} options={STATUS} />
      </div>

      {isError && <p role="alert" className="mb-4 rounded-xl bg-bad-bg px-4 py-3 text-bad">{errorMessage(error)}</p>}

      <Card padded={false} className={isPlaceholderData ? 'opacity-60 transition' : 'transition'}>
        {isLoading ? (
          <div className="space-y-3 p-5">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : result?.items.length === 0 ? (
          <EmptyState icon={Layers} title="No hay lotes" description="Con los filtros actuales no hay lotes con existencias." />
        ) : (
          <ul className="divide-y">
            {result?.items.map((batch) => (
              <li key={batch.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{batch.product?.name ?? 'Producto'}</p>
                  <p className="text-sm text-ink-mute">Lote {batch.batchNumber} · vence {formatDate(batch.expirationDate)}{batch.unitCost !== undefined && ` · costo ${formatCOP(batch.unitCost)}`}</p>
                  {batch.isBlocked && <p className="text-sm text-bad">Bloqueado{batch.blockedReason ? `: ${batch.blockedReason}` : ''}</p>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="num text-[17px] font-semibold leading-none text-ink">{formatNumber(batch.quantityAvailable)}</span>
                  <Badge tone={expiryTone(batch.daysToExpire)}>{expiryLabel(batch.daysToExpire)}</Badge>
                </div>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => (batch.isBlocked ? toggleBlock.mutate({ batch, blocked: false }) : openBlock(batch))}
                    aria-label={batch.isBlocked ? `Desbloquear lote ${batch.batchNumber}` : `Bloquear lote ${batch.batchNumber}`}
                    title={batch.isBlocked ? 'Desbloquear' : 'Bloquear'}
                    className="rounded-full p-2 text-ink-mute hover:bg-black/5 hover:text-ink"
                  >
                    {batch.isBlocked ? <LockOpen className="h-[18px] w-[18px]" /> : <Lock className="h-[18px] w-[18px]" />}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Pagination page={result?.page ?? 1} pages={result?.pages} total={result?.total} onChange={setPage} />

      <Modal
        open={Boolean(block)}
        onClose={() => setBlock(null)}
        size="sm"
        title="Bloquear lote"
        description={block ? `${block.product?.name} · lote ${block.batchNumber}` : undefined}
        footer={<><Button variant="secondary" onClick={() => setBlock(null)}>Cancelar</Button><Button variant="danger" loading={toggleBlock.isPending} disabled={reason.trim().length < 3} onClick={() => { setActionError(''); toggleBlock.mutate({ batch: block, blocked: true, why: reason.trim() }); }}>Bloquear</Button></>}
      >
        <label htmlFor="block-reason" className="mb-1.5 block text-sm font-medium text-ink-soft">Motivo</label>
        <input id="block-reason" data-autofocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Retiro del mercado, cuarentena…" className="h-12 w-full rounded-xl bg-surface px-4 text-base ring-1 ring-inset ring-black/10 focus:outline-none focus:ring-2 focus:ring-brand-500" />
        <p className="mt-2 text-sm text-ink-mute">Un lote bloqueado no se vende aunque tenga stock. Puedes desbloquearlo después.</p>
        {actionError && <p role="alert" className="mt-2 text-sm text-bad">{actionError}</p>}
      </Modal>

      <Modal
        open={writeOff}
        onClose={() => setWriteOff(false)}
        size="sm"
        title="Dar de baja los vencidos"
        footer={<><Button variant="secondary" onClick={() => setWriteOff(false)}>Cancelar</Button><Button variant="danger" loading={writeOffExpired.isPending} onClick={() => { setActionError(''); writeOffExpired.mutate(); }}>Dar de baja</Button></>}
      >
        <p className="text-ink-soft">Se sacará del inventario todo lo que ya esté vencido y quedará en el kardex como baja por vencimiento. Esta acción no se puede deshacer.</p>
        {actionError && <p role="alert" className="mt-3 text-sm text-bad">{actionError}</p>}
      </Modal>
    </>
  );
}
