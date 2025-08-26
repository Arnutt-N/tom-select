/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Custom colors for Tom-Select theming
      colors: {
        'tom-select': {
          primary: '#3b82f6',
          secondary: '#64748b',
          border: '#e5e7eb',
          hover: '#f3f4f6',
          selected: '#dbeafe',
          disabled: '#9ca3af'
        }
      }
    },
  },
  plugins: [],
}