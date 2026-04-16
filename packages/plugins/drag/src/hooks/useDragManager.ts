import {
  EventLayout,
  Event,
  UnifiedDragRef,
  useDragProps,
  ViewType,
  UseDragManagerReturn,
  getSelectedBgColor,
  getEventTextColor,
  getCalendarEventBgColors,
  buildDiagonalPatternBackground,
  formatTime,
  useLocale,
  LocaleProvider,
  dateToZonedDateTime,
} from '@dayflow/core';
import DragIndicatorComponent from '@drag/components/DragIndicatorComponent';
import MonthDragIndicatorComponent from '@drag/components/MonthDragIndicator';
import { isUsableIndicatorBackground } from '@drag/hooks/utils/indicatorColor';
import { h, render } from 'preact';
import { useRef, useCallback } from 'preact/hooks';

export const useDragManager = (options: useDragProps): UseDragManagerReturn => {
  const { t, locale } = useLocale();
  const {
    calendarRef,
    allDayRowRef,
    timeGridRef,
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

  const isDateGridView =
    viewType === ViewType.MONTH || viewType === ViewType.YEAR;
  const isDayView = viewType === ViewType.DAY;

  // Measure offset from .df-calendar-content top to the first time grid row,
  // accounting for boundary elements (e.g. top boundary) above the grid
  const getGridOffset = useCallback(() => {
    const containerEl = calendarRef.current?.querySelector(
      '.df-calendar-content'
    );
    if (!containerEl) return 0;
    const firstGridRow = containerEl.querySelector('.df-time-grid-row');
    if (!firstGridRow) return 0;
    return (
      firstGridRow.getBoundingClientRect().top -
      containerEl.getBoundingClientRect().top +
      containerEl.scrollTop
    );
  }, [calendarRef]);

  const dragIndicatorRef = useRef<HTMLDivElement | null>(null);
  const dragPropsRef = useRef<{
    drag: UnifiedDragRef;
    color?: string;
    title?: string;
    layout?: EventLayout | null;
  } | null>(null);

  // Remove drag indicator
  const removeDragIndicator = useCallback(() => {
    if (dragIndicatorRef.current) {
      render(null, dragIndicatorRef.current);
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

      // Tracks whether the indicator has a light background (used for text color in renderer)
      let isLightIndicator = false;

      const indicator = document.createElement('div');
      indicator.style.position = isDateGridView ? 'fixed' : 'absolute';
      indicator.style.pointerEvents = 'none';
      indicator.style.zIndex = '1000';

      if (isDateGridView) {
        // indicator logic
        indicator.style.opacity = '0.9';

        let indicatorWidth: number;
        let indicatorHeight: number;

        if (sourceElement) {
          const sourceRect = sourceElement.getBoundingClientRect();
          // Use single day cell width for indicator (Apple Calendar style)
          const dayCellEl = calendarRef.current?.querySelector('[data-date]');
          indicatorWidth = dayCellEl
            ? Math.round(dayCellEl.getBoundingClientRect().width)
            : Math.min(sourceRect.width, 120);
          indicatorHeight = sourceRect.height;
          indicator.className = `rounded-sm shadow-sm ${sourceElement.className}`;
        } else {
          indicatorWidth = 120;
          indicatorHeight = 22;
          indicator.className = 'rounded text-xs px-2 py-1';
        }

        indicator.style.width = `${indicatorWidth}px`;
        indicator.style.height = `${indicatorHeight}px`;
        indicator.style.left = '0px';
        indicator.style.top = '0px';
        indicator.style.willChange = 'transform';

        indicator.style.transform = `translate3d(${drag.startX - indicatorWidth / 2}px, ${drag.startY - indicatorHeight / 2}px, 0)`;

        document.body.append(indicator);

        // Save props for subsequent updates
        dragPropsRef.current = { drag, color, title, layout };

        // Render month view content
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

        render(
          h(
            LocaleProvider,
            { locale },
            h(MonthDragIndicatorComponent, {
              event: eventForComponent,
              isCreating: drag.mode === 'create',
              targetDate: drag.targetDate || null,
              startDate: drag.originalStartDate || null,
              endDate: drag.originalEndDate || null,
              isMobile,
            })
          ),
          indicator
        );
      } else {
        // Week/Day view indicator
        const isMultiCalendarIndicator =
          !!drag.calendarIds && drag.calendarIds.length > 1;
        const targetContainer = drag.allDay
          ? drag.indicatorContainer || allDayRowRef?.current
          : timeGridRef?.current ||
            calendarRef.current?.querySelector('.df-calendar-content');
        const isInsideTimeGrid =
          !drag.allDay && targetContainer === timeGridRef?.current;

        if (sourceElement) {
          const sourceRect = sourceElement.getBoundingClientRect();
          let containerRect;

          if (drag.allDay) {
            containerRect = allDayRowRef?.current?.getBoundingClientRect();
          } else {
            containerRect = calendarRef.current
              ?.querySelector('.df-calendar-content')
              ?.getBoundingClientRect();
          }

          if (containerRect) {
            if (drag.allDay && isDayView) {
              indicator.style.left = `${sourceRect.left - containerRect.left}px`;
              indicator.style.top = `${sourceRect.top - containerRect.top}px`;
              indicator.style.width = `${sourceRect.width}px`;
              indicator.style.height = `${sourceRect.height}px`;
            } else if (drag.allDay && !isDayView) {
              indicator.style.left = `${sourceRect.left - containerRect.left}px`;
              indicator.style.top = `${sourceRect.top - containerRect.top}px`;
              indicator.style.width = `${sourceRect.width}px`;
              indicator.style.height = `${sourceRect.height}px`;
            } else {
              const top = (drag.startHour - FIRST_HOUR) * HOUR_HEIGHT;
              const containerEl = calendarRef.current?.querySelector(
                '.df-calendar-content'
              );
              const scrollLeft = containerEl?.scrollLeft || 0;
              const gridOffset = isInsideTimeGrid ? 0 : getGridOffset();

              indicator.style.left = isInsideTimeGrid
                ? `${sourceRect.left - (timeGridRef?.current?.getBoundingClientRect().left || 0)}px`
                : `${sourceRect.left - containerRect.left + scrollLeft}px`;
              indicator.style.top = isInsideTimeGrid
                ? `${top + 3}px`
                : `${top + 3 + gridOffset}px`;
              indicator.style.width = `${sourceRect.width}px`;
              indicator.style.height = `${sourceRect.height}px`;
            }

            indicator.className = sourceElement.className;
            indicator.style.margin = '0';
            indicator.style.opacity = '0.8';
            indicator.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
          }
        } else if (drag.allDay) {
          // Calculate position logic
          indicator.style.top = '2px';
          indicator.style.height = `${ALL_DAY_HEIGHT - 4}px`;
          indicator.style.marginBottom = '3px';
          indicator.className = 'rounded-xl shadow-sm';

          if (isDayView) {
            indicator.style.left = `${TIME_COLUMN_WIDTH}px`;
            const gutterOffset = isMobile ? 0 : 11;
            indicator.style.width = `calc(100% - ${TIME_COLUMN_WIDTH}px - ${2 + gutterOffset}px)`;
          } else {
            const totalWidth =
              options.gridWidth || (isMobile ? '175%' : '100%');
            const daysToShow = options.displayDays || 7;
            const dayColumnWidth = `calc(${totalWidth} / ${daysToShow})`;
            indicator.style.left = `calc(${dayColumnWidth} * ${drag.dayIndex})`;
            indicator.style.width = `calc(${dayColumnWidth} - 2px)`;
          }
        } else {
          const gridOffset = isInsideTimeGrid ? 0 : getGridOffset();
          const top = (drag.startHour - FIRST_HOUR) * HOUR_HEIGHT;
          const height = (drag.endHour - drag.startHour) * HOUR_HEIGHT;
          indicator.style.top = isInsideTimeGrid
            ? `${top + 3}px`
            : `${top + 3 + gridOffset}px`;
          indicator.style.height = `${height - 4}px`;
          indicator.style.color = '#fff';
          indicator.className = 'rounded-sm shadow-sm';

          const daysToShow = options.displayDays || 7;
          const totalWidth = isInsideTimeGrid
            ? '100%'
            : options.gridWidth || (isMobile && !isDayView ? '175%' : '100%');

          if (layout) {
            if (isDayView) {
              indicator.style.left = isInsideTimeGrid
                ? `${(layout.left / 100) * 100}%`
                : `${TIME_COLUMN_WIDTH}px`;
              indicator.style.width = isInsideTimeGrid
                ? `${layout.width}%`
                : `calc(((100% - ${TIME_COLUMN_WIDTH}px) * ${layout.width / 100}) - 3px)`;
            } else {
              const dayWidth = `calc(${totalWidth} / ${daysToShow})`;
              indicator.style.left = `calc((${dayWidth} * ${drag.dayIndex}) + (${dayWidth} * ${layout.left / 100}))`;
              indicator.style.width = `calc((${dayWidth} * ${(layout.width - 1) / 100}))`;
            }
            indicator.style.zIndex = String(1000);
          } else if (isDayView) {
            indicator.style.left = isInsideTimeGrid
              ? '0px'
              : `${TIME_COLUMN_WIDTH}px`;
            indicator.style.width = isInsideTimeGrid
              ? '100%'
              : `calc(100% - ${TIME_COLUMN_WIDTH}px - 3px)`;
          } else {
            const dayColumnWidth = `calc(${totalWidth} / ${daysToShow})`;
            indicator.style.left = `calc(${dayColumnWidth} * ${drag.dayIndex})`;
            indicator.style.width = `calc(${dayColumnWidth} - 3px)`;
          }
        }

        // Add to corresponding container
        targetContainer?.append(indicator);

        // Save props for subsequent updates
        dragPropsRef.current = { drag, color, title, layout };

        // Determine if this will be a light-background indicator (multi-calendar)
        isLightIndicator = isMultiCalendarIndicator;

        // Render Week/Day view content
        render(
          h(
            LocaleProvider,
            { locale },
            h(DragIndicatorComponent, {
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
              isLightBackground: isLightIndicator,
            })
          ),
          indicator
        );
      }

      // Set color
      if (isDateGridView && sourceElement) {
        // Month/Year: prefer the rendered event shell color so the drag pill
        // exactly matches the event, even when custom content handles the drag
        // start or the color comes from computed styles instead of inline styles.
        const computedStyle = window.getComputedStyle(sourceElement);

        // Multi-calendar events use CSS `background` shorthand (gradient pattern).
        // Check inline `background` first so we capture the diagonal stripe pattern.
        const inlineBackground = sourceElement.style.background;
        if (inlineBackground && inlineBackground !== '') {
          indicator.style.background = inlineBackground;
          // Source element text color is already set to the dark event text color.
          const resolvedTextColor = sourceElement.style.color
            ? sourceElement.style.color
            : computedStyle.color || 'inherit';
          indicator.style.color = resolvedTextColor;
        } else {
          const resolvedBackgroundColor = isUsableIndicatorBackground(
            sourceElement.style.backgroundColor
          )
            ? sourceElement.style.backgroundColor
            : isUsableIndicatorBackground(computedStyle.backgroundColor)
              ? computedStyle.backgroundColor
              : color
                ? getSelectedBgColor(color, app?.getCalendarRegistry())
                : '';
          const resolvedTextColor = sourceElement.style.color
            ? sourceElement.style.color
            : computedStyle.color || '#fff';

          if (resolvedBackgroundColor) {
            indicator.style.backgroundColor = resolvedBackgroundColor;
            indicator.style.color = resolvedTextColor;
          } else {
            indicator.className +=
              ' df-tint-primary border border-dashed df-border-primary-soft';
          }
        }
      } else if (drag.calendarIds && drag.calendarIds.length > 1) {
        // Day/Week view — multi-calendar event: light diagonal pattern background
        const indicatorBgColors = getCalendarEventBgColors(
          { calendarIds: drag.calendarIds },
          app?.getCalendarRegistry()
        );
        indicator.style.background =
          buildDiagonalPatternBackground(indicatorBgColors);
        indicator.style.color = getEventTextColor(
          drag.calendarIds[0],
          app?.getCalendarRegistry()
        );
        isLightIndicator = true;
      } else if (color) {
        indicator.style.backgroundColor = getSelectedBgColor(
          color,
          app?.getCalendarRegistry()
        );
        indicator.style.color = '#fff';
      } else if (drag.calendarIds && drag.calendarIds.length > 0) {
        indicator.style.backgroundColor = getSelectedBgColor(
          drag.calendarIds[0],
          app?.getCalendarRegistry()
        );
        indicator.style.color = '#fff';
      } else {
        indicator.className +=
          ' df-tint-primary border border-dashed df-border-primary-soft';
      }

      dragIndicatorRef.current = indicator;
    },
    [
      removeDragIndicator,
      isDateGridView,
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
      getGridOffset,
    ]
  );

  // Update drag indicator
  const updateDragIndicator = useCallback(
    (...args: (number | boolean | EventLayout | null | undefined)[]) => {
      const indicator = dragIndicatorRef.current;
      if (!indicator) return;

      if (isDateGridView) {
        const [clientX, clientY] = args as [number, number];
        const width = Number.parseFloat(indicator.style.width) || 120;
        const height = Number.parseFloat(indicator.style.height) || 22;

        indicator.style.transform = `translate3d(${clientX - width / 2}px, ${clientY - height / 2}px, 0)`;
        indicator.style.transition = 'none';
      } else {
        const [dayIndex, startHour, endHour, isAllDay = false, layout] =
          args as [number, number, number, boolean?, EventLayout?];
        const currentDrag = dragPropsRef.current?.drag;

        // Ensure in correct container
        const targetContainer = isAllDay
          ? currentDrag?.indicatorContainer || allDayRowRef?.current
          : timeGridRef?.current ||
            calendarRef.current?.querySelector('.df-calendar-content');

        if (indicator.parentElement !== targetContainer) {
          targetContainer?.append(indicator);
        }

        const isInsideTimeGrid =
          !isAllDay && targetContainer === timeGridRef?.current;

        if (isAllDay) {
          const hasInitialAllDayGeometry =
            currentDrag?.initialIndicatorLeft !== undefined &&
            currentDrag?.initialIndicatorTop !== undefined &&
            currentDrag?.initialIndicatorWidth !== undefined &&
            currentDrag?.initialIndicatorHeight !== undefined;

          if (hasInitialAllDayGeometry) {
            indicator.style.top = `${currentDrag!.initialIndicatorTop}px`;
            indicator.style.width = `${currentDrag!.initialIndicatorWidth}px`;
            indicator.style.height = `${currentDrag!.initialIndicatorHeight}px`;

            if (isDayView) {
              indicator.style.left = `${currentDrag!.initialIndicatorLeft}px`;
            } else {
              const containerWidth =
                targetContainer?.getBoundingClientRect().width || 0;
              const daysToShow = options.displayDays || 7;
              const dayColumnWidth = containerWidth / daysToShow;
              const startDayIndex = currentDrag!.startDragDayIndex ?? dayIndex;
              const dayDelta = dayIndex - startDayIndex;
              indicator.style.left = `${currentDrag!.initialIndicatorLeft! + dayDelta * dayColumnWidth}px`;
            }
          } else if (isDayView) {
            indicator.style.top = '2px';
            indicator.style.left = `${TIME_COLUMN_WIDTH}px`;
            const gutterOffset = isMobile ? 0 : 11;
            indicator.style.width = `calc(100% - ${TIME_COLUMN_WIDTH}px - ${2 + gutterOffset}px)`;
            indicator.style.height = `${ALL_DAY_HEIGHT - 4}px`;
          } else {
            indicator.style.top = '2px';
            const totalWidth =
              options.gridWidth || (isMobile && !isDayView ? '175%' : '100%');
            const daysToShow = options.displayDays || 7;
            const dayColumnWidth = `calc(${totalWidth} / ${daysToShow})`;
            indicator.style.left = `calc(${dayColumnWidth} * ${dayIndex})`;
            indicator.style.width = `calc(${dayColumnWidth} - 2px)`;
            indicator.style.height = `${ALL_DAY_HEIGHT - 4}px`;
          }
          indicator.style.marginBottom = '3px';
          indicator.className = indicator.className.replace(
            'rounded-sm',
            'rounded-xl'
          );
        } else {
          const gridOffset = isInsideTimeGrid ? 0 : getGridOffset();
          const top = (startHour - FIRST_HOUR) * HOUR_HEIGHT;
          const height = (endHour - startHour) * HOUR_HEIGHT;
          indicator.style.top = isInsideTimeGrid
            ? `${top + 3}px`
            : `${top + 3 + gridOffset}px`;
          indicator.style.height = `${height - 4}px`;
          indicator.style.marginBottom = '0';
          indicator.className = indicator.className.replace(
            'rounded-xl',
            'rounded-sm'
          );

          const daysToShow = options.displayDays || 7;
          const totalWidth = isInsideTimeGrid
            ? '100%'
            : options.gridWidth || (isMobile && !isDayView ? '175%' : '100%');

          if (layout) {
            if (isDayView) {
              indicator.style.left = isInsideTimeGrid
                ? `${(layout.left / 100) * 100}%`
                : `calc(${TIME_COLUMN_WIDTH}px + ((100% - ${TIME_COLUMN_WIDTH}px) * ${layout.left / 100}))`;
              indicator.style.width = isInsideTimeGrid
                ? `${layout.width}%`
                : `calc(((100% - ${TIME_COLUMN_WIDTH}px) * ${layout.width / 100}) - 3px)`;
            } else {
              const dayWidth = `calc(${totalWidth} / ${daysToShow})`;
              indicator.style.left = `calc((${dayWidth} * ${dayIndex}) + (${dayWidth} * ${layout.left / 100}))`;
              indicator.style.width = `calc((${dayWidth} * ${(layout.width - 1) / 100}))`;
            }
            indicator.style.zIndex = String(layout.zIndex + 10);
          } else if (isDayView) {
            indicator.style.left = isInsideTimeGrid
              ? '0px'
              : `${TIME_COLUMN_WIDTH}px`;
            indicator.style.width = isInsideTimeGrid
              ? '100%'
              : `calc(100% - ${TIME_COLUMN_WIDTH}px - 3px)`;
          } else {
            const dayColumnWidth = `calc(${totalWidth} / ${daysToShow})`;
            indicator.style.left = `calc(${dayColumnWidth} * ${dayIndex})`;
            indicator.style.width = `calc(${dayColumnWidth} - 3px)`;
          }
        }

        indicator.style.cursor = 'grabbing';

        // Re-render React component to update drag data
        if (dragPropsRef.current) {
          const updatedDrag = {
            ...dragPropsRef.current.drag,
            dayIndex,
            startHour,
            endHour,
            allDay: isAllDay,
          };

          dragPropsRef.current.drag = updatedDrag;

          const currentColor = dragPropsRef.current.color;
          const rerenderDrag = dragPropsRef.current.drag;
          const currentIsLight =
            !!rerenderDrag.calendarIds && rerenderDrag.calendarIds.length > 1;

          render(
            h(
              LocaleProvider,
              { locale },
              h(DragIndicatorComponent, {
                drag: updatedDrag,
                color: currentColor,
                title: dragPropsRef.current.title,
                layout: layout || dragPropsRef.current.layout,
                allDay: isAllDay,
                formatTime: formatTime,
                getLineColor: getLineColor || (() => ''),
                getDynamicPadding: getDynamicPadding || (() => '0px'),
                renderer,
                isMobile,
                isLightBackground: currentIsLight,
              })
            ),
            indicator
          );
        }
      }
    },
    [
      isDateGridView,
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
      getGridOffset,
    ]
  );

  return {
    dragIndicatorRef,
    removeDragIndicator,
    createDragIndicator,
    updateDragIndicator,
  };
};
