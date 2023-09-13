/** @type {import('tailwindcss').Config} */
module.exports = {
  mode: 'jit',
  content: ['.eleventy.js', './src/**/*.njk', './src/**/*.md', './src/**/*.js'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Georgia', 'Lora', 'Times New Roman', 'serif'],
      },
    },
  },
  plugins: [],
};
