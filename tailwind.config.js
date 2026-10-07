/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'safety-green': '#10b981',
        'safety-amber': '#f59e0b',
        'safety-red': '#ef4444',
      }
    },
  },
  plugins: [],
}
