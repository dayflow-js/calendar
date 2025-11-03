/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    // Include parent src directory to scan calendar component styles
    '../src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // Add custom spacing for calendar hour heights
      spacing: {
        18: '4.5rem', // 72px - used for HOUR_HEIGHT in WeekView/DayView
      },
    },
  },
  plugins: [],
};
