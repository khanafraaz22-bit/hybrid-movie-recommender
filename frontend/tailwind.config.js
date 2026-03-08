/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body:    ['"DM Sans"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        cinema: {
          50:  '#fff8f0',
          100: '#ffe8cc',
          200: '#ffc870',
          300: '#ffaa00',
          400: '#e08800',
          500: '#b86800',
          600: '#8a4a00',
          700: '#5c3000',
          800: '#2e1800',
          900: '#0f0800',
          950: '#050200',
        },
        gold: {
          300: '#ffd700',
          400: '#ffb800',
          500: '#e09600',
        }
      },
      animation: {
        'float':       'float 6s ease-in-out infinite',
        'pulse-glow':  'pulseGlow 2s ease-in-out infinite',
        'shimmer':     'shimmer 2.5s linear infinite',
        'star-drift':  'starDrift 20s linear infinite',
        'fade-up':     'fadeUp 0.6s ease forwards',
        'scale-in':    'scaleIn 0.4s ease forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-12px)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(255,184,0,0.3)' },
          '50%':      { boxShadow: '0 0 50px rgba(255,184,0,0.7)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        starDrift: {
          '0%':   { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(-50%)' },
        },
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%':   { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [],
}