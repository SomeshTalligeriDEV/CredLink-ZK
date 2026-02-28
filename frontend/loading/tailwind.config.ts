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
        gold: '#F5A623',
        'gold-light': '#FFB547',
        'gold-dark': '#D4891C',
        dark: '#0B0D10',
        'dark-card': '#14171C',
        'dark-sidebar': '#0E1014',
        'dark-border': '#1E2128',
        'text-secondary': '#B0B3B8',
        'text-muted': '#6B6F76',
        success: '#22C55E',
        danger: '#EF4444',
      },
      boxShadow: {
        'card': '0 20px 40px rgba(0,0,0,0.4)',
        'gold-glow': '0 0 20px rgba(245,166,35,0.4)',
        'gold-glow-sm': '0 0 10px rgba(245,166,35,0.3)',
      },
      fontFamily: {
        sans: ['SF Pro', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
