import { LogoMark } from './ui/Logo.jsx';

// Marco de las pantallas públicas: una tarjeta centrada sobre el fondo gris, mucho aire
export function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-5 py-10">
      <div className="w-full max-w-[420px] animate-rise">
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoMark className="mb-5 h-14 w-14 rounded-2xl" />
          <h1 className="text-[30px] font-semibold leading-tight text-ink">{title}</h1>
          {subtitle && <p className="mt-2 max-w-sm text-ink-mute">{subtitle}</p>}
        </div>
        <div className="rounded-3xl bg-surface p-6 shadow-card sm:p-8">{children}</div>
        {footer && <div className="mt-6 text-center text-sm text-ink-mute">{footer}</div>}
      </div>
    </div>
  );
}
