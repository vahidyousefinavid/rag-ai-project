import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0B0F1A',
        surface: '#131A2A',
        surface2: '#1A2338',
        border: '#242E45',
        accent: '#6366F1',
        'accent-dark': '#4F46E5',
      },
      fontFamily: {
        sans: ['Vazirmatn', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
