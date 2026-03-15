/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
    './lib/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#e6f0e6',
          100: '#cce1cc',
          200: '#99c399',
          300: '#66a566',
          400: '#338733',
          500: '#006400', // HNU Green
          600: '#005000',
          700: '#003c00',
          800: '#002800',
          900: '#001400',
          950: '#000a00',
        },
        gold: { 400: '#ffe066', 500: '#ffd700', 600: '#ccac00' },
        hnu:  { dark: '#006400', mid: '#005000', light: '#e6f0e6', gold: '#ffd700' },
      },
      fontFamily: {
        display: ['"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
        body:    ['"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        card:       '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)',
        'card-hover':'0 4px 8px rgba(0,0,0,0.08), 0 12px 32px rgba(0,0,0,0.10)',
        modal:      '0 8px 32px rgba(0,0,0,0.18)',
      },
    },
  },
  plugins: [],
}
