import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { api, errorMessage } from '../lib/api.js';
import { useDocumentTitle } from '../hooks.js';
import { AuthShell } from '../components/AuthShell.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Button } from '../components/ui/Button.jsx';

export default function ForgotPassword() {
  useDocumentTitle('Recuperar contraseña');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim() }, { auth: false });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const back = (
    <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
      Volver a iniciar sesión
    </Link>
  );

  if (sent) {
    return (
      <AuthShell title="Revisa tu correo" footer={back}>
        <div className="flex flex-col items-center text-center">
          <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-ok-bg text-ok">
            <MailCheck className="h-7 w-7" aria-hidden />
          </span>
          <p className="text-ink-soft">
            Si <strong className="font-medium text-ink">{email}</strong> está registrado, te enviamos un enlace para crear una nueva
            contraseña. Es válido por poco tiempo.
          </p>
          <p className="mt-3 text-sm text-ink-mute">¿No llega? Revisa la carpeta de spam.</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Recuperar contraseña" subtitle="Escribe tu correo y te enviaremos un enlace para crear una nueva." footer={back}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && (
          <p role="alert" className="rounded-xl bg-bad-bg px-4 py-3 text-sm text-bad">
            {error}
          </p>
        )}
        <Input
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoFocus
          required
          placeholder="nombre@correo.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Button type="submit" size="lg" className="w-full" loading={loading} disabled={!email}>
          Enviar enlace
        </Button>
      </form>
    </AuthShell>
  );
}
