/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mesh: {
          dark: '#0b0f17',
          panel: '#111827',
          card: '#162032',
          border: '#23334d',
          accent: '#06b6d4',
          alert: '#ef4444',
          warning: '#f59e0b',
          success: '#10b981'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Consolas', 'Courier New', 'monospace']
      }
    },
  },
  plugins: [],
}
