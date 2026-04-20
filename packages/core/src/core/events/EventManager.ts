import { CalendarRegistry } from '@/core/calendarRegistry';
import { CalendarStore } from '@/core/CalendarStore';
import {
  CalendarAppState,
  CalendarCallbacks,
  Event,
  EventChange,
} from '@/types';
import { logger } from '@/utils/logger';

export class EventManager {
  private store: CalendarStore;
  private undoStack: Array<{ type: string; data: unknown }> = [];
  private pendingSnapshot: Event[] | null = null;
  private pendingChangeSource: 'drag' | 'resize' | null = null;
  private externalEvents: Map<string, Event[]> = new Map();
  private readonly MAX_UNDO_STACK = 50;

  constructor(
    private state: CalendarAppState,
    private registry: CalendarRegistry,
    private getCallbacks: () => CalendarCallbacks,
    private notify: () => void,
    private triggerRender: () => void,
    initialEvents: Event[]
  ) {
    this.store = new CalendarStore(initialEvents);
    this.setupStoreListeners();
  }

  private setupStoreListeners(): void {
    this.store.onEventChange = (change: EventChange) => {
      this.syncExternalEventsToState();

      let callbackPromise = null;
      if (change.type === 'create') {
        callbackPromise = this.getCallbacks().onEventCreate?.(change.event);
      } else if (change.type === 'update') {
        callbackPromise = this.getCallbacks().onEventUpdate?.(change.after);
      }

      this.triggerRender();
      this.notify();
      return callbackPromise ?? undefined;
    };

    this.store.onEventBatchChange = (_changes: EventChange[]) => {
      this.syncExternalEventsToState();

      let callbackPromise = null;
      if (
        this.pendingChangeSource !== 'drag' &&
        this.pendingChangeSource !== 'resize'
      ) {
        callbackPromise = this.getCallbacks().onEventBatchChange?.(_changes);
      }
      this.pendingChangeSource = null;

      this.triggerRender();
      this.notify();
      return callbackPromise ?? undefined;
    };
  }

  /** Expose the store for operations that need direct store access (e.g. mergeCalendars). */
  getStore(): CalendarStore {
    return this.store;
  }

  pushToUndo(eventsSnapshot?: Event[]): void {
    this.undoStack.push({
      type: 'events_snapshot',
      data: eventsSnapshot || [...this.state.events],
    });
    if (this.undoStack.length > this.MAX_UNDO_STACK) {
      this.undoStack.shift();
    }
  }

  undo(): void {
    if (this.undoStack.length === 0) return;

    const lastState = this.undoStack.pop();
    if (lastState?.type === 'events_snapshot') {
      this.state.events = lastState.data as Event[];
      this.store = new CalendarStore(this.state.events);
      this.setupStoreListeners();
      this.triggerRender();
      this.notify();
    }
  }

  applyEventsChanges(
    changes: {
      add?: Event[];
      update?: Array<{ id: string; updates: Partial<Event> }>;
      delete?: string[];
    },
    isPending?: boolean,
    source?: 'drag' | 'resize'
  ): void {
    if (isPending) {
      if (!this.pendingSnapshot) {
        this.pendingSnapshot = [...this.state.events];
      }
    } else if (this.pendingSnapshot) {
      this.pushToUndo(this.pendingSnapshot);
      this.pendingSnapshot = null;
    } else {
      this.pushToUndo();
    }

    if (isPending) {
      let newEvents = [...this.state.events];

      if (changes.delete) {
        const deleteIds = new Set(changes.delete);
        newEvents = newEvents.filter(e => !deleteIds.has(e.id));
      }
      if (changes.update) {
        changes.update.forEach(({ id, updates }) => {
          const index = newEvents.findIndex(e => e.id === id);
          if (index !== -1) {
            newEvents[index] = { ...newEvents[index], ...updates };
          }
        });
      }
      if (changes.add) {
        newEvents = [...newEvents, ...changes.add];
      }

      this.state.events = newEvents;
      this.notify();
      return;
    }

    if (source) {
      this.pendingChangeSource = source;
    }
    this.store.beginTransaction();

    if (changes.delete) {
      changes.delete.forEach(id => this.store.deleteEvent(id));
    }
    if (changes.update) {
      changes.update.forEach(({ id, updates }) => {
        try {
          this.store.updateEvent(id, updates);
        } catch (e) {
          logger.warn(`Failed to update event ${id}:`, e);
        }
      });
    }
    if (changes.add) {
      changes.add.forEach(event => {
        try {
          this.store.createEvent(event);
        } catch (e) {
          logger.warn(`Failed to create event ${event.id}:`, e);
        }
      });
    }

    this.store.endTransaction();
  }

