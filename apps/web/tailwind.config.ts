import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './features/**/*.{js,ts,jsx,tsx,mdx}',
    './providers/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Design tokens — see CSS variables in globals.css
        'zoom-blue': 'var(--zoom-blue)',
        'zoom-blue-hover': 'var(--zoom-blue-hover)',
        'zoom-blue-tint': 'var(--zoom-blue-tint)',
        'zoom-orange': 'var(--zoom-orange)',
        'zoom-red': 'var(--zoom-red)',
        'zoom-green': 'var(--zoom-green)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        border: 'var(--border)',
        'page-bg': 'var(--page-bg)',
        'card-bg': 'var(--card-bg)',
        'room-bg': 'var(--room-bg)',
        'room-toolbar': 'var(--room-toolbar)',
        'room-tile': 'var(--room-tile)',
      },
      borderRadius: {
        card: 'var(--radius-card)',
        control: 'var(--radius-control)',
        pill: 'var(--radius-pill)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
      },
      fontFamily: {
        sans: [
          'var(--font-lato)',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      fontSize: {
        xs: ['12px', { lineHeight: '1.5' }],
        sm: ['14px', { lineHeight: '1.5' }],
        base: ['16px', { lineHeight: '1.5' }],
        lg: ['18px', { lineHeight: '1.4' }],
        xl: ['24px', { lineHeight: '1.3' }],
        '2xl': ['28px', { lineHeight: '1.2' }],
        '3xl': ['32px', { lineHeight: '1.2' }],
      },
    },
  },
  plugins: [],
};

export default config;
