/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        wine: {
          50:  '#fdf2f4',
          100: '#fce7eb',
          200: '#f9d0d9',
          300: '#f4a9b8',
          400: '#ec7590',
          500: '#e0476b',
          600: '#cc2a52',
          700: '#ab1f42',
          800: '#8f1d3c',
          900: '#7a1d39',
          950: '#430a1b',
        },
        gold: {
          400: '#d4af37',
          500: '#b8962e',
        }
      }
    },
  },
  plugins: [],
}