  addEvent(event: Event): void {
    this.pendingSnapshot = null;
    this.pushToUndo();
    this.store.createEvent(event);
  }

  addExternalEvents(calendarId: string, events: Event[]): void {
    const eventsWithCalendarId = events.map(event => ({
      ...event,
      calendarId,
    }));
    this.externalEvents.set(calendarId, eventsWithCalendarId);
    this.syncExternalEventsToState();
    this.notify();
  }

  private syncExternalEventsToState(): void {
    const coreEvents = this.store.getAllEvents();
    const eventsById = new Map<string, Event>();

    coreEvents.forEach(event => eventsById.set(event.id, event));

    if (this.externalEvents.size > 0) {
      for (const events of this.externalEvents.values()) {
        events.forEach(event => eventsById.set(event.id, event));
      }
    }

    this.state.events = Array.from(eventsById.values());
  }

  async updateEvent(
    id: string,
    eventUpdate: Partial<Event>,
    isPending?: boolean,
    source?: 'drag' | 'resize'
  ): Promise<void> {
    if (source) {
      this.pendingChangeSource = source;
    }

    if (isPending) {
      if (!this.pendingSnapshot) {
        this.pendingSnapshot = [...this.state.events];
      }
    } else if (this.pendingSnapshot) {
      this.pushToUndo(this.pendingSnapshot);
      this.pendingSnapshot = null;
    } else {
      this.pushToUndo();
    }

    if (isPending) {
      const eventIndex = this.state.events.findIndex(e => e.id === id);
      if (eventIndex === -1) throw new Error(`Event with id ${id} not found`);

      const updatedEvent = { ...this.state.events[eventIndex], ...eventUpdate };
      this.state.events = [
        ...this.state.events.slice(0, eventIndex),
        updatedEvent,
        ...this.state.events.slice(eventIndex + 1),
      ];
      this.notify();
      return;
    }

    await this.store.updateEvent(id, eventUpdate);
  }

  async deleteEvent(id: string): Promise<void> {
    await this.getCallbacks().onEventDelete?.(id);
    this.pendingSnapshot = null;
    this.pushToUndo();
    await this.store.deleteEvent(id);
  }

  getAllEvents(): Event[] {
    return [...this.state.events];
  }

  getEvents(): Event[] {
    const allEvents = this.state.events || [];
    const visibleCalendars = new Set(
      this.registry
        .getAll()
        .filter(calendar => calendar.isVisible !== false)
        .map(calendar => calendar.id)
    );
    return allEvents.filter(event => {
      const ids =
        event.calendarIds ?? (event.calendarId ? [event.calendarId] : []);
      if (ids.length === 0) return false;
      return ids.some(id => visibleCalendars.has(id));
    });
  }

  onEventClick(event: Event): void {
    this.getCallbacks().onEventClick?.(event);
  }

  onEventDoubleClick(
    event: Event,
    e: MouseEvent
  ): boolean | undefined | Promise<boolean | undefined> {
    return this.getCallbacks().onEventDoubleClick?.(event, e);
  }

  onMoreEventsClick(date: Date): void {
    this.getCallbacks().onMoreEventsClick?.(date);
  }

  onEventDetailToggle(eventId: string | null): void {
    this.getCallbacks().onEventDetailToggle?.(eventId);
    this.notify();
  }

  highlightEvent(eventId: string | null): void {
    if (this.state.highlightedEventId === eventId) return;
    this.state.highlightedEventId = eventId;
    this.getCallbacks().onRender?.();
    this.notify();
  }

  selectEvent(eventId: string | null): void {
    if (this.state.selectedEventId === eventId) return;
    this.state.selectedEventId = eventId;
    this.getCallbacks().onRender?.();
    this.notify();
  }

  dismissUI(): void {
    this.getCallbacks().onDismissUI?.();
    this.notify();
  }
}
