/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        time: {
          primary: '#6366f1',
          secondary: '#8b5cf6',
          accent: '#22d3ee',
          success: '#22c55e',
          warning: '#f59e0b',
          danger: '#ef4444',
          dark: '#0f172a',
          darker: '#020617',
          light: '#f8fafc',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #6366f1, 0 0 10px #6366f1' },
          '100%': { boxShadow: '0 0 20px #6366f1, 0 0 30px #8b5cf6' },
        },
      },
    },
  },
  plugins: [],
}
