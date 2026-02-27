import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gold: '#F0B90B',
        'gold-dark': '#C99A0A',
        dark: '#0D0D0D',
        'dark-card': '#1A1A1A',
        'dark-border': '#2A2A2A',
      },
    },
  },
  plugins: [],
};
export default config;
