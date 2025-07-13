/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
  ],
theme: {
  extend: {
    fontFamily: {
      fancy: ['"Cherry Bomb One"', 'cursive'],
    },
    animation: {
      'bounce-slow': 'bounce 2s infinite ease-in-out',
    },
  },
},
safelist: [
  'animate-bounce-slow',
  'font-fancy',
  'text-[64px]',
  'drop-shadow-[0_0_10px_rgba(255,192,203,0.8)]'
],



  plugins: [],
};
