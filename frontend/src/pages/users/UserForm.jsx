import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MailPlus } from 'lucide-react';
import { api, errorMessage } from '../../lib/api.js';
import { fieldErrors } from '../../lib/forms.js';
import { ROLES } from '../../lib/permissions.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Button } from '../../components/ui/Button.jsx';

const ROLE_HELP = {
  admin: 'Acceso total, incluidos usuarios y ajustes.',
  regente: 'Catálogo, inventario, compras, fórmulas y control especial.',
  vendedor: 'Vende y consulta. No ve costos ni finanzas.',
  contador: 'Gastos, cuentas por pagar y reportes financieros.',
};
const EMPTY = { name: '', email: '', role: 'vendedor', isActive: true };

export function UserForm({ open, user: target, onClose }) {
  const editing = Boolean(target);
  const { user: me } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(target ? { name: target.name, email: target.email, role: target.role, isActive: target.isActive } : EMPTY);
      setErrors({});
      setFormError('');
    }
  }, [open, target]);

  const set = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const isSelf = target?.id === me.id;

  const save = useMutation({
    mutationFn: (body) => (editing ? api.patch(`/users/${target.id}`, body) : api.post('/users', body)),
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      if (editing) toast.success('Usuario actualizado');
      else if (data.emailSent === false) toast.error('Usuario creado, pero no se pudo enviar el correo. Usa "Reenviar invitación".');
      else toast.success('Invitación enviada: la persona crea su contraseña desde el correo');
      onClose();
    },
    onError: (err) => { setErrors(fieldErrors(err)); setFormError(errorMessage(err)); },
  });

  const submit = (event) => {
    event.preventDefault();
    setErrors({});
    setFormError('');
    save.mutate(editing ? { name: form.name.trim(), role: form.role, isActive: form.isActive } : { name: form.name.trim(), email: form.email.trim(), role: form.role });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar usuario' : 'Invitar usuario'}
      description={editing ? target.email : 'Le llegará un correo para crear su propia contraseña.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="user-form" loading={save.isPending} disabled={form.name.trim().length < 2 || (!editing && !form.email.trim())}>
            {editing ? 'Guardar cambios' : (<><MailPlus className="h-4 w-4" aria-hidden /> Enviar invitación</>)}
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={submit} className="space-y-4" noValidate>
        {formError && !Object.keys(errors).length && <p role="alert" className="rounded-xl bg-bad-bg px-4 py-3 text-sm text-bad">{formError}</p>}
        <Input label="Nombre" data-autofocus value={form.name} onChange={set('name')} error={errors.name} required />
        {!editing && <Input label="Correo" type="email" autoComplete="off" value={form.email} onChange={set('email')} error={errors.email} required />}
        <div>
          <Select label="Rol" value={form.role} onChange={set('role')} error={errors.role} disabled={isSelf}>
            {Object.entries(ROLES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
          <p className="mt-1.5 text-sm text-ink-mute">{isSelf ? 'No puedes cambiar tu propio rol.' : ROLE_HELP[form.role]}</p>
        </div>
        {editing && (
          <label className={`flex items-start gap-3 rounded-xl bg-black/[0.03] px-4 py-3 ${isSelf ? 'opacity-60' : 'cursor-pointer'}`}>
            <input type="checkbox" checked={form.isActive} disabled={isSelf} onChange={(e) => setForm((c) => ({ ...c, isActive: e.target.checked }))} className="mt-0.5 h-5 w-5 rounded accent-[rgb(var(--brand-600))]" />
            <span><span className="block font-medium text-ink">Usuario activo</span><span className="block text-sm text-ink-mute">Si lo desactivas, no podrá iniciar sesión.</span></span>
          </label>
        )}
      </form>
    </Modal>
  );
}
