import React, { useRef, useCallback } from 'react';
import { createRoot, Root } from 'react-dom/client';
import {
  EventLayout,
  Event,
  UnifiedDragRef,
  useDragProps,
  ViewType,
  UseDragManagerReturn,
} from '../../types';
import DragIndicatorComponent from '../../components/weekView/DragIndicator/DragIndicatorComponent';
import MonthDragIndicatorComponent from '../../components/monthView/MonthDragIndicator';
import {
  getSelectedBgColor,
  getEventTextColor,
  formatTime,
} from '../../utils';
import { useLocale } from '@/locale';
import { LocaleProvider } from '@/locale/LocaleProvider';
import { dateToZonedDateTime } from '../../utils/temporal';

export const useDragManager = (options: useDragProps): UseDragManagerReturn => {
  const { t, locale } = useLocale();
  const {
    calendarRef,
    allDayRowRef,
    viewType,
    getLineColor,
    getDynamicPadding,
    renderer,
    HOUR_HEIGHT = 72,
    FIRST_HOUR = 0,
    TIME_COLUMN_WIDTH = 80,
    ALL_DAY_HEIGHT = 60,
    app,
    isMobile,
  } = options;

  const isMonthView = viewType === ViewType.MONTH;
  const isDayView = viewType === ViewType.DAY;

  const dragIndicatorRef = useRef<HTMLDivElement | null>(null);
  const reactRootRef = useRef<Root | null>(null);
  const dragPropsRef = useRef<{
    drag: UnifiedDragRef;
    color?: string;
    title?: string;
    layout?: EventLayout | null;
  } | null>(null);

  // Remove drag indicator
  const removeDragIndicator = useCallback(() => {
    if (reactRootRef.current) {
      reactRootRef.current.unmount();
      reactRootRef.current = null;
    }
    if (dragIndicatorRef.current) {
      dragIndicatorRef.current.remove();
      dragIndicatorRef.current = null;
    }
    dragPropsRef.current = null;
  }, []);

  // Create drag indicator
  const createDragIndicator = useCallback(
    (
      drag: UnifiedDragRef,
      color?: string,
      title?: string,
      layout?: EventLayout | null,
      sourceElement?: HTMLElement
    ) => {
      removeDragIndicator();

      const indicator = document.createElement('div');
      indicator.style.position = isMonthView ? 'fixed' : 'absolute';
      indicator.style.pointerEvents = 'none';
      indicator.style.zIndex = '1000';

      if (isMonthView) {
        // Month view indicator logic
        indicator.style.opacity = '0.9';

        let indicatorWidth: number;
        let indicatorHeight: number;

        if (sourceElement) {
          const sourceRect = sourceElement.getBoundingClientRect();
          // Use the number of days occupied by the current segment rather than the entire event,
          // to ensure the indicator always displays as single-day width
          const segmentDays =
            drag.currentSegmentDays ?? drag.eventDurationDays ?? 1;
          indicatorWidth = sourceRect.width / segmentDays;
          indicatorHeight = sourceRect.height;
          indicator.className = `rounded-sm shadow-sm ${sourceElement.className}`;
        } else {
          indicatorWidth = 120;
          indicatorHeight = 22;
          indicator.className = 'rounded text-xs px-2 py-1';
        }

        indicator.style.width = `${indicatorWidth}px`;
        indicator.style.height = `${indicatorHeight}px`;
        indicator.style.left = `${drag.startX - indicatorWidth / 2}px`;
        indicator.style.top = `${drag.startY - indicatorHeight / 2}px`;

        document.body.appendChild(indicator);

        // Render month view content
        reactRootRef.current = createRoot(indicator);
        const now = new Date();
        const nowTemporal = dateToZonedDateTime(now);
        const eventForComponent =
          drag.originalEvent ||
          ({
            id: String(Date.now()),
            color: color || 'blue',
            title: title || t('newEvent'),
            start: nowTemporal,
            end: nowTemporal,
            allDay: false,
            day: 0,
          } as Event);

        reactRootRef.current.render(
          React.createElement(LocaleProvider, { locale },
            React.createElement(MonthDragIndicatorComponent, {
              event: eventForComponent,
              isCreating: drag.mode === 'create',
              targetDate: drag.targetDate || null,
              startDate: drag.originalStartDate || null,
              endDate: drag.originalEndDate || null,
            })
          )
        );
      } else {
        // Week/Day view indicator
        if (sourceElement) {
          const sourceRect = sourceElement.getBoundingClientRect();
          let containerRect;

          if (drag.allDay) {
            containerRect = allDayRowRef?.current?.getBoundingClientRect();
          } else {
            containerRect = calendarRef.current
              ?.querySelector('.calendar-content')
              ?.getBoundingClientRect();
          }

          if (containerRect) {
            if (drag.allDay && isDayView) {
              indicator.style.left = `${TIME_COLUMN_WIDTH}px`;
              indicator.style.top = `${sourceElement.offsetTop - 2}px`;
              indicator.style.width = `calc(100% - ${TIME_COLUMN_WIDTH}px - 2px)`;
              indicator.style.height = `${sourceRect.height}px`;
            } else if (drag.allDay && !isDayView) {
              const totalWidth = (isMobile && !isDayView) ? '175%' : '100%';
              const dayColumnWidth = `calc(${totalWidth} / 7)`;

              indicator.style.left = `calc(${dayColumnWidth} * ${drag.dayIndex})`;
              indicator.style.top = `${sourceElement.offsetTop - 2}px`;
              indicator.style.width = `calc(${dayColumnWidth} - 2px)`;
              indicator.style.height = `${sourceRect.height}px`;
            } else {
              const top = (drag.startHour - FIRST_HOUR) * HOUR_HEIGHT;
              const containerEl = calendarRef.current?.querySelector('.calendar-content');
              const scrollLeft = containerEl?.scrollLeft || 0;

              indicator.style.left = `${sourceRect.left - containerRect.left + scrollLeft}px`;
              indicator.style.top = `${top + 3}px`;
              indicator.style.width = `${sourceRect.width}px`;
              indicator.style.height = `${sourceRect.height}px`;
            }

            indicator.className = sourceElement.className;
            indicator.style.opacity = '0.8';
            indicator.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
          }
        } else {
          // Calculate position logic
          if (drag.allDay) {
            const dayColumnWidth = isDayView
              ? '100%'
              : `calc((100% - ${TIME_COLUMN_WIDTH}px) / 7)`;
            indicator.style.top = '2px';
            indicator.style.height = `${ALL_DAY_HEIGHT - 4}px`;
            indicator.style.marginBottom = '3px';

            if (isDayView) {
              indicator.style.left = `${TIME_COLUMN_WIDTH}px`;
              indicator.style.width = `calc(100% - ${TIME_COLUMN_WIDTH}px - 2px)`;
            } else {
              indicator.style.left = `calc(${TIME_COLUMN_WIDTH}px + (${dayColumnWidth} * ${drag.dayIndex}))`;
              indicator.style.width = `calc(${dayColumnWidth} - 2px)`;
            }
            indicator.className = 'rounded-xl shadow-sm';
          } else {
            const top = (drag.startHour - FIRST_HOUR) * HOUR_HEIGHT;
            const height = (drag.endHour - drag.startHour) * HOUR_HEIGHT;
            indicator.style.top = `${top + 3}px`;
            indicator.style.height = `${height - 4}px`;
            indicator.style.color = '#fff';
            indicator.className = 'rounded-sm shadow-sm';

            if (layout) {
              if (isDayView) {
                indicator.style.left = `${TIME_COLUMN_WIDTH}px`;
                indicator.style.width = `calc(((100% - ${TIME_COLUMN_WIDTH}px) * ${layout.width / 100}) - 3px)`;
              } else {
                const totalWidth = (isMobile && !isDayView) ? '175%' : '100%';
                const dayWidth = `calc(${totalWidth} / 7)`;
                indicator.style.left = `calc((${dayWidth} * ${drag.dayIndex}) + (${dayWidth} * ${layout.left / 100}))`;
                indicator.style.width = `calc((${dayWidth} * ${(layout.width - 1) / 100}))`;
              } indicator.style.zIndex = String(1000);
            } else {
              const totalWidth = (isMobile && !isDayView) ? '175%' : '100%';
              const dayColumnWidth = isDayView
                ? `calc(100% - ${TIME_COLUMN_WIDTH}px)`
                : `calc(${totalWidth} / 7)`;
              indicator.style.left = isDayView
                ? `${TIME_COLUMN_WIDTH}px`
                : `calc(${dayColumnWidth} * ${drag.dayIndex})`;
              indicator.style.width = `calc(${dayColumnWidth} - 3px)`;
            }
          }
        }

        // Add to corresponding container
        if (drag.allDay) {
          allDayRowRef?.current?.appendChild(indicator);
        } else {
          calendarRef.current
            ?.querySelector('.calendar-content')
            ?.appendChild(indicator);
        }

        // Save props for subsequent updates
        dragPropsRef.current = { drag, color, title, layout };

        // Render Week/Day view content
        reactRootRef.current = createRoot(indicator);
        reactRootRef.current.render(
          React.createElement(LocaleProvider, { locale },
            React.createElement(DragIndicatorComponent, {
              drag,
              color,
              title,
              layout,
              allDay: drag.allDay,
              formatTime: formatTime,
              getLineColor: getLineColor || (() => ''),
              getDynamicPadding: getDynamicPadding || (() => '0px'),
              renderer,
              isMobile,
            })
          )
        );
      }

      // Set color
      if (color) {
        indicator.style.backgroundColor = getSelectedBgColor(color, app?.getCalendarRegistry());
        indicator.style.color = getEventTextColor(color, app?.getCalendarRegistry());
      } else {
        indicator.className +=
          ' bg-primary/10 text-primary border border-dashed border-primary/50';
      }

      dragIndicatorRef.current = indicator;
    },
    [
      removeDragIndicator,
      isMonthView,
      isDayView,
      allDayRowRef,
      calendarRef,
      formatTime,
      getLineColor,
      getDynamicPadding,
      renderer,
      TIME_COLUMN_WIDTH,
      ALL_DAY_HEIGHT,
      FIRST_HOUR,
      HOUR_HEIGHT,
    ]
  );

  // Update drag indicator
  const updateDragIndicator = useCallback(
    (...args: (number | boolean | EventLayout | null | undefined)[]) => {
      const indicator = dragIndicatorRef.current;
      if (!indicator) return;

      if (isMonthView) {
        // Month view: update position
        const [clientX, clientY] = args as [number, number];
        const width = parseFloat(indicator.style.width) || 120;
        const height = parseFloat(indicator.style.height) || 22;

        requestAnimationFrame(() => {
          indicator.style.left = `${clientX - width / 2}px`;
          indicator.style.top = `${clientY - height / 2}px`;
          indicator.style.transition = 'none';
        });
      } else {
        // Week/Day view: update position and size
        const [dayIndex, startHour, endHour, isAllDay = false, layout] =
          args as [number, number, number, boolean?, EventLayout?];

        // Ensure in correct container
        if (isAllDay && indicator.parentElement !== allDayRowRef?.current) {
          allDayRowRef?.current?.appendChild(indicator);
        } else if (!isAllDay) {
          const calendarContent =
            calendarRef.current?.querySelector('.calendar-content');
          if (indicator.parentElement !== calendarContent) {
            calendarContent?.appendChild(indicator);
          }
        }

        if (isAllDay) {
          if (isDayView) {
            indicator.style.left = `${TIME_COLUMN_WIDTH}px`;
            indicator.style.width = `calc(100% - ${TIME_COLUMN_WIDTH}px - 2px)`;
          } else {
            const totalWidth = (isMobile && !isDayView) ? '175%' : '100%';
            const dayColumnWidth = `calc(${totalWidth} / 7)`;
            indicator.style.left = `calc(${dayColumnWidth} * ${dayIndex})`;
            indicator.style.width = `calc(${dayColumnWidth} - 2px)`;
            indicator.style.top = '2px';
          }

          indicator.style.height = `${ALL_DAY_HEIGHT - 4}px`;
          indicator.style.marginBottom = '3px';
          indicator.className = indicator.className.replace(
            'rounded-sm',
            'rounded-xl'
          );
        } else {
          const top = (startHour - FIRST_HOUR) * HOUR_HEIGHT;
          const height = (endHour - startHour) * HOUR_HEIGHT;
          indicator.style.top = `${top + 3}px`;
          indicator.style.height = `${height - 4}px`;
          indicator.style.marginBottom = '0';
          indicator.className = indicator.className.replace(
            'rounded-xl',
            'rounded-sm'
          );
          const totalWidth = (isMobile && !isDayView) ? '175%' : '100%';

          if (layout) {
            if (isDayView) {
              indicator.style.left = `${TIME_COLUMN_WIDTH}px`;
              indicator.style.width = `calc(((100% - ${TIME_COLUMN_WIDTH}px) * ${layout.width / 100}) - 3px)`;
            } else {
              const dayWidth = `calc(${totalWidth} / 7)`;
              indicator.style.left = `calc((${dayWidth} * ${dayIndex}) + (${dayWidth} * ${layout.left / 100}))`;
              indicator.style.width = `calc((${dayWidth} * ${(layout.width - 1) / 100}))`;
            }
            indicator.style.zIndex = String(layout.zIndex + 10);
          } else {
            const dayColumnWidth = isDayView
              ? `calc(100% - ${TIME_COLUMN_WIDTH}px)`
              : `calc(${totalWidth} / 7)`;
            indicator.style.left = isDayView
              ? `${TIME_COLUMN_WIDTH}px`
              : `calc(${dayColumnWidth} * ${dayIndex})`;
            indicator.style.width = `calc(${dayColumnWidth} - 3px)`;
          }
        }

        indicator.style.cursor = 'grabbing';

        // Re-render React component to update drag data
        if (reactRootRef.current && dragPropsRef.current) {
          const updatedDrag = {
            ...dragPropsRef.current.drag,
            dayIndex,
            startHour,
            endHour,
            allDay: isAllDay,
          };

          dragPropsRef.current.drag = updatedDrag;

          reactRootRef.current.render(
            React.createElement(LocaleProvider, { locale },
              React.createElement(DragIndicatorComponent, {
                drag: updatedDrag,
                color: dragPropsRef.current.color,
                title: dragPropsRef.current.title,
                layout: layout || dragPropsRef.current.layout,
                allDay: isAllDay,
                formatTime: formatTime,
                getLineColor: getLineColor || (() => ''),
                getDynamicPadding: getDynamicPadding || (() => '0px'),
                renderer,
                isMobile,
              })
            )
          );
        }
      }
    },
    [
      isMonthView,
      allDayRowRef,
      formatTime,
      calendarRef,
      isDayView,
      ALL_DAY_HEIGHT,
      TIME_COLUMN_WIDTH,
      FIRST_HOUR,
      HOUR_HEIGHT,
      getLineColor,
      getDynamicPadding,
      renderer,
    ]
  );

  return {
    dragIndicatorRef,
    reactRootRef,
    removeDragIndicator,
    createDragIndicator,
    updateDragIndicator,
  };
};
