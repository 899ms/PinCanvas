import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: {
          bg: '#fafafa',
          dot: '#e5e5e5',
        },
      },
    },
  },
  plugins: [],
};

export default config;
