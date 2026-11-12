import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '../../lib/api.js';
import { fieldErrors } from '../../lib/forms.js';
import { DOC_TYPES } from '../../lib/labels.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Button } from '../../components/ui/Button.jsx';

const EMPTY = { name: '', documentType: 'CC', documentNumber: '', phone: '', email: '', address: '', notes: '' };
const TEXT = ['name', 'documentNumber', 'phone', 'email', 'address', 'notes'];

export function CustomerForm({ open, customer, onClose }) {
  const editing = Boolean(customer);
  const toast = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(customer ? Object.fromEntries(Object.keys(EMPTY).map((key) => [key, customer[key] ?? EMPTY[key]])) : EMPTY);
      setErrors({});
      setFormError('');
    }
  }, [open, customer]);

  const set = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const save = useMutation({
    mutationFn: (body) => (editing ? api.patch(`/customers/${customer.id}`, body) : api.post('/customers', body)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success(editing ? 'Cliente actualizado' : 'Cliente creado');
      onClose();
    },
    onError: (err) => {
      setErrors(fieldErrors(err));
      setFormError(errorMessage(err));
    },
  });

  const submit = (event) => {
    event.preventDefault();
    setErrors({});
    setFormError('');
    const body = { documentType: form.documentType };
    for (const key of TEXT) {
      const value = form[key].trim();
      if (value || editing) body[key] = value;
    }
    save.mutate(body);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar cliente' : 'Nuevo cliente'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="customer-form" loading={save.isPending} disabled={form.name.trim().length < 2}>{editing ? 'Guardar cambios' : 'Crear cliente'}</Button>
        </>
      }
    >
      <form id="customer-form" onSubmit={submit} className="space-y-4" noValidate>
        {formError && !Object.keys(errors).length && <p role="alert" className="rounded-xl bg-bad-bg px-4 py-3 text-sm text-bad">{formError}</p>}
        <Input label="Nombre" data-autofocus value={form.name} onChange={set('name')} error={errors.name} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Tipo de documento" value={form.documentType} onChange={set('documentType')}>
            {Object.entries(DOC_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
          <Input label="Número de documento" inputMode="numeric" value={form.documentNumber} onChange={set('documentNumber')} error={errors.documentNumber} />
          <Input label="Teléfono" type="tel" value={form.phone} onChange={set('phone')} error={errors.phone} />
          <Input label="Correo" type="email" value={form.email} onChange={set('email')} error={errors.email} />
        </div>
        <Input label="Dirección" value={form.address} onChange={set('address')} error={errors.address} />
        <Input label="Notas" value={form.notes} onChange={set('notes')} error={errors.notes} />
      </form>
    </Modal>
  );
}
