import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '../../lib/api.js';
import { fieldErrors } from '../../lib/forms.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Button } from '../../components/ui/Button.jsx';

const EMPTY = { name: '', nit: '', contactName: '', phone: '', email: '', address: '', city: '', paymentTermsDays: '0', notes: '' };
const TEXT = ['name', 'nit', 'contactName', 'phone', 'email', 'address', 'city', 'notes'];

export function SupplierForm({ open, supplier, onClose }) {
  const editing = Boolean(supplier);
  const toast = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(supplier ? { ...Object.fromEntries(Object.keys(EMPTY).map((key) => [key, supplier[key] ?? EMPTY[key]])), paymentTermsDays: String(supplier.paymentTermsDays ?? 0) } : EMPTY);
      setErrors({});
      setFormError('');
    }
  }, [open, supplier]);

  const set = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const save = useMutation({
    mutationFn: (body) => (editing ? api.patch(`/suppliers/${supplier.id}`, body) : api.post('/suppliers', body)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success(editing ? 'Proveedor actualizado' : 'Proveedor creado');
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
    const body = { paymentTermsDays: Number(form.paymentTermsDays || 0) };
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
      title={editing ? 'Editar proveedor' : 'Nuevo proveedor'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="supplier-form" loading={save.isPending} disabled={form.name.trim().length < 2}>{editing ? 'Guardar cambios' : 'Crear proveedor'}</Button>
        </>
      }
    >
      <form id="supplier-form" onSubmit={submit} className="space-y-4" noValidate>
        {formError && !Object.keys(errors).length && <p role="alert" className="rounded-xl bg-bad-bg px-4 py-3 text-sm text-bad">{formError}</p>}
        <Input label="Nombre o razón social" data-autofocus value={form.name} onChange={set('name')} error={errors.name} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="NIT" value={form.nit} onChange={set('nit')} error={errors.nit} />
          <Input label="Plazo de pago (días)" hint="0 = de contado" inputMode="numeric" value={form.paymentTermsDays} onChange={set('paymentTermsDays')} error={errors.paymentTermsDays} />
          <Input label="Contacto" value={form.contactName} onChange={set('contactName')} error={errors.contactName} />
          <Input label="Teléfono" type="tel" value={form.phone} onChange={set('phone')} error={errors.phone} />
          <Input label="Correo" type="email" value={form.email} onChange={set('email')} error={errors.email} />
          <Input label="Ciudad" value={form.city} onChange={set('city')} error={errors.city} />
        </div>
        <Input label="Dirección" value={form.address} onChange={set('address')} error={errors.address} />
        <Input label="Notas" value={form.notes} onChange={set('notes')} error={errors.notes} />
      </form>
    </Modal>
  );
}
