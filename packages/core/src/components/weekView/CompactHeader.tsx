import { ICalendarApp } from '@/types';

interface CompactHeaderProps {
  app: ICalendarApp;
  fullWeekDates: Array<{
    date: number;
    month: string;
    fullDate: Date;
    isToday: boolean;
    isCurrent: boolean;
    dayName: string;
  }>;
  mobilePageStart: Date;
  onDateChange?: (date: Date) => void;
}

export const CompactHeader = ({
  app,
  fullWeekDates,
  mobilePageStart,
  onDateChange,
}: CompactHeaderProps) => {
  const formatLabel = (name: string) => {
    const n = name.toLowerCase();
    if (
      n.startsWith('tu') ||
      n.startsWith('th') ||
      n.startsWith('sa') ||
      n.startsWith('su')
    ) {
      return name.substring(0, 2);
    }
    return name.substring(0, 1);
  };

  return (
    <div className="flex flex-col w-full py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      {/* Weekday labels row */}
      <div className="grid grid-cols-7 mb-1">
        {fullWeekDates.map((day, index) => (
          <div key={`label-${index}`} className="flex justify-center">
            <span
              className={`text-[10px] font-medium ${day.isToday ? 'text-primary' : 'text-gray-500'}`}
            >
              {formatLabel(day.dayName)}
            </span>
          </div>
        ))}
      </div>

      {/* Dates row with capsule */}
      <div className="relative grid grid-cols-7 overflow-hidden">
        {(() => {
          const startIndex = fullWeekDates.findIndex(
            d => d.fullDate.getTime() === mobilePageStart.getTime()
          );

          const capsuleLeft =
            startIndex !== -1
              ? `calc(${((startIndex + 0.5) / 7) * 100}% - 16px)`
              : '0';
          // Width covers current column + next column (1/7 + 32px padding)
          const capsuleWidth = `calc(${(1 / 7) * 100}% + 32px)`;

          return (
            <>
              <div
                className="absolute bg-gray-100 dark:bg-gray-800 rounded-full transition-all duration-300"
                style={{
                  left: capsuleLeft,
                  top: 0,
                  width: capsuleWidth,
                  height: '32px',
                }}
              />

              {fullWeekDates.map((day, index) => {
                const isSelected = day.isCurrent;
                const isInsidePill =
                  index === startIndex || index === startIndex + 1;

                return (
                  <div
                    key={`date-${index}`}
                    className="flex justify-center items-center cursor-pointer relative z-10"
                    style={{ height: '32px' }}
                    onClick={() => {
                      app.setCurrentDate(day.fullDate);
                      onDateChange?.(day.fullDate);
                    }}
                  >
                    <div
                      className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                        transition-all duration-300 relative
                        ${
                          isSelected
                            ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 shadow-sm'
                            : day.isToday
                              ? 'text-primary font-bold'
                              : isInsidePill
                                ? 'text-gray-900 dark:text-gray-100'
                                : 'text-gray-500 dark:text-gray-400'
                        }
                      `}
                    >
                      {day.date}
                      {day.isToday && !isSelected && (
                        <div className="absolute bottom-1 w-1 h-1 bg-primary rounded-full"></div>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          );
        })()}
      </div>
    </div>
  );
};
