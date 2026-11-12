import { Resend } from 'resend';
import { env } from '../config/env.js';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (char) => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return map[char];
  });

const layout = (title, intro, buttonLabel, link, footer) => `<!doctype html>
<html lang="es">
  <body style="margin:0;background:#f4f6f5;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0"
                 style="max-width:480px;background:#ffffff;border-radius:12px;padding:32px;">
            <tr><td>
              <h1 style="margin:0 0 16px;font-size:20px;">${title}</h1>
              <p style="margin:0 0 24px;line-height:1.5;">${intro}</p>
              <p style="margin:0 0 24px;">
                <a href="${link}" style="background:#0f766e;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;">${buttonLabel}</a>
              </p>
              <p style="margin:0 0 8px;font-size:13px;color:#6b7280;line-height:1.5;">${footer}</p>
              <p style="margin:0;font-size:12px;color:#9ca3af;word-break:break-all;">Si el botón no funciona, copia este enlace: ${link}</p>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

// Sin RESEND_API_KEY en desarrollo se imprime el enlace en consola (nunca en producción)
async function send({ to, subject, html, devPreview }) {
  if (!resend) {
    if (env.isProd) throw new Error('RESEND_API_KEY no está configurada');
    console.info(`[email:dev] Para: ${to} | ${subject} | ${devPreview}`);
    return { delivered: false };
  }
  const { error } = await resend.emails.send({ from: env.EMAIL_FROM, to, subject, html });
  if (error) throw new Error(`Resend: ${error.message}`);
  return { delivered: true };
}

export function sendPasswordResetEmail({ to, name, link, expiresMinutes }) {
  return send({
    to,
    subject: 'Recupera tu contraseña',
    devPreview: link,
    html: layout(
      'Recupera tu contraseña',
      `Hola ${escapeHtml(name)}, recibimos una solicitud para cambiar tu contraseña.`,
      'Crear nueva contraseña',
      link,
      `El enlace vence en ${expiresMinutes} minutos. Si no lo solicitaste, ignora este mensaje: tu contraseña no cambiará.`
    ),
  });
}

export function sendInviteEmail({ to, name, link, expiresHours }) {
  return send({
    to,
    subject: 'Te invitaron al sistema de la droguería',
    devPreview: link,
    html: layout(
      'Bienvenido al sistema',
      `Hola ${escapeHtml(name)}, creamos tu cuenta. Define tu contraseña para ingresar.`,
      'Crear mi contraseña',
      link,
      `El enlace vence en ${expiresHours} horas. Si no esperabas esta invitación, ignora este mensaje.`
    ),
  });
}
