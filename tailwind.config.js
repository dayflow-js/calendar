/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './examples/**/*.{js,jsx,ts,tsx}',
    './index.html',
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
