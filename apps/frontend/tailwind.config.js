/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        ocean: {
          light: '#a7d8f0',
          DEFAULT: '#1e90ff',
          deep: '#001f3f'
        }
      },
      animation: {
        wave: 'wave 8s ease-in-out infinite'
      },
      keyframes: {
        wave: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' }
        }
      }
    }
  },
  plugins: []
}
