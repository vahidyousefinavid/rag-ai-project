import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#EEF2F7',
        card: '#FFFFFF',
        border: '#E5ECF4',
        accent: '#1BC9A8',
        'accent-light': '#17A88D',
      },
      fontFamily: {
        sans: ['Vazirmatn', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
