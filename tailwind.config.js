/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#0F172A',
        paper: '#F7F9FB',
        slate: {
          DEFAULT: '#45464D',
          light: '#8A93A3',
        },
        signal: {
          DEFAULT: '#1D4ED8',
          dark: '#1E40AF',
          light: '#EFF6FF',
        },
        progress: {
          DEFAULT: '#009668',
          light: '#E4F6EE',
        },
        amber: {
          DEFAULT: '#EE9B2E',
          light: '#FDF1DF',
        },
        coral: {
          DEFAULT: '#BA1A1A',
          light: '#FFDAD6',
        },
        line: '#E5E7EB',
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
        card: '0 1px 1px rgba(15,23,42,0.05), 0 12px 32px -16px rgba(15,23,42,0.08)',
      },
    },
  },
  plugins: [],
}
