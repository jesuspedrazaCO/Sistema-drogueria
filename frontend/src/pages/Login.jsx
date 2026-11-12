import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { errorMessage } from '../lib/api.js';
import { useDocumentTitle } from '../hooks.js';
import { AuthShell } from '../components/AuthShell.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Button } from '../components/ui/Button.jsx';

export default function Login() {
  useDocumentTitle('Iniciar sesión');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email.trim(), form.password);
      navigate(location.state?.from?.pathname ?? '/', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Bienvenido" subtitle="Inicia sesión para continuar">
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && (
          <p role="alert" className="rounded-xl bg-bad-bg px-4 py-3 text-sm text-bad">
            {error}
          </p>
        )}
        <Input
          label="Correo electrónico"
          type="email"
          name="email"
          autoComplete="username"
          inputMode="email"
          autoFocus
          required
          placeholder="nombre@correo.com"
          value={form.email}
          onChange={update('email')}
        />
        <Input
          label="Contraseña"
          type={showPassword ? 'text' : 'password'}
          name="password"
          autoComplete="current-password"
          required
          value={form.password}
          onChange={update('password')}
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="rounded-lg p-2.5 text-ink-mute hover:text-ink"
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          }
        />
        <Button type="submit" size="lg" className="w-full" loading={loading} disabled={!form.email || !form.password}>
          Iniciar sesión
        </Button>
      </form>
      <p className="mt-5 text-center text-sm">
        <Link to="/olvide-mi-contrasena" className="font-medium text-brand-600 hover:text-brand-700">
          ¿Olvidaste tu contraseña?
        </Link>
      </p>
    </AuthShell>
  );
}
