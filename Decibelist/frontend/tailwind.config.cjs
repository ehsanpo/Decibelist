/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        rack: {
          base: '#1e2428',
          panel: '#2b3238',
          edge: '#15191c',
        },
        accent: {
          cyan: '#6ff3ff',
          amber: '#ffbb3b',
          red: '#ff6161',
        },
        led: {
          green: '#7dff6b',
          yellow: '#ffd66e',
          red: '#ff5c5c',
        },
      },
      fontFamily: {
        display: ['\"Space Grotesk\"', 'sans-serif'],
        mono: ['\"Share Tech Mono\"', 'monospace'],
      },
      boxShadow: {
        insetHeavy: 'inset 0 12px 24px rgba(0,0,0,0.55), inset 0 -6px 12px rgba(255,255,255,0.06)',
        bevel: '0 8px 18px rgba(0,0,0,0.35), inset 0 2px 4px rgba(255,255,255,0.08)',
        glow: '0 0 12px rgba(111,243,255,0.55)',
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(-120%)' },
          '100%': { transform: 'translateY(120%)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: 0.75 },
          '50%': { opacity: 1 },
        },
      },
      animation: {
        scanline: 'scanline 6s linear infinite',
        pulseSoft: 'pulseSoft 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
