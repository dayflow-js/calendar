import {
  CalendarPlugin,
  ICalendarApp,
  Event,
  ViewType,
  clipboardStore,
  generateUniKey,
  temporalToDate,
  dateToZonedDateTime,
  dateToPlainDate,
  getWeekRange,
} from '@dayflow/core';
import { Temporal } from 'temporal-polyfill';

export interface KeyboardShortcutsConfig {
  /**
   * Whether to enable default shortcuts
   * @default true
   */
  enabled?: boolean;
  /**
   * Custom key mappings
   */
  keyMap?: {
    today?: string;
    search?: string;
    prev?: string;
    next?: string;
    undo?: string;
    copy?: string;
    cut?: string;
    paste?: string;
    delete?: string;
    newEvent?: string;
  };
}

export function createKeyboardShortcutsPlugin(
  config: KeyboardShortcutsConfig = {}
): CalendarPlugin {
  const { enabled = true, keyMap = {} } = config;

  return {
    name: 'keyboard-shortcuts',
    install(app: ICalendarApp) {
      if (!enabled) return;

      const handleKeyDown = async (e: KeyboardEvent) => {
        const activeElement = document.activeElement;
        const isTyping =
          activeElement &&
          (activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            (activeElement as HTMLElement).isContentEditable);

        // 1. Search (Cmd/Ctrl + F)
        const searchKey = keyMap.search || 'f';
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === searchKey) {
          e.preventDefault();
          const searchInput = document.getElementById('dayflow-search-input');
          if (searchInput) {
            searchInput.focus();
          }
          return;
        }

        // 2. Today (Cmd/Ctrl + T)
        const todayKey = keyMap.today || 't';
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === todayKey) {
          e.preventDefault();
          app.goToToday();
          return;
        }

        // 3. Quick Create (Cmd/Ctrl + N)
        const newEventKey = keyMap.newEvent || 'n';
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === newEventKey) {
          e.preventDefault();
          const addBtn = document.getElementById('dayflow-add-event-btn');
          if (addBtn) {
            addBtn.click();
          }
          return;
        }

        // 4. Dismiss (Esc)
        if (e.key === 'Escape') {
          app.dismissUI();
          return;
        }

        // Navigation (Left/Right) - only if not typing
        if (!isTyping) {
          const prevKey = keyMap.prev || 'ArrowLeft';
          const nextKey = keyMap.next || 'ArrowRight';

          if (e.key === prevKey) {
            e.preventDefault();
            app.goToPrevious();
            return;
          }
          if (e.key === nextKey) {
            e.preventDefault();
            app.goToNext();
            return;
          }
        }

        // 5. Tab Navigation
        if (e.key === 'Tab') {
          e.preventDefault();
          handleTabNavigation(app, e.shiftKey);
          return;
        }

        // 6. Clipboard & Undo Operations (Cmd/Ctrl + C/X/V/Z)
        if ((e.metaKey || e.ctrlKey) && !isTyping) {
          const undoKey = keyMap.undo || 'z';
          const copyKey = keyMap.copy || 'c';
          const cutKey = keyMap.cut || 'x';
          const pasteKey = keyMap.paste || 'v';

          switch (e.key.toLowerCase()) {
            case undoKey:
              e.preventDefault();
              app.undo();
              break;
            case copyKey:
              const selectedIdC = app.state.selectedEventId;
              if (selectedIdC) {
                const event = app.getEvents().find(ev => ev.id === selectedIdC);
                if (event) {
                  try {
                    await navigator.clipboard.writeText(
                      JSON.stringify(event, null, 2)
                    );
                    clipboardStore.setEvent(event);
                  } catch (err) {
                    console.error('Failed to copy event', err);
                  }
                }
              }
              break;
            case cutKey:
              const selectedIdX = app.state.selectedEventId;
              if (selectedIdX) {
                const event = app.getEvents().find(ev => ev.id === selectedIdX);
                if (event) {
                  try {
                    await navigator.clipboard.writeText(
                      JSON.stringify(event, null, 2)
                    );
                    clipboardStore.setEvent(event);
                    app.deleteEvent(event.id);
                    app.selectEvent(null);
                  } catch (err) {
                    console.error('Failed to cut event', err);
                  }
                }
              }
              break;
            case pasteKey:
              handlePaste(app);
              break;
          }
        }

        // 7. Delete (Backspace/Delete)
        const deleteKey = keyMap.delete || 'Delete';
        if (e.key === 'Backspace' || e.key === deleteKey) {
          if (isTyping) return;

          const selectedIdD = app.state.selectedEventId;
          if (selectedIdD) {
            app.deleteEvent(selectedIdD);
            app.selectEvent(null);
          }
        }
      };
      if (typeof window !== 'undefined') {
        window.addEventListener('keydown', handleKeyDown);
      }

      // Cleanup is tricky for plugins as there's no uninstall yet in DayFlow core,
      // but we can store it or just let it live with the app instance.
    },
  };
}

