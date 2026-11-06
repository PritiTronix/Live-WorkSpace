/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#6848E8',
          button: '#6040F0',
          hover: '#5639D8',
          light: '#8870F0',
          lavender: '#AFA7DB',
          canvas: '#F5F4FC',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          card: '#FFFFFF',
          sidebar: '#F8F8FC',
          canvas: '#F9F9FB',
          border: '#E5E5EF',
        },
        content: {
          primary: '#141529',
          secondary: '#5C5C70',
          muted: '#9C9CA9',
        },
        severity: {
          blocker: '#F55354',
          critical: '#F8A040',
          major: '#F8C048',
        },
        ticketStatus: {
          open: '#3888F8',
          wip: '#6848E8',
          onHold: '#F8A040',
          resolved: '#28C078',
          closed: '#9C9CA9',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Plus Jakarta Sans', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        sm: '0.25rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.5rem',
      },
    },
  },
  plugins: [],
}
