/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#081525', // Midnight navy
          800: '#10243B', // Deep blue
          700: '#183454',
          600: '#23466f',
        },
        brandOrange: {
          DEFAULT: '#FF851B', // Premium orange
          hover: '#e57008',
          light: '#fff4eb',
        },
        brandTeal: {
          DEFAULT: '#00C995', // Teal green
          hover: '#00b082',
          light: '#e6faf5',
        },
        surfaceNeutral: '#F4F7FA', // Soft neutral background
      },
      fontFamily: {
        sans: ['"Inter"', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 10px 30px -5px rgba(8, 21, 37, 0.08), 0 4px 6px -2px rgba(8, 21, 37, 0.04)',
        'elevated': '0 20px 40px -15px rgba(8, 21, 37, 0.15)',
        'glow-teal': '0 0 25px rgba(0, 201, 149, 0.35)',
        'glow-orange': '0 0 25px rgba(255, 133, 27, 0.35)',
      }
    },
  },
  plugins: [],
}
