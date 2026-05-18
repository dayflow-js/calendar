import { CalendarRegistry } from '@/core/calendarRegistry';
import { CalendarStore } from '@/core/CalendarStore';
import {
  CalendarAppState,
  CalendarCallbacks,
  Event,
  EventChange,
  EventMutationSource,
  RawEventChange,
} from '@/types';
import { logger } from '@/utils/logger';

export class EventManager {
  private store: CalendarStore;
  private undoStack: Array<{ type: string; data: unknown }> = [];
  private pendingSnapshot: Event[] | null = null;
  private pendingChangeSource: EventMutationSource | null = null;
  private externalEvents: Map<string, Event[]> = new Map();
  private readonly MAX_UNDO_STACK = 50;
  private eventChangeListeners: Set<(changes: EventChange[]) => void> =
    new Set();
  private cachedFilteredEventsSource: Event[] | null = null;
  private cachedFilteredVisibilityKey: string = '';
  private cachedFilteredEvents: Event[] = [];

  constructor(
    private state: CalendarAppState,
    private registry: CalendarRegistry,
    private getCallbacks: () => CalendarCallbacks,
    private notify: () => void,
    private triggerRender: () => void,
    initialEvents: Event[]
  ) {
    const normalizedInitialEvents = initialEvents.map(event =>
      this.normalizeEvent(event)
    );
    this.state.events = normalizedInitialEvents;
    this.store = new CalendarStore(normalizedInitialEvents);
    this.setupStoreListeners();
  }

  subscribeEventChanges(
    listener: (changes: EventChange[]) => void
  ): () => void {
    this.eventChangeListeners.add(listener);
    return () => this.eventChangeListeners.delete(listener);
  }

  private notifyEventChangeListeners(changes: EventChange[]): void {
    this.eventChangeListeners.forEach(listener => listener(changes));
  }

  private static stampChanges(
    changes: RawEventChange[],
    source: EventMutationSource
  ): EventChange[] {
    return changes.map(change => ({ ...change, source }) as EventChange);
  }

  private normalizeEvent(event: Event): Event {
    if (event.calendarId || (event.calendarIds?.length ?? 0) > 0) {
      return event;
    }

    const fallbackCalendarId = this.registry.getDefaultCalendar()?.id;
    if (!fallbackCalendarId) {
      return event;
    }

    return {
      ...event,
      calendarId: fallbackCalendarId,
    };
  }

  private normalizeEventUpdate(
    existingEvent: Event,
    updates: Partial<Event>
  ): Partial<Event> {
    return this.normalizeEvent({
      ...existingEvent,
      ...updates,
    });
  }

  private setupStoreListeners(): void {
    this.store.onEventChange = change => {
      this.syncExternalEventsToState();

      const source: EventMutationSource = this.pendingChangeSource ?? 'local';
      const [stampedChange] = EventManager.stampChanges([change], source);
      this.notifyEventChangeListeners([stampedChange]);

      let callbackPromise = null;
      if (source === 'remote') {
        callbackPromise = null;
      } else if (change.type === 'create') {
        callbackPromise = this.getCallbacks().onEventCreate?.(change.event);
      } else if (change.type === 'update') {
        callbackPromise = this.getCallbacks().onEventUpdate?.(change.after);
      }
      this.pendingChangeSource = null;

      this.triggerRender();
      this.notify();
      return callbackPromise ?? undefined;
    };

    this.store.onEventBatchChange = _changes => {
      this.syncExternalEventsToState();

      const source: EventMutationSource = this.pendingChangeSource ?? 'local';
      const stampedChanges = EventManager.stampChanges(_changes, source);
      this.notifyEventChangeListeners(stampedChanges);

      let callbackPromise = null;
      if (source !== 'drag' && source !== 'resize' && source !== 'remote') {
        callbackPromise =
          this.getCallbacks().onEventBatchChange?.(stampedChanges);
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
    source?: EventMutationSource
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
            newEvents[index] = this.normalizeEvent({
              ...newEvents[index],
              ...updates,
            });
          }
        });
      }
      if (changes.add) {
        newEvents = [
          ...newEvents,
          ...changes.add.map(event => this.normalizeEvent(event)),
        ];
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
          const existingEvent = this.store.getEvent(id);
          if (!existingEvent) {
            throw new Error(`Event with id ${id} not found`);
          }
          this.store.updateEvent(
            id,
            this.normalizeEventUpdate(existingEvent, updates)
          );
        } catch (e) {
          logger.warn(`Failed to update event ${id}:`, e);
        }
      });
    }
    if (changes.add) {
      changes.add.forEach(event => {
        try {
          this.store.createEvent(this.normalizeEvent(event));
        } catch (e) {
          logger.warn(`Failed to create event ${event.id}:`, e);
        }
      });
    }

    this.store.endTransaction();
    if (source && this.pendingChangeSource === source) {
      this.pendingChangeSource = null;
    }
  }

  addEvent(event: Event): void {
    this.pendingSnapshot = null;
    this.pushToUndo();
    this.store.createEvent(this.normalizeEvent(event));
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
    source?: EventMutationSource
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

      const updatedEvent = this.normalizeEvent({
        ...this.state.events[eventIndex],
        ...eventUpdate,
      });
      this.state.events = [
        ...this.state.events.slice(0, eventIndex),
        updatedEvent,
        ...this.state.events.slice(eventIndex + 1),
      ];
      this.notify();
      return;
    }

    try {
      const existingEvent = this.store.getEvent(id);
      if (!existingEvent) {
        throw new Error(`Event with id ${id} not found`);
      }

      await this.store.updateEvent(
        id,
        this.normalizeEventUpdate(existingEvent, eventUpdate)
      );
    } finally {
      if (source && this.pendingChangeSource === source) {
        this.pendingChangeSource = null;
      }
    }
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
    const calendars = this.registry.getAll();

    let visibilityKey = '';
    for (let i = 0; i < calendars.length; i++) {
      const cal = calendars[i];
      if (cal.isVisible !== false) {
        visibilityKey += cal.id + '|';
      }
    }

    if (
      this.cachedFilteredEventsSource === allEvents &&
      this.cachedFilteredVisibilityKey === visibilityKey
    ) {
      return this.cachedFilteredEvents;
    }

    const visibleCalendars = new Set<string>();
    for (let i = 0; i < calendars.length; i++) {
      const cal = calendars[i];
      if (cal.isVisible !== false) visibleCalendars.add(cal.id);
    }

    const filtered = allEvents.filter(event => {
      const ids =
        event.calendarIds ?? (event.calendarId ? [event.calendarId] : []);
      if (ids.length === 0) return false;
      return ids.some(id => visibleCalendars.has(id));
    });

    this.cachedFilteredEventsSource = allEvents;
    this.cachedFilteredVisibilityKey = visibilityKey;
    this.cachedFilteredEvents = filtered;
    return filtered;
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

  onMobileEventDetailToggle(event: Event | null): void {
    this.getCallbacks().onMobileEventDetailToggle?.(event);
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
