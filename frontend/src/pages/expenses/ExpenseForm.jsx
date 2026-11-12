import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ban } from 'lucide-react';
import { api, errorMessage } from '../../lib/api.js';
import { fieldErrors, toNumber } from '../../lib/forms.js';
import { EXPENSE_AREAS, EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../../lib/labels.js';
import { lastDays } from '../../lib/format.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Button } from '../../components/ui/Button.jsx';

const today = () => lastDays(1)[0];
const EMPTY = () => ({ description: '', amount: '', category: 'other', area: 'general', date: today(), paymentMethod: 'cash', receiptNumber: '', notes: '' });

export function ExpenseForm({ open, expense, onClose }) {
  const editing = Boolean(expense);
  const toast = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY());
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [voiding, setVoiding] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) {
      setForm(expense ? { description: expense.description, amount: String(expense.amount), category: expense.category, area: expense.area ?? 'general', date: String(expense.date).slice(0, 10), paymentMethod: expense.paymentMethod ?? 'cash', receiptNumber: expense.receiptNumber ?? '', notes: expense.notes ?? '' } : EMPTY());
      setErrors({});
      setFormError('');
      setVoiding(false);
      setReason('');
    }
  }, [open, expense]);

  const set = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['expenses'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['report'] });
  };

  const save = useMutation({
    mutationFn: (body) => (editing ? api.patch(`/expenses/${expense.id}`, body) : api.post('/expenses', body)),
    onSuccess: () => { refresh(); toast.success(editing ? 'Gasto actualizado' : 'Gasto registrado'); onClose(); },
    onError: (err) => { setErrors(fieldErrors(err)); setFormError(errorMessage(err)); },
  });
  const voidExpense = useMutation({
    mutationFn: () => api.post(`/expenses/${expense.id}/void`, { reason: reason.trim() }),
    onSuccess: () => { refresh(); toast.success('Gasto anulado'); onClose(); },
    onError: (err) => setFormError(errorMessage(err)),
  });

  const submit = (event) => {
    event.preventDefault();
    setErrors({});
    setFormError('');
    const body = { description: form.description.trim(), amount: toNumber(form.amount), category: form.category, area: form.area, date: form.date, paymentMethod: form.paymentMethod };
    if (form.receiptNumber.trim() || editing) body.receiptNumber = form.receiptNumber.trim();
    if (form.notes.trim() || editing) body.notes = form.notes.trim();
    save.mutate(body);
  };

  const valid = form.description.trim().length >= 3 && (toNumber(form.amount) ?? 0) > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar gasto' : 'Nuevo gasto'}
      footer={
        voiding ? (
          <>
            <Button variant="secondary" onClick={() => setVoiding(false)}>Cancelar</Button>
            <Button variant="danger" loading={voidExpense.isPending} disabled={reason.trim().length < 5} onClick={() => { setFormError(''); voidExpense.mutate(); }}>Confirmar anulación</Button>
          </>
        ) : (
          <>
            {editing && <Button variant="secondary" className="mr-auto" onClick={() => setVoiding(true)}><Ban className="h-4 w-4" aria-hidden /> Anular</Button>}
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit" form="expense-form" loading={save.isPending} disabled={!valid}>{editing ? 'Guardar cambios' : 'Registrar gasto'}</Button>
          </>
        )
      }
    >
      <form id="expense-form" onSubmit={submit} className="space-y-4" noValidate>
        {formError && !Object.keys(errors).length && <p role="alert" className="rounded-xl bg-bad-bg px-4 py-3 text-sm text-bad">{formError}</p>}
        <Input label="Descripción" data-autofocus placeholder="Ej.: Arriendo del local de noviembre" value={form.description} onChange={set('description')} error={errors.description} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Valor" inputMode="numeric" value={form.amount} onChange={set('amount')} error={errors.amount} required />
          <label className="block text-sm font-medium text-ink-soft">Fecha<input type="date" max={today()} value={form.date} onChange={set('date')} className="mt-1.5 h-12 w-full rounded-xl bg-surface px-4 text-base ring-1 ring-inset ring-black/10 focus:outline-none focus:ring-2 focus:ring-brand-500" /></label>
          <Select label="Categoría" value={form.category} onChange={set('category')}>
            {Object.entries(EXPENSE_CATEGORIES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
          <Select label="Área" value={form.area} onChange={set('area')}>
            {Object.entries(EXPENSE_AREAS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
          <Select label="Pagado con" value={form.paymentMethod} onChange={set('paymentMethod')}>
            {Object.entries(PAYMENT_METHODS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
          <Input label="N.º de comprobante" value={form.receiptNumber} onChange={set('receiptNumber')} error={errors.receiptNumber} />
        </div>
        <Input label="Notas" value={form.notes} onChange={set('notes')} error={errors.notes} />
        {voiding && (
          <div>
            <label htmlFor="void-expense" className="mb-1.5 block text-sm font-medium text-ink-soft">Motivo de la anulación</label>
            <input id="void-expense" data-autofocus value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} className="h-12 w-full rounded-xl bg-surface px-4 text-base ring-1 ring-inset ring-black/10 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            {formError && <p role="alert" className="mt-2 text-sm text-bad">{formError}</p>}
          </div>
        )}
      </form>
    </Modal>
  );
}
