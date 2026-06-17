/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      screens: {
        xs: '480px',
      },
      colors: {
        // Semantic tokens are driven by CSS variables (see index.css) so the whole
        // app can flip between dark (default) and light themes. Brand green + status
        // colours stay fixed — they read well on both themes.
        bg: 'rgb(var(--c-bg) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        surface2: 'rgb(var(--c-surface2) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        line2: 'rgb(var(--c-line2) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        faint: 'rgb(var(--c-faint) / <alpha-value>)',
        accent: '#34C77F', // logo green
        accentText: 'rgb(var(--c-accent-text) / <alpha-value>)', // readable green for text on each theme
        accentSoft: 'rgba(52,199,127,0.12)',
        // status
        up: '#34C77F',
        degraded: '#E3B341',
        down: '#E2564A',
        unknown: '#8A968F',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Sora', 'Inter', 'system-ui', 'sans-serif'],
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
