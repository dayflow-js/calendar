import { MiniCalendar } from '@/components/common/MiniCalendar';
import TodayBox from '@/components/common/TodayBox';
import { useLocale } from '@/locale';
import { miniCalendarContainer } from '@/styles/classNames';
import { ICalendarApp, Event } from '@/types';
import {
  formatTime,
  extractHourFromDate,
  getCalendarLineColors,
  buildColorBarGradient,
  getEventEndHour,
} from '@/utils';
import { temporalToVisualDate } from '@/utils/temporalTypeGuards';

interface RightPanelProps {
  app: ICalendarApp;
  currentDate: Date;
  visibleMonth: Date;
  currentDayEvents: Event[];
  selectedEvent: Event | null;
  setSelectedEvent: (event: Event | null) => void;
  handleMonthChange: (offset: number) => void;
  handleDateSelect: (date: Date) => void;
  switcherMode: string;
  timeFormat?: '12h' | '24h';
  showEventDots?: boolean;
  appTimeZone?: string;
}

export const RightPanel = ({
  app,
  currentDate,
  visibleMonth,
  currentDayEvents,
  selectedEvent,
  setSelectedEvent,
  handleMonthChange,
  handleDateSelect,
  switcherMode,
  timeFormat = '24h',
  showEventDots = true,
  appTimeZone,
}: RightPanelProps) => {
  const { t, locale } = useLocale();

  const sortedEvents = [...currentDayEvents].toSorted((a, b) => {
    if (a.allDay && !b.allDay) return -1;
    if (!a.allDay && b.allDay) return 1;
    return 0;
  });

  return (
    <div
      className='df-right-panel'
      data-switcher-mode={switcherMode}
      onContextMenu={e => e.preventDefault()}
    >
      <div className='df-right-panel-layout'>
        {/* Mini calendar */}
        <div className={miniCalendarContainer}>
          <div className='df-right-panel-calendar-shell'>
            <div className='df-right-panel-calendar-header'>
              <div className='df-right-panel-header-spacer' aria-hidden='true'>
                &nbsp;
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
              events={app.getEvents()}
              showEventDots={showEventDots}
              calendarRegistry={app.getCalendarRegistry()}
              timeZone={app.timeZone}
            />
          </div>
        </div>

        {/* Event details area */}
        <div className='df-right-panel-events'>
          <div className='df-right-panel-events-inner'>
            <h3 className='df-right-panel-date-heading'>
              {currentDate.toLocaleDateString(locale, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </h3>

            {sortedEvents.length === 0 ? (
              <p className='df-right-panel-empty'>{t('noEvents')}</p>
            ) : (
              <div className='df-right-panel-list'>
                {sortedEvents.map((event: Event) => (
                  <div
                    key={event.id}
                    className='df-right-panel-event-card'
                    data-selected={
                      selectedEvent?.id === event.id ? 'true' : 'false'
                    }
                    style={(() => {
                      const lc = getCalendarLineColors(event);
                      return {
                        borderLeftColor: lc.length > 1 ? undefined : lc[0],
                        borderLeftImage:
                          lc.length > 1
                            ? `${buildColorBarGradient(lc)} 1`
                            : undefined,
                      };
                    })()}
                    onClick={() => {
                      setSelectedEvent(event);
                      app.onEventClick(event);
                    }}
                  >
                    <div className='df-right-panel-event-title'>
                      {event.title}
                    </div>
                    {!event.allDay && (
                      <div className='df-right-panel-event-time'>
                        {formatTime(
                          appTimeZone
                            ? extractHourFromDate(
                                temporalToVisualDate(event.start, appTimeZone)
                              )
                            : extractHourFromDate(event.start),
                          0,
                          timeFormat
                        )}{' '}
                        -{' '}
                        {formatTime(
                          appTimeZone
                            ? extractHourFromDate(
                                temporalToVisualDate(
                                  event.end ?? event.start,
                                  appTimeZone
                                )
                              )
                            : getEventEndHour(event),
                          0,
                          timeFormat
                        )}
                      </div>
                    )}
                    {event.allDay && (
                      <div className='df-right-panel-event-time'>
                        {t('allDay')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
