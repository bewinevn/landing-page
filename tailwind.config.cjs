/** @type {import('tailwindcss').Config} */
const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ["Inconsolata", ...defaultTheme.fontFamily.serif],
      },
      colors: {
        'sirah': {
          '50': '#fef2f2',
          '100': '#fee2e3',
          '200': '#fecacc',
          '300': '#fca5a8',
          '400': '#f77276',
          '500': '#ee454a',
          '600': '#db272c',
          '700': '#b81d22',
          '800': '#a61e22',
          '900': '#7f1d20',
          '950': '#450a0c',
        },
          'sauvignon': {
          '50': '#f5f8f6',
          '100': '#dee9e3',
          '200': '#bcd3c5',
          '300': '#93b5a2',
          '400': '#6d9480',
          '500': '#537966',
          '600': '#406151',
          '700': '#364f43',
          '800': '#2e4138',
          '900': '#2a3732',
          '950': '#18241f',
        },
        'concord': {
          '50': '#fef4ee',
          '100': '#fde6d7',
          '200': '#fbc9ad',
          '300': '#f7a37a',
          '400': '#f47d52',
          '500': '#f04e1f',
          '600': '#e13515',
          '700': '#ba2514',
          '800': '#942018',
          '900': '#781d16',
          '950': '#410b09',
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
