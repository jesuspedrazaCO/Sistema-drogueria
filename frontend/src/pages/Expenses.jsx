import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { CircleDollarSign, Plus } from 'lucide-react';
import { api, errorMessage } from '../lib/api.js';
import { EXPENSE_AREAS, EXPENSE_CATEGORIES } from '../lib/labels.js';
import { rangeById } from '../lib/ranges.js';
import { formatCOP, formatCompactCOP, formatDate, formatYMD } from '../lib/format.js';
import { useDebounced, useDocumentTitle } from '../hooks.js';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Card, CardHeader } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { SearchInput } from '../components/ui/SearchInput.jsx';
import { Select } from '../components/ui/Select.jsx';
import { Pagination } from '../components/ui/Pagination.jsx';
import { RangePicker } from '../components/RangePicker.jsx';
import { ExpenseForm } from './expenses/ExpenseForm.jsx';

export default function Expenses() {
  useDocumentTitle('Gastos');
  const [rangeId, setRangeId] = useState('month');
  const [filters, setFilters] = useState({ category: '', area: '' });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ open: false, expense: null });
  const debounced = useDebounced(search);
  const range = rangeById(rangeId);
  const { from, to } = range.get();
  const set = (field) => (event) => { setFilters((c) => ({ ...c, [field]: event.target.value })); setPage(1); };

  const listQuery = { page, limit: 20, from, to, search: debounced, ...filters };
  const { data, isLoading, isError, error, isPlaceholderData } = useQuery({
    queryKey: ['expenses', 'list', listQuery],
    queryFn: () => api.get('/expenses', { query: listQuery }),
    placeholderData: keepPreviousData,
  });
  const summaryQuery = { from, to, ...(filters.area && { area: filters.area }) };
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['expenses', 'summary', summaryQuery],
    queryFn: () => api.get('/expenses/summary', { query: summaryQuery }),
  });
  const result = data?.data;
  const summary = summaryData?.data;
  const max = Math.max(1, ...(summary?.byCategory.map((row) => row.total) ?? [1]));

  return (
    <>
      <PageHeader title="Gastos" subtitle="Lo que gasta el negocio" actions={<Button onClick={() => setForm({ open: true, expense: null })}><Plus className="h-4 w-4" aria-hidden /> Nuevo gasto</Button>} />
      <div className="mb-5"><RangePicker value={rangeId} onChange={(id) => { setRangeId(id); setPage(1); }} /></div>

      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <Card>
          <p className="text-sm font-medium text-ink-mute">Total del periodo</p>
          {summaryLoading ? <Skeleton className="mt-3 h-9 w-40" /> : <p className="num mt-2 text-[32px] font-semibold leading-tight tracking-title text-ink">{formatCOP(summary?.total)}</p>}
          <p className="mt-1 text-sm text-ink-mute">{formatYMD(from)} – {formatYMD(to)}</p>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Por categoría" />
          {summaryLoading ? <Skeleton className="h-24 w-full" /> : summary?.byCategory.length === 0 ? (
            <p className="py-4 text-ink-mute">No hay gastos en este periodo.</p>
          ) : (
            <ul className="space-y-3">
              {summary?.byCategory.map((row) => (
                <li key={row.category}>
                  <div className="mb-1 flex justify-between text-sm"><span className="text-ink">{EXPENSE_CATEGORIES[row.category] ?? row.category}</span><span className="num text-ink-mute">{formatCompactCOP(row.total)}</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-black/5"><div className="h-full rounded-full bg-brand-600" style={{ width: `${(row.total / max) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <SearchInput value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} onClear={() => setSearch('')} placeholder="Buscar por descripción" label="Buscar gastos" />
        <Select aria-label="Categoría" value={filters.category} onChange={set('category')} className="min-w-44">
          <option value="">Todas las categorías</option>
          {Object.entries(EXPENSE_CATEGORIES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </Select>
        <Select aria-label="Área" value={filters.area} onChange={set('area')} className="min-w-36">
          <option value="">Todas las áreas</option>
          {Object.entries(EXPENSE_AREAS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </Select>
      </div>

      {isError && <p role="alert" className="mb-4 rounded-xl bg-bad-bg px-4 py-3 text-bad">{errorMessage(error)}</p>}

      <Card padded={false} className={isPlaceholderData ? 'opacity-60 transition' : 'transition'}>
        {isLoading ? (
          <div className="space-y-3 p-5">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : result?.items.length === 0 ? (
          <EmptyState icon={CircleDollarSign} title="Sin gastos" description="No hay gastos con estos filtros." action={<Button onClick={() => setForm({ open: true, expense: null })}>Registrar gasto</Button>} />
        ) : (
          <ul className="divide-y">
            {result?.items.map((expense) => (
              <li key={expense.id}>
                <button type="button" onClick={() => setForm({ open: true, expense })} className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition hover:bg-black/[0.025]">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{expense.description}</p>
                    <p className="truncate text-sm text-ink-mute">{formatDate(expense.date)} · {EXPENSE_AREAS[expense.area] ?? 'General'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="num font-semibold text-ink">{formatCOP(expense.amount)}</span>
                    <Badge>{EXPENSE_CATEGORIES[expense.category] ?? expense.category}</Badge>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Pagination page={result?.page ?? 1} pages={result?.pages} total={result?.total} onChange={setPage} />
      <ExpenseForm open={form.open} expense={form.expense} onClose={() => setForm({ open: false, expense: null })} />
    </>
  );
}
