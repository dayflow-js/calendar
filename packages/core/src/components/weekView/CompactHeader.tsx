import { ICalendarApp } from '@/types';

interface CompactHeaderProps {
  app: ICalendarApp;
  fullWeekDates?: Array<{
    date: number;
    month: string;
    fullDate: Date;
    isToday: boolean;
    isCurrent: boolean;
    dayName: string;
  }>;
  mobilePageStart?: Date;
  onDateChange?: (date: Date) => void;
}

const formatLabel = (name: string) => {
  const n = name.toLowerCase();
  if (
    n.startsWith('tu') ||
    n.startsWith('th') ||
    n.startsWith('sa') ||
    n.startsWith('su')
  ) {
    return name.slice(0, 2);
  }
  return name.slice(0, 1);
};

export const CompactHeader = ({
  app,
  fullWeekDates = [],
  mobilePageStart,
  onDateChange,
}: CompactHeaderProps) => (
  <div className='flex w-full flex-col border-b border-gray-200 bg-white py-3 dark:border-gray-700 dark:bg-gray-900'>
    {/* Weekday labels row */}
    <div className='mb-1 grid grid-cols-7'>
      {fullWeekDates.map((day, index) => (
        <div key={`label-${index}`} className='flex justify-center'>
          <span
            className={`text-[10px] font-medium ${day.isToday ? 'text-primary' : 'text-gray-500'}`}
          >
            {formatLabel(day.dayName)}
          </span>
        </div>
      ))}
    </div>

    {/* Dates row with capsule */}
    <div className='relative grid grid-cols-7 overflow-hidden'>
      {(() => {
        if (!mobilePageStart) return null;

        const startIndex = fullWeekDates.findIndex(
          d => d.fullDate.getTime() === mobilePageStart.getTime()
        );

        const capsuleLeft =
          startIndex === -1
            ? '0'
            : `calc(${((startIndex + 0.5) / 7) * 100}% - 16px)`;
        // Width covers current column + next column (1/7 + 32px padding)
        const capsuleWidth = `calc(${(1 / 7) * 100}% + 32px)`;

        return (
          <>
            <div
              className='absolute rounded-full bg-gray-100 transition-all duration-300 dark:bg-gray-800'
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
                  className='relative z-10 flex cursor-pointer items-center justify-center'
                  style={{ height: '32px' }}
                  onClick={() => {
                    app.setCurrentDate(day.fullDate);
                    onDateChange?.(day.fullDate);
                  }}
                >
                  <div
                    className={`relative flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-all duration-300 ${isSelected ? 'bg-gray-900 text-white shadow-sm dark:bg-gray-100 dark:text-gray-900' : day.isToday ? 'font-bold text-primary' : isInsidePill ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'} `}
                  >
                    {day.date}
                    {day.isToday && !isSelected && (
                      <div className='absolute bottom-1 h-1 w-1 rounded-full bg-primary'></div>
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
