/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#142019',
        palm: '#0E3B2E',
        palmDeep: '#0A2B21',
        sand: '#F3ECDD',
        sandDeep: '#E8DCC0',
        rust: '#C4582F',
        gold: '#D8A638',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
      },
    },
  },
  plugins: [],
};
