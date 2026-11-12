const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: token('canvas'),
        surface: token('surface'),
        ink: { DEFAULT: token('ink'), soft: token('ink-soft'), mute: token('ink-mute') },
        brand: {
          50: token('brand-50'),
          100: token('brand-100'),
          200: token('brand-200'),
          500: token('brand-500'),
          600: token('brand-600'),
          700: token('brand-700'),
        },
        ok: { DEFAULT: token('ok'), bg: token('ok-bg') },
        warn: { DEFAULT: token('warn'), bg: token('warn-bg') },
        bad: { DEFAULT: token('bad'), bg: token('bad-bg') },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          '"Inter Variable"',
          'system-ui',
          'sans-serif',
        ],
      },
      borderColor: { DEFAULT: 'rgb(0 0 0 / 0.08)' },
      boxShadow: {
        card: '0 1px 2px rgb(0 0 0 / 0.04), 0 6px 20px rgb(0 0 0 / 0.04)',
        pop: '0 10px 40px rgb(0 0 0 / 0.14)',
      },
      letterSpacing: { title: '-0.022em' },
      keyframes: {
        rise: { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'none' } },
        fade: { from: { opacity: 0 }, to: { opacity: 1 } },
        sheet: { from: { transform: 'translateY(100%)' }, to: { transform: 'none' } },
      },
      animation: {
        rise: 'rise .35s cubic-bezier(.2,.8,.2,1) both',
        fade: 'fade .2s ease-out both',
        sheet: 'sheet .3s cubic-bezier(.2,.8,.2,1) both',
      },
    },
  },
  plugins: [],
};
