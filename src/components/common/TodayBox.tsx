import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  handlePreviousMonth: () => void;
  handleToday: () => void;
  handleNextMonth: () => void;
}

const TodayBox: React.FC<Props> = ({
  handlePreviousMonth,
  handleToday,
  handleNextMonth,
}) => {
  return (
    <div className="flex items-center gap-1">
      <button
        className="calendar-nav-button group relative inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 active:bg-gray-100 transition-all duration-150 shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        onClick={handlePreviousMonth}
        aria-label="Previous month"
      >
        <ChevronLeft className="h-4 w-4 transition-transform group-hover:scale-110" />
      </button>
      <button
        className="calendar-today-button inline-flex items-center justify-center px-4 py-[5px] text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-900 hover:bg-gray-50 hover:border-gray-300 active:bg-gray-100 transition-all duration-150 shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 min-w-[70px]"
        onClick={handleToday}
      >
        Today
      </button>
      <button
        className="calendar-nav-button group relative inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 active:bg-gray-100 transition-all duration-150 shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        onClick={handleNextMonth}
        aria-label="Next month"
      >
        <ChevronRight className="h-4 w-4 transition-transform group-hover:scale-110" />
      </button>
    </div>
  );
};

export default TodayBox;
