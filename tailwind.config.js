/** @type {import('tailwindcss').Config} */
module.exports = {
  mode: 'jit',
  content: ['_site/**/*.html'],
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
