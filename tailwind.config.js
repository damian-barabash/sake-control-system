/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      screens: {
        xs: '480px',
      },
      colors: {
        // editorial-dark, faint-green canvas
        bg: '#0A0C0B',
        surface: '#121613',
        surface2: '#191E1A',
        line: '#242B26',
        line2: '#333D36',
        ink: '#EBF1ED',
        muted: '#8A968F',
        faint: '#55615A',
        accent: '#34C77F', // logo green
        accentSoft: 'rgba(52,199,127,0.12)',
        // status
        up: '#34C77F',
        degraded: '#E3B341',
        down: '#E2564A',
        unknown: '#55615A',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      letterSpacing: {
        label: '0.22em',
      },
      borderRadius: {
        xl2: '14px',
      },
    },
  },
  plugins: [],
}
