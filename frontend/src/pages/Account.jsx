import { useState } from 'react';
import { LogOut, ShieldCheck } from 'lucide-react';
import { api, errorMessage } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { ROLES } from '../lib/permissions.js';
import { useDocumentTitle } from '../hooks.js';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Card, CardHeader } from '../components/ui/Card.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Avatar } from '../components/ui/Avatar.jsx';
import { Badge } from '../components/ui/Badge.jsx';

export default function Account() {
  useDocumentTitle('Mi cuenta');
  const { user, startSession, clearSession } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const mismatch = form.confirm && form.newPassword !== form.confirm;
  const canSubmit = form.currentPassword && form.newPassword.length >= 8 && form.newPassword === form.confirm;

  const changePassword = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { data } = await api.post('/auth/change-password', { currentPassword: form.currentPassword, newPassword: form.newPassword });
      if (data?.accessToken) startSession(data); // el cambio abre una sesión nueva y cierra las demás
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
      toast.success('Contraseña actualizada');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const logoutAll = async () => {
    setClosing(true);
    try {
      await api.post('/auth/logout-all');
    } catch (err) {
      toast.error(errorMessage(err));
      setClosing(false);
      return;
    }
    clearSession();
  };

  return (
    <>
      <PageHeader title="Mi cuenta" />
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <div className="flex flex-col items-center text-center">
            <Avatar name={user.name} className="h-20 w-20 text-2xl" />
            <p className="mt-4 text-xl font-semibold text-ink">{user.name}</p>
            <p className="text-ink-mute">{user.email}</p>
            <Badge tone="brand" className="mt-3">{ROLES[user.role]}</Badge>
          </div>
        </Card>

        <div className="space-y-4 lg:col-span-3">
          <Card>
            <CardHeader title="Cambiar contraseña" subtitle="Al cambiarla, se cerrarán tus otras sesiones." />
            <form onSubmit={changePassword} className="space-y-4" noValidate>
              {error && <p role="alert" className="rounded-xl bg-bad-bg px-4 py-3 text-sm text-bad">{error}</p>}
              <Input label="Contraseña actual" type="password" autoComplete="current-password" value={form.currentPassword} onChange={update('currentPassword')} />
              <Input label="Nueva contraseña" type="password" autoComplete="new-password" hint="Mínimo 8 caracteres, con mayúscula, minúscula y número." value={form.newPassword} onChange={update('newPassword')} />
              <Input label="Repite la nueva contraseña" type="password" autoComplete="new-password" value={form.confirm} onChange={update('confirm')} error={mismatch ? 'Las contraseñas no coinciden' : undefined} />
              <Button type="submit" loading={saving} disabled={!canSubmit}>Guardar cambios</Button>
            </form>
          </Card>

          <Card>
            <CardHeader title="Seguridad" />
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-ok" aria-hidden />
                <p className="max-w-sm text-sm text-ink-soft">Si usaste un computador ajeno o perdiste un dispositivo, cierra tu sesión en todos lados.</p>
              </div>
              <Button variant="secondary" onClick={logoutAll} loading={closing}>
                <LogOut className="h-4 w-4" aria-hidden /> Cerrar todas las sesiones
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
