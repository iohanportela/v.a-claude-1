import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: {
          50: '#f5f7fa',
          100: '#e9edf3',
          200: '#cdd6e3',
          300: '#a3b2c9',
          400: '#7189a8',
          500: '#4f698c',
          600: '#3c5170',
          700: '#2f405a',
          800: '#212c3f',
          900: '#151b28',
          950: '#0b0f18'
        },
        accent: {
          400: '#5eead4',
          500: '#2dd4bf',
          600: '#0d9488'
        },
        danger: {
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626'
        },
        success: {
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a'
        },
        warning: {
          400: '#fbbf24',
          500: '#f59e0b'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      spacing: {
        touch: '3.25rem'
      },
      borderRadius: {
        xl2: '1.25rem'
      }
    }
  },
  plugins: []
} satisfies Config;
