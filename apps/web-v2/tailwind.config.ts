import type { Config } from 'tailwindcss'
import tailwindcssAnimate from 'tailwindcss-animate'

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        success: { DEFAULT: '#22c55e', light: '#dcfce7', dark: '#166534' },
        warning: { DEFAULT: '#f59e0b', light: '#fef3c7', dark: '#92400e' },
        danger: { DEFAULT: '#ef4444', light: '#fee2e2', dark: '#991b1b' },
        info: { DEFAULT: '#3b82f6', light: '#dbeafe', dark: '#1e40af' },
        surface: {
          DEFAULT: 'hsl(var(--surface))',
          raised: 'hsl(var(--surface-raised))',
          sunken: 'hsl(var(--surface-sunken))',
        },
        content: {
          DEFAULT: 'hsl(var(--content))',
          secondary: 'hsl(var(--content-secondary))',
          muted: 'hsl(var(--content-muted))',
        },
        border: 'hsl(var(--border))',
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          hover: 'hsl(var(--accent-hover))',
          light: 'hsl(var(--accent-light))',
          contrast: 'hsl(var(--accent-contrast))',
        },
      },
      borderRadius: {
        soft: '0.75rem',
        pill: '9999px',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        raised: '0 4px 12px rgba(0,0,0,0.08)',
      },
      animation: {
        'points-pop': 'pointsPop 400ms ease-out',
        'check-scale': 'checkScale 250ms ease-out',
        'fade-in': 'fadeIn 200ms ease-out',
        'slide-up': 'slideUp 220ms ease-out',
      },
      keyframes: {
        pointsPop: {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(-40px)', opacity: '0' },
        },
        checkScale: {
          '0%': { transform: 'scale(0.8)' },
          '50%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config
