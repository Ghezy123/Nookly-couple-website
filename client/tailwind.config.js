export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: { extend: {
    fontFamily: { display: ['Plus Jakarta Sans', 'Nunito', 'sans-serif'], sans: ['Plus Jakarta Sans', 'Nunito', 'sans-serif'] },
    colors: { chip: 'var(--chip)', accent: 'var(--accent)', accent2: 'var(--accent2)' },
  } },
  plugins: [],
};
