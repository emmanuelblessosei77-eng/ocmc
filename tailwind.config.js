/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#0A1931',
        gold: '#D4AF5A',
        cream: '#F8F6F0',
        ink: '#202B3A',
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        display: ['DM Serif Display', 'serif'],
      },
      boxShadow: {
        card: '0 16px 50px rgba(10, 25, 49, 0.08)',
      },
    },
  },
  plugins: [],
}
