/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4F46E5',
          50: '#EEEEFF',
          100: '#E0E0FF',
          200: '#C4C2FF',
          500: '#4F46E5',
          600: '#4038D0',
          700: '#322BB8',
        },
        secondary: { DEFAULT: '#6366F1' },
        accent: { DEFAULT: '#8B5CF6' },
        surface: '#FFFFFF',
        muted: '#64748B',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      animation: {
        'shimmer': 'shimmer 2s infinite',
      },
      keyframes: {
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
    },
  },
  plugins: [],
};
