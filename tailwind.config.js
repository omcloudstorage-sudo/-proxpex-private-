/** @type {import('tailwindcss').Config} */

function withOpacity(varName) {
  return ({ opacityValue }) =>
    opacityValue !== undefined ? `rgb(var(${varName}) / ${opacityValue})` : `rgb(var(${varName}))`
}

module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: withOpacity('--color-ink'),
        paper: withOpacity('--color-paper'),
        surface: withOpacity('--color-surface'),
        slate: {
          DEFAULT: withOpacity('--color-slate'),
          light: withOpacity('--color-slate-light'),
        },
        signal: {
          DEFAULT: withOpacity('--color-signal'),
          dark: 'var(--color-signal-dark)',
          light: 'var(--color-signal-light)',
        },
        progress: {
          DEFAULT: withOpacity('--color-progress'),
          light: 'var(--color-progress-light)',
        },
        amber: {
          DEFAULT: withOpacity('--color-amber'),
          light: 'var(--color-amber-light)',
        },
        coral: {
          DEFAULT: withOpacity('--color-coral'),
          light: 'var(--color-coral-light)',
        },
        line: withOpacity('--color-line'),
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
        mono: ['var(--font-mono)'],
      },
      borderRadius: {
        card: '12px',
      },
      boxShadow: {
        card: '0 1px 1px rgb(0 0 0 / 0.05), 0 12px 32px -16px rgb(0 0 0 / 0.08)',
        glow: '0 0 0 1px rgb(var(--color-signal) / 0.15), 0 4px 16px -4px rgb(var(--color-signal) / 0.35)',
      },
    },
  },
  plugins: [],
}
