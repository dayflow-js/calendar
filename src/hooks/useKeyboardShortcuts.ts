import { useEffect } from 'react';
import { CalendarApp } from '@/types';
import { clipboardStore } from '@/utils/clipboardStore';
import { generateUniKey, temporalToDate, dateToZonedDateTime, dateToPlainDate, getWeekRange, extractHourFromDate } from '@/utils';
import { Event, ViewType } from '@/types';
import { Temporal } from 'temporal-polyfill';

interface UseKeyboardShortcutsProps {
  app: CalendarApp;
  selectedEventId: string | null;
  setSelectedEventId: (id: string | null) => void;
  detailPanelEventId: string | null;
  setDetailPanelEventId: (id: string | null) => void;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
}

export const useKeyboardShortcuts = ({
  app,
  selectedEventId,
  setSelectedEventId,
  detailPanelEventId,
  setDetailPanelEventId,
  isDrawerOpen,
  setIsDrawerOpen,
}: UseKeyboardShortcutsProps) => {
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isTyping = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || (activeElement as HTMLElement).isContentEditable);

      // 1. Search (Cmd/Ctrl + F)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        const searchInput = document.getElementById('dayflow-search-input');
        if (searchInput) {
          searchInput.focus();
        }
        return;
      }

      // 2. Today (Cmd/Ctrl + T)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 't') {
        e.preventDefault();
        app.goToToday();
        return;
      }

      // 3. Quick Create (Cmd/Ctrl + N)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        const addBtn = document.getElementById('dayflow-add-event-btn');
        if (addBtn) {
          addBtn.click();
        }
        return;
      }

      // 4. Dismiss (Esc)
      if (e.key === 'Escape') {
        if (detailPanelEventId) {
          setDetailPanelEventId(null);
        }
        if (isDrawerOpen) {
          setIsDrawerOpen(false);
        }
        return;
      }

      // Navigation (Left/Right) - only if not typing
      if (!isTyping) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          app.goToPrevious();
          return;
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          app.goToNext();
          return;
        }
      }

      // 5. Tab Navigation
      if (e.key === 'Tab') {
        e.preventDefault();
        handleTabNavigation(e.shiftKey);
        return;
      }

      // 6. Clipboard Operations (Cmd/Ctrl + C/X/V)
      if (e.metaKey || e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case 'c': // Copy
            if (selectedEventId) {
              const event = app.getEvents().find(e => e.id === selectedEventId);
              if (event) {
                try {
                  await navigator.clipboard.writeText(JSON.stringify(event, null, 2));
                  clipboardStore.setEvent(event);
                } catch (err) {
                  console.error('Failed to copy event', err);
                }
              }
            }
            break;
          case 'x': // Cut
            if (selectedEventId) {
              const event = app.getEvents().find(e => e.id === selectedEventId);
              if (event) {
                try {
                  await navigator.clipboard.writeText(JSON.stringify(event, null, 2));
                  clipboardStore.setEvent(event);
                  app.deleteEvent(event.id);
                  setSelectedEventId(null);
                  setDetailPanelEventId(null);
                } catch (err) {
                  console.error('Failed to cut event', err);
                }
              }
            }
            break;
          case 'v': // Paste
            handlePaste();
            break;
        }
      }
      
      // 7. Delete (Backspace/Delete)
      if (e.key === 'Backspace' || e.key === 'Delete') {
         // Only delete if not editing text
         if (isTyping) {
           return;
         }
         
         if (selectedEventId) {
            app.deleteEvent(selectedEventId);
            setSelectedEventId(null);
            setDetailPanelEventId(null);
         }
      }
    };

    const handlePaste = async () => {
      try {
        let eventData = clipboardStore.getEvent();
        if (!eventData) {
          const text = await navigator.clipboard.readText();
          if (text) {
             try {
                eventData = JSON.parse(text);
             } catch (e) {
                // Not JSON or invalid
             }
          }
        }

        if (eventData && typeof eventData === 'object' && eventData.title) {
           const originalStart = temporalToDate(eventData.start as any);
           const originalEnd = temporalToDate(eventData.end as any);
           const duration = originalEnd.getTime() - originalStart.getTime();

           // For global paste, paste at current time or start of view
           let targetStart = new Date();
           
           const currentViewDate = app.getCurrentDate();
           targetStart = new Date(currentViewDate);
           
           // Preserve original time
           targetStart.setHours(
             originalStart.getHours(),
             originalStart.getMinutes(),
             originalStart.getSeconds()
           );

           const targetEnd = new Date(targetStart.getTime() + (duration > 0 ? duration : 3600000));
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
             calendarId: eventData.calendarId && app.getCalendarRegistry().has(eventData.calendarId)
               ? eventData.calendarId
               : app.getCalendarRegistry().getDefaultCalendarId() || 'default',
           };

           app.addEvent(newEvent);
           // Select the new event
           setSelectedEventId(newEvent.id);
           app.highlightEvent(newEvent.id);
        }
      } catch (err) {
        console.error('Failed to paste', err);
      }
    };

    const handleTabNavigation = (reverse: boolean) => {
      const events = app.getEvents();
      const currentView = app.state.currentView;
      const currentDate = app.getCurrentDate();

      let visibleEvents: Event[] = [];

      // Filter events based on view
      if (currentView === ViewType.DAY) {
        visibleEvents = events.filter(e => {
          const s = temporalToDate(e.start);
          return s.toDateString() === currentDate.toDateString();
        });
      } else if (currentView === ViewType.WEEK) {
        const { monday: start, sunday: end } = getWeekRange(currentDate); 
        visibleEvents = events.filter(e => {
           const s = temporalToDate(e.start);
           return s >= start && s <= end;
        });
      } else if (currentView === ViewType.MONTH) {
        const visibleMonth = app.getVisibleMonth();
        const start = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
        const end = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0);
        visibleEvents = events.filter(e => {
           const s = temporalToDate(e.start);
           return s >= start && s <= end;
        });
      } else if (currentView === ViewType.YEAR) {
         const year = currentDate.getFullYear();
         visibleEvents = events.filter(e => {
            return temporalToDate(e.start).getFullYear() === year;
         });
      }

      // Sort events chronologically
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
      if (selectedEventId) {
        const currentIndex = visibleEvents.findIndex(e => e.id === selectedEventId);
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
        setSelectedEventId(nextEvent.id);
        app.highlightEvent(nextEvent.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [app, selectedEventId, detailPanelEventId, isDrawerOpen]);
};