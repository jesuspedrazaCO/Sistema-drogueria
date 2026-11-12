import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '../lib/api.js';
import { fieldErrors } from '../lib/forms.js';
import { useToast } from '../context/ToastContext.jsx';
import { useDocumentTitle } from '../hooks.js';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Card, CardHeader } from '../components/ui/Card.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';

const TEXT = ['businessName', 'nit', 'address', 'city', 'phone', 'email', 'receiptFooter'];

export default function Settings() {
  useDocumentTitle('Ajustes');
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['settings'], queryFn: () => api.get('/settings') });
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const s = data?.data.settings;
    if (s) setForm({ ...Object.fromEntries(TEXT.map((k) => [k, s[k] ?? ''])), expiryAlertDays: String(s.expiryAlertDays ?? 90), criticalExpiryDays: String(s.criticalExpiryDays ?? 30) });
  }, [data]);

  const save = useMutation({
    mutationFn: (body) => api.patch('/settings', body),
    onSuccess: () => {
      for (const key of ['settings', 'alerts', 'dashboard']) queryClient.invalidateQueries({ queryKey: [key] });
      toast.success('Ajustes guardados');
    },
    onError: (err) => { setErrors(fieldErrors(err)); setFormError(errorMessage(err)); },
  });

  const set = (field) => (event) => setForm((c) => ({ ...c, [field]: event.target.value }));
  const warn = Number(form?.expiryAlertDays);
  const crit = Number(form?.criticalExpiryDays);
  const daysOk = warn >= 1 && crit >= 1 && crit <= warn;

  const submit = (event) => {
    event.preventDefault();
    setErrors({});
    setFormError('');
    const body = { expiryAlertDays: warn, criticalExpiryDays: crit };
    for (const key of TEXT) body[key] = form[key].trim();
    save.mutate(body);
  };

  return (
    <>
      <PageHeader title="Ajustes" subtitle="Datos del negocio y alertas" />
      {isError && <p role="alert" className="mb-4 rounded-xl bg-bad-bg px-4 py-3 text-bad">{errorMessage(error)}</p>}
      {isLoading || !form ? <Skeleton className="h-96 w-full rounded-2xl" /> : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Card>
            <CardHeader title="Negocio" subtitle="Aparece en el menú y en los comprobantes." />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Nombre del negocio" value={form.businessName} onChange={set('businessName')} error={errors.businessName} className="sm:col-span-2" />
              <Input label="NIT" value={form.nit} onChange={set('nit')} error={errors.nit} />
              <Input label="Teléfono" type="tel" value={form.phone} onChange={set('phone')} error={errors.phone} />
              <Input label="Dirección" value={form.address} onChange={set('address')} error={errors.address} />
              <Input label="Ciudad" value={form.city} onChange={set('city')} error={errors.city} />
              <Input label="Correo" type="email" value={form.email} onChange={set('email')} error={errors.email} />
              <Input label="Mensaje al pie del recibo" value={form.receiptFooter} onChange={set('receiptFooter')} error={errors.receiptFooter} />
            </div>
          </Card>
          <Card>
            <CardHeader title="Alertas de vencimiento" subtitle="Cuántos días antes te avisamos que un lote está por vencer." />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Avisar con (días)" inputMode="numeric" value={form.expiryAlertDays} onChange={set('expiryAlertDays')} error={errors.expiryAlertDays} />
              <Input label="Marcar como crítico con (días)" inputMode="numeric" value={form.criticalExpiryDays} onChange={set('criticalExpiryDays')} error={errors.criticalExpiryDays ?? (!daysOk ? 'Debe ser menor o igual al aviso' : undefined)} />
            </div>
          </Card>
          {formError && !Object.keys(errors).length && <p role="alert" className="rounded-xl bg-bad-bg px-4 py-3 text-sm text-bad">{formError}</p>}
          <div className="flex justify-end"><Button type="submit" size="lg" loading={save.isPending} disabled={!daysOk || form.businessName.trim().length < 2}>Guardar ajustes</Button></div>
        </form>
      )}
    </>
  );
}
