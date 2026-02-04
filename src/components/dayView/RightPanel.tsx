import React from 'react';
import { CalendarApp } from '@/core';
import { MiniCalendar } from '@/components/common/MiniCalendar';
import TodayBox from '@/components/common/TodayBox';
import { useLocale } from '@/locale';
import { Event } from '@/types';
import {
  formatTime,
  extractHourFromDate,
  getLineColor,
  getEventEndHour,
} from '@/utils';
import {
  miniCalendarContainer,
  headerContainer,
  headerTitle,
  flexCol,
  p2,
  p4,
  mb3,
  textXs,
  textLg,
  textSm,
  textGray500,
  textGray600,
} from '@/styles/classNames';

interface RightPanelProps {
  app: CalendarApp;
  currentDate: Date;
  visibleMonth: Date;
  currentDayEvents: Event[];
  selectedEvent: Event | null;
  setSelectedEvent: (event: Event | null) => void;
  handleMonthChange: (offset: number) => void;
  handleDateSelect: (date: Date) => void;
  switcherMode: string;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  app,
  currentDate,
  visibleMonth,
  currentDayEvents,
  selectedEvent,
  setSelectedEvent,
  handleMonthChange,
  handleDateSelect,
  switcherMode,
}) => {
  const { t, locale } = useLocale();

  return (
    <div
      className={`df-right-panel hidden md:block flex-none ${switcherMode === 'buttons' ? '' : ''} w-[30%] bg-white dark:bg-gray-900`}
    >
      <div className={`${flexCol} h-full`}>
        {/* Mini calendar */}
        <div className={miniCalendarContainer}>
          <div>
            <div className="flex items-center justify-end gap-2">
              <div
                className={headerContainer}
                style={{ position: 'relative' }}
              >
                <div>
                  <h1 className={headerTitle}>&nbsp;</h1>
                </div>
              </div>
              <TodayBox
                handlePreviousMonth={() => app.goToPrevious()}
                handleNextMonth={() => app.goToNext()}
                handleToday={() => app.goToToday()}
              />
            </div>
            <MiniCalendar
              visibleMonth={visibleMonth}
              currentDate={currentDate}
              showHeader={true}
              onMonthChange={handleMonthChange}
              onDateSelect={handleDateSelect}
            />
          </div>
        </div>

        {/* Event details area */}
        <div className={`flex-1 ${p4} overflow-y-auto`}>
          <h3 className={`${textLg} font-semibold ${mb3}`}>
            {currentDate.toLocaleDateString(locale, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </h3>

          {currentDayEvents.length === 0 ? (
            <p className={`${textGray500} ${textSm}`}>
              {t('noEvents')}
            </p>
          ) : (
            <div className="space-y-2">
              {currentDayEvents.map(event => (
                <div
                  key={event.id}
                  className={`
                    ${p2} rounded border-l-4 cursor-pointer transition-colors
                    ${selectedEvent?.id === event.id ? 'bg-primary/10 border-primary' : 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600'}
                    hover:bg-gray-100 dark:hover:bg-gray-700
                  `}
                  style={{
                    borderLeftColor: getLineColor(event.calendarId || 'blue'),
                  }}
                  onClick={() => {
                    setSelectedEvent(event);
                    app.onEventClick(event);
                  }}
                >
                  <div className={`font-medium ${textSm}`}>{event.title}</div>
                  {!event.allDay && (
                    <div className={`${textXs} ${textGray600}`}>
                      {formatTime(extractHourFromDate(event.start))} -{' '}
                      {formatTime(getEventEndHour(event))}
                    </div>
                  )}
                  {event.allDay && (
                    <div className={`${textXs} ${textGray600}`}>{t('allDay')}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
