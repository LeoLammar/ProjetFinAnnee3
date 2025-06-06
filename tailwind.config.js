/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./views/**/*.ejs', './public/**/*.js'],
  safelist: [
  ],
  theme: {
    extend: {
      fontFamily: {
      },
      colors: {
        'be': '#FAF3E55',
        'bl': '#5C83BA',
      },
    },
    plugins: [],
  }
}