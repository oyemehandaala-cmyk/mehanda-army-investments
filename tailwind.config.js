/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        destructive: 'var(--destructive)',
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        sidebar: {
          DEFAULT: 'var(--sidebar)',
          foreground: 'var(--sidebar-foreground)',
          primary: 'var(--sidebar-primary)',
          'primary-foreground': 'var(--sidebar-primary-foreground)',
          accent: 'var(--sidebar-accent)',
          'accent-foreground': 'var(--sidebar-accent-foreground)',
          border: 'var(--sidebar-border)',
          ring: 'var(--sidebar-ring)',
        },
        navy: {
          900: '#081525', // Midnight navy
          800: '#10243B', // Deep blue
          700: '#183454',
          600: '#23466f',
        },
        brandOrange: {
          DEFAULT: '#876A2E',
          hover: '#725522',
          light: '#F6F2E8',
        },
        brandTeal: {
          DEFAULT: '#50745A',
          hover: '#42634B',
          light: '#EDF3EE',
        },
        surfaceNeutral: '#F6F6F3',
      },
      fontFamily: {
        sans: ['"Geist Variable"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 10px 30px -5px rgba(8, 21, 37, 0.08), 0 4px 6px -2px rgba(8, 21, 37, 0.04)',
        'elevated': '0 20px 40px -15px rgba(8, 21, 37, 0.15)',
        'glow-teal': '0 0 25px rgba(80, 116, 90, 0.2)',
        'glow-orange': '0 0 25px rgba(135, 106, 46, 0.2)',
      }
    },
  },
  plugins: [],
}
