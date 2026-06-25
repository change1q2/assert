/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FF6B6B',
          50: '#FFF5F5',
          100: '#FFE5E5',
          200: '#FFCCCC',
          300: '#FFB3B3',
          400: '#FF9999',
          500: '#FF6B6B',
          600: '#FF4747',
          700: '#FF2323',
          800: '#E60000',
          900: '#B30000',
        },
        secondary: {
          DEFAULT: '#4ECDC4',
          50: '#F0FAFA',
          100: '#E0F7F5',
          200: '#B3F0EB',
          300: '#80E9E1',
          400: '#4DE2D7',
          500: '#4ECDC4',
          600: '#2DBDB3',
          700: '#22A69A',
          800: '#1A8F80',
          900: '#137866',
        },
        accent: {
          DEFAULT: '#FFE66D',
          50: '#FFFBF0',
          100: '#FFF8E0',
          200: '#FFF0C0',
          300: '#FFE8A0',
          400: '#FFE080',
          500: '#FFE66D',
          600: '#FFDE47',
          700: '#FFD621',
          800: '#E6BE00',
          900: '#B39800',
        },
        dark: {
          DEFAULT: '#1A1A2E',
          50: '#F8F9FA',
          100: '#E9ECEF',
          200: '#DEE2E6',
          300: '#CED4DA',
          400: '#ADB5BD',
          500: '#6C757D',
          600: '#495057',
          700: '#343A40',
          800: '#1A1A2E',
          900: '#121220',
        },
        text: {
          primary: '#2D3436',
          secondary: '#636E72',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans SC', 'sans-serif'],
        display: ['Noto Sans SC', 'Inter', 'sans-serif'],
        mono: ['DM Sans', 'monospace'],
      },
      boxShadow: {
        'card': '0 4px 20px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 8px 30px rgba(0, 0, 0, 0.12)',
        'glow': '0 0 20px rgba(255, 107, 107, 0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'bounce-in': 'bounceIn 0.6s ease-out',
        'pulse-glow': 'pulseGlow 2s infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        bounceIn: {
          '0%': { opacity: '0', transform: 'scale(0.3)' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(255, 107, 107, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(255, 107, 107, 0.6)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
};
