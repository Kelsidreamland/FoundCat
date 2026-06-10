/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      fontFamily: {
        sans: ['"Noto Sans TC"', '"M PLUS Rounded 1c"', '"PingFang TC"', '"Microsoft JhengHei"', 'sans-serif'],
        serif: ['"Noto Serif TC"', '"M PLUS Rounded 1c"', '"PingFang TC"', 'serif'],
      },
      colors: {
        cat: {
          bg: '#FFF3E0', // Cat Cream
          card: '#FFF8F0', // Warm Milk
          surface: '#ffffff', // Pure White
          sand: '#FFE0B2', // Light Orange Cream
          dark: '#4E342E', // Dark Cat Brown

          primary: '#3E2723', // Deep Brown
          brand: '#FF8A65', // Paw Orange
          accent: '#FFAB91', // Paw Pink
          error: '#D32F2F', // Error Red
          focus: '#FFB74D', // Warm Ginger Focus

          text: {
            main: '#3E2723', // Deep Brown
            secondary: '#6D4C41', // Cat Brown
            tertiary: '#A1887F', // Soft Brown
            warm: '#5D4037', // Warm Brown
          },

          border: {
            light: '#FFECB3', // Cream Border
            warm: '#FFE0B2', // Border Warm
          },

          ring: {
            warm: '#FFCC80',
            deep: '#FFB74D'
          }
        }
      },
      boxShadow: {
        'cat-ring': '0 0 0 1px #FFCC80',
        'cat-ring-deep': '0 0 0 1px #FFB74D',
        'cat-whisper': '0 4px 24px rgba(0,0,0,0.05)',
        'cat-inset': 'inset 0 0 0 1px rgba(0,0,0,0.15)',
        'cat-depth-3': '0 10px 40px rgba(0,0,0,0.1)',
      }
    },
  },
  plugins: [
    require('tailwind-scrollbar-hide')
  ],
};
