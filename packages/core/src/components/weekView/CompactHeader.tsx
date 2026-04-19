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
  <div className='df-compact-header'>
    {/* Weekday labels row */}
    <div className='df-compact-header-labels'>
      {fullWeekDates.map((day, index) => (
        <div key={`label-${index}`} className='df-compact-header-label-cell'>
          <span
            className='df-compact-header-label'
            data-today={day.isToday ? 'true' : 'false'}
          >
            {formatLabel(day.dayName)}
          </span>
        </div>
      ))}
    </div>

    {/* Dates row with capsule */}
    <div className='df-compact-header-dates'>
      {(() => {
        if (!mobilePageStart) return null;

        const columnsPerPage = 2;

        const startIndex = fullWeekDates.findIndex(
          d => d.fullDate.getTime() === mobilePageStart.getTime()
        );

        const capsuleLeft =
          startIndex === -1
            ? '0'
            : `calc(${((startIndex + 0.5) / 7) * 100}% - 16px)`;
        // Width covers 2 columns
        const capsuleWidth = `calc(${(1 / 7) * 100}% + 32px)`;

        return (
          <>
            <div
              className='df-compact-header-capsule'
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
                index >= startIndex && index < startIndex + columnsPerPage;

              return (
                <div
                  key={`date-${index}`}
                  className='df-compact-header-date-button'
                  style={{ height: '32px' }}
                  onClick={() => {
                    app.setCurrentDate(day.fullDate);
                    onDateChange?.(day.fullDate);
                  }}
                >
                  <div
                    className='df-compact-header-date-pill'
                    data-selected={isSelected ? 'true' : 'false'}
                    data-today={day.isToday ? 'true' : 'false'}
                    data-inside-pill={isInsidePill ? 'true' : 'false'}
                  >
                    {day.date}
                    {day.isToday && !isSelected && (
                      <div className='df-compact-header-today-dot' />
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