async function handlePaste(app: ICalendarApp) {
  try {
    let eventData = clipboardStore.getEvent();
    if (!eventData) {
      const text = await navigator.clipboard.readText();
      if (text) {
        try {
          eventData = JSON.parse(text);
        } catch (e) {}
      }
    }

    if (
      eventData &&
      typeof eventData === 'object' &&
      (eventData as any).title
    ) {
      const originalStart = temporalToDate(eventData.start as any);
      const originalEnd = temporalToDate(eventData.end as any);
      const duration = originalEnd.getTime() - originalStart.getTime();

      let targetStart = new Date();
      const selectedId = app.state.selectedEventId;

      if (selectedId) {
        const selectedEvent = app.getEvents().find(e => e.id === selectedId);
        if (selectedEvent) {
          targetStart = temporalToDate(selectedEvent.start);
        } else {
          targetStart = new Date(app.getCurrentDate());
        }
      } else {
        targetStart = new Date(app.getCurrentDate());
      }

      targetStart.setHours(
        originalStart.getHours(),
        originalStart.getMinutes(),
        originalStart.getSeconds(),
        0
      );

      const targetEnd = new Date(
        targetStart.getTime() + (duration > 0 ? duration : 3600000)
      );
      const { _segmentInfo, ...cleanEventData } = eventData as any;

      const newEvent: Event = {
        ...cleanEventData,
        id: generateUniKey(),
        start: eventData.allDay
          ? dateToPlainDate(targetStart)
          : dateToZonedDateTime(targetStart, Temporal.Now.timeZoneId()),
        end: eventData.allDay
          ? dateToPlainDate(targetEnd)
          : dateToZonedDateTime(targetEnd, Temporal.Now.timeZoneId()),
        calendarId:
          eventData.calendarId &&
          app.getCalendarRegistry().has(eventData.calendarId)
            ? eventData.calendarId
            : app.getCalendarRegistry().getDefaultCalendarId() || 'default',
      };

      app.addEvent(newEvent);
      app.selectEvent(newEvent.id);
      app.highlightEvent(newEvent.id);
    }
  } catch (err) {
    console.error('Failed to paste', err);
  }
}

function handleTabNavigation(app: ICalendarApp, reverse: boolean) {
  const events = app.getEvents();
  const currentView = app.state.currentView;
  const currentDate = app.getCurrentDate();

  let visibleEvents: Event[] = [];

  switch (currentView) {
    case ViewType.DAY: {
      visibleEvents = events.filter(e => {
        const s = temporalToDate(e.start);
        return s.toDateString() === currentDate.toDateString();
      });
      break;
    }
    case ViewType.WEEK: {
      const { monday: start, sunday: end } = getWeekRange(currentDate);
      visibleEvents = events.filter(e => {
        const s = temporalToDate(e.start);
        return s >= start && s <= end;
      });
      break;
    }
    case ViewType.MONTH: {
      const visibleMonth = app.getVisibleMonth();
      const start = new Date(
        visibleMonth.getFullYear(),
        visibleMonth.getMonth(),
        1
      );
      const end = new Date(
        visibleMonth.getFullYear(),
        visibleMonth.getMonth() + 1,
        0
      );
      visibleEvents = events.filter(e => {
        const s = temporalToDate(e.start);
        return s >= start && s <= end;
      });
      break;
    }
    case ViewType.YEAR: {
      const year = currentDate.getFullYear();
      const yearConfig = app.getViewConfig(ViewType.YEAR);
      const showTimedEvents =
        (yearConfig as any).showTimedEventsInYearView ?? false;
      visibleEvents = events.filter(e => {
        if (!showTimedEvents && !e.allDay) return false;
        return temporalToDate(e.start).getFullYear() === year;
      });
      break;
    }
  }

  visibleEvents.sort((a, b) => {
    const dateA = temporalToDate(a.start);
    const dateB = temporalToDate(b.start);
    const timeDiff = dateA.getTime() - dateB.getTime();
    if (timeDiff !== 0) return timeDiff;
    if (a.allDay && !b.allDay) return -1;
    if (!a.allDay && b.allDay) return 1;
    return 0;
  });

  if (visibleEvents.length === 0) return;

  let nextIndex = 0;
  const selectedId = app.state.selectedEventId;
  if (selectedId) {
    const currentIndex = visibleEvents.findIndex(e => e.id === selectedId);
    if (currentIndex !== -1) {
      if (reverse) {
        nextIndex = currentIndex - 1;
        if (nextIndex < 0) nextIndex = visibleEvents.length - 1;
      } else {
        nextIndex = currentIndex + 1;
        if (nextIndex >= visibleEvents.length) nextIndex = 0;
      }
    }
  }

  const nextEvent = visibleEvents[nextIndex];
  if (nextEvent) {
    app.selectEvent(nextEvent.id);
    app.highlightEvent(nextEvent.id);
  }
}
