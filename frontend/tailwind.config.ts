import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          950: '#1E2240',
          900: '#2D3250',
          800: '#363D6A',
          700: '#424769',
          500: '#5C6BC0',
          400: '#7986CB',
          100: '#E8EAF6',
          50:  '#F0F2FF',
        },
        ink: {
          DEFAULT: '#0A0A0A',
          soft:    '#262626',
        },
        tier: {
          high:    '#047857',
          high_bg: '#ECFDF5',
          med:     '#B45309',
          med_bg:  '#FFFBEB',
          low:     '#B91C1C',
          low_bg:  '#FEF2F2',
        },
      },
      fontFamily: {
        sans:  ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono:  ['JetBrains Mono', 'ui-monospace', 'SF Mono', 'monospace'],
        serif: ['Instrument Serif', 'Georgia', 'serif'],
      },
      boxShadow: {
        soft:   '0 1px 0 rgba(0,0,0,0.03), 0 1px 2px rgba(0,0,0,0.04)',
        lifted: '0 2px 12px rgba(0,0,0,0.08)',
      },
      keyframes: {
        agentDot: {
          '0%,80%,100%': { transform: 'scale(0.6)', opacity: '0.4' },
          '40%':          { transform: 'scale(1)',   opacity: '1'   },
        },
        caretBlink: {
          '0%,100%': { opacity: '1' },
          '50%':     { opacity: '0' },
        },
        loadingPulse: {
          '0%,100%': { transform: 'scale(1)',    boxShadow: '0 0 0 0 currentColor'          },
          '50%':     { transform: 'scale(1.05)', boxShadow: '0 0 0 10px transparent'        },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
      },
      animation: {
        'agent-dot':     'agentDot 1.2s ease-in-out infinite',
        'caret-blink':   'caretBlink 1s infinite',
        'loading-pulse': 'loadingPulse 1.6s ease-in-out infinite',
        'fade-in':       'fadeIn 0.15s ease',
      },
    },
  },
  plugins: [],
} satisfies Config
