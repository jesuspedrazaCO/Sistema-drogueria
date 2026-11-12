import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, CircleCheck, Circle, LinkIcon } from 'lucide-react';
import { api, errorMessage } from '../lib/api.js';
import { useDocumentTitle } from '../hooks.js';
import { AuthShell } from '../components/AuthShell.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Button } from '../components/ui/Button.jsx';

const RULES = [
  { label: 'Mínimo 8 caracteres', test: (value) => value.length >= 8 },
  { label: 'Una letra mayúscula', test: (value) => /[A-Z]/.test(value) },
  { label: 'Una letra minúscula', test: (value) => /[a-z]/.test(value) },
  { label: 'Un número', test: (value) => /\d/.test(value) },
];

// Sirve para recuperar la contraseña y también para crearla al aceptar una invitación
export default function ResetPassword() {
  useDocumentTitle('Nueva contraseña');
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const checks = useMemo(() => RULES.map((rule) => ({ ...rule, ok: rule.test(password) })), [password]);
  const valid = checks.every((rule) => rule.ok) && password === confirm;

  const submit = async (event) => {
    event.preventDefault();
    if (!valid) return;
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password }, { auth: false });
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthShell
        title="Enlace no válido"
        subtitle="El enlace está incompleto. Pide uno nuevo desde la pantalla de recuperación."
        footer={<Link to="/olvide-mi-contrasena" className="font-medium text-brand-600">Solicitar enlace nuevo</Link>}
      >
        <div className="flex justify-center text-ink-mute">
          <LinkIcon className="h-10 w-10" strokeWidth={1.4} aria-hidden />
        </div>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell title="Contraseña actualizada" subtitle="Ya puedes iniciar sesión con tu nueva contraseña.">
        <div className="flex flex-col items-center gap-5">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-ok-bg text-ok">
            <Check className="h-7 w-7" aria-hidden />
          </span>
          <Link to="/login" className="w-full">
            <Button size="lg" className="w-full">Ir a iniciar sesión</Button>
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Crea tu contraseña" subtitle="Elige una contraseña segura que no uses en otros sitios.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && (
          <p role="alert" className="rounded-xl bg-bad-bg px-4 py-3 text-sm text-bad">
            {error}
          </p>
        )}
        <Input label="Nueva contraseña" type="password" autoComplete="new-password" autoFocus required value={password} onChange={(e) => setPassword(e.target.value)} />
        <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 px-1" aria-label="Requisitos de la contraseña">
          {checks.map((rule) => (
            <li key={rule.label} className={`flex items-center gap-1.5 text-[13px] ${rule.ok ? 'text-ok' : 'text-ink-mute'}`}>
              {rule.ok ? <CircleCheck className="h-4 w-4 shrink-0" aria-hidden /> : <Circle className="h-4 w-4 shrink-0" aria-hidden />}
              {rule.label}
            </li>
          ))}
        </ul>
        <Input
          label="Repite la contraseña"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={confirm && password !== confirm ? 'Las contraseñas no coinciden' : undefined}
        />
        <Button type="submit" size="lg" className="w-full" loading={loading} disabled={!valid}>
          Guardar contraseña
        </Button>
      </form>
    </AuthShell>
  );
}
