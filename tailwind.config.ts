import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Modern Purple Theme ──────────────────────────────────────────────
        // amazon-* names kept so every component auto-updates via class reuse
        amazon: {
          yellow: '#F59E0B',  // Amber-500  — primary CTA "Add to Cart"
          orange: '#7C3AED',  // Violet-600 — "Buy Now" & accent buttons
          dark:   '#1E1B4B',  // Deep indigo-purple — navbar bg
          blue:   '#312E81',  // Indigo-900 — secondary nav bg
          light:  '#3730A3',  // Indigo-800 — hover states
          teal:   '#7C3AED',  // Violet-600 — links & text accents
          red:    '#EF4444',  // Red-500    — sale badges, warnings
          green:  '#10B981',  // Emerald-500 — in-stock
        },
        // Extra purple shades used in new UI elements
        brand: {
          50:  '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
          950: '#2E1065',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'purple-hero': 'linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4C1D95 100%)',
        'purple-card': 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)',
      },
      boxShadow: {
        'purple': '0 4px 24px rgba(109, 40, 217, 0.15)',
        'purple-lg': '0 8px 40px rgba(109, 40, 217, 0.25)',
      },
    },
  },
  plugins: [],
}
export default config
