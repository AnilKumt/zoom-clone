import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './features/**/*.{js,ts,jsx,tsx,mdx}',
    './providers/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Zoom signature branding tokens
        'zoom-blue': 'var(--zoom-blue)',
        'zoom-blue-hover': 'var(--zoom-blue-hover)',
        'zoom-blue-tint': 'var(--zoom-blue-tint)',
        'zoom-blue-subtle': 'var(--zoom-blue-subtle)',
        'zoom-orange': 'var(--zoom-orange)',
        'zoom-orange-hover': 'var(--zoom-orange-hover)',
        'zoom-red': 'var(--zoom-red)',
        'zoom-green': 'var(--zoom-green)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        border: 'var(--border)',
        'surface-border': 'var(--surface-border)',
        'page-bg': 'var(--page-bg)',
        'card-bg': 'var(--card-bg)',
        'surface-tonal': 'var(--surface-tonal)',
        'room-bg': 'var(--room-bg)',
        'room-toolbar': 'var(--room-toolbar)',
        'room-tile': 'var(--room-tile)',
      },
      borderRadius: {
        'md3-xs': '4px',
        'md3-sm': '8px',
        'md3-md': '12px',
        'md3-lg': '16px',
        'md3-xl': '24px',
        'md3-2xl': '28px',
        'md3-full': '9999px',
        card: 'var(--radius-card)',
        control: 'var(--radius-control)',
        pill: 'var(--radius-pill)',
      },
      boxShadow: {
        'md3-1': '0 1px 3px 1px rgba(0, 0, 0, 0.06), 0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'md3-2': '0 2px 6px 2px rgba(0, 0, 0, 0.07), 0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'md3-3': '0 4px 12px 3px rgba(0, 0, 0, 0.08), 0 1px 3px 0 rgba(0, 0, 0, 0.04)',
        'md3-4': '0 6px 18px 4px rgba(0, 0, 0, 0.09), 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
        'md3-5': '0 8px 24px 6px rgba(0, 0, 0, 0.12), 0 4px 8px 0 rgba(0, 0, 0, 0.06)',
        card: 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
      },
      transitionTimingFunction: {
        'standard': 'cubic-bezier(0.2, 0.0, 0, 1.0)',
        'standard-decelerate': 'cubic-bezier(0, 0, 0, 1)',
        'standard-accelerate': 'cubic-bezier(0.3, 0, 1, 1)',
        'emphasized': 'cubic-bezier(0.05, 0.7, 0.1, 1.0)',
        'bounce-subtle': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
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
