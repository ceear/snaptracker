/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          50:  '#f8f9fa',
          100: '#f1f3f5',
          200: '#e9ecef',
          300: '#dee2e6',
          400: '#ced4da',
          500: '#adb5bd',
          600: '#6c757d',
          700: '#495057',
          800: '#343a40',
          850: '#2b2f36',
          900: '#212529',
          950: '#16181c',
        },
        accent: {
          400: '#74b9ff',
          500: '#0984e3',
          600: '#0773c5',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      transitionTimingFunction: {
        'snap': 'cubic-bezier(0.23, 1, 0.32, 1)',
      },
      screens: {
        // Phone landscape: height ≤ 500px (excludes tablets in landscape)
        landscape: { raw: '(orientation: landscape) and (max-height: 500px)' },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};
