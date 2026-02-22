import { Event } from '../types/event';
import { EventChange } from '../types/core';

/**
 * CalendarStore
 *
 * Responsible for:
 * - Managing state mutations (events)
 * - Handling transactions
 * - Dispatching change notifications
 * - Normalizing batched changes
 *
 * Note: Business logic (validation, overlaps, etc.) belongs in plugins, not here.
 */
export class CalendarStore {
  // In-memory storage
  private events = new Map<string, Event>();

  // Transaction state
  private isInTransaction = false;
  private pendingChanges: EventChange[] = [];

  // Callbacks
  public onEventChange?: (change: EventChange) => void | Promise<void>;
  public onEventBatchChange?: (changes: EventChange[]) => void | Promise<void>;

  constructor(initialEvents: Event[] = []) {
    initialEvents.forEach(e => this.events.set(e.id, e));
  }

  // Transaction Management

  public beginTransaction(): void {
    if (this.isInTransaction) {
      console.warn(
        'Transaction already in progress. Nested transactions are not supported.'
      );
      return;
    }
    this.isInTransaction = true;
    this.pendingChanges = [];
  }

  public endTransaction(): void {
    if (!this.isInTransaction) return;

    // Normalize changes: merge updates, handle create+delete pairs, etc.
    const normalizedChanges = CalendarStore.normalizeChanges(
      this.pendingChanges
    );

    // Reset transaction state
    this.isInTransaction = false;
    this.pendingChanges = [];

    // Dispatch batch update if there are effective changes
    if (normalizedChanges.length > 0) {
      this.onEventBatchChange?.(normalizedChanges);
    }
  }

  // CRUD Operations

  public createEvent(event: Event): void {
    if (this.events.has(event.id)) {
      throw new Error(`Event with ID ${event.id} already exists.`);
    }

    this.events.set(event.id, event);
    this.emitChange({ type: 'create', event });
  }

  public updateEvent(id: string, updates: Partial<Event>): void {
    const existingEvent = this.events.get(id);
    if (!existingEvent) {
      throw new Error(`Event with id ${id} not found`);
    }

    const updatedEvent = { ...existingEvent, ...updates };
    this.events.set(id, updatedEvent);
    this.emitChange({
      type: 'update',
      before: existingEvent,
      after: updatedEvent,
    });
  }

  public deleteEvent(id: string): void {
    const event = this.events.get(id);
    if (!event) {
      return;
    }

    this.events.delete(id);
    this.emitChange({ type: 'delete', event });
  }

  // Read Operations

  public getEvent(id: string): Event | undefined {
    return this.events.get(id);
  }

  public getAllEvents(): Event[] {
    return Array.from(this.events.values());
  }

  // Internal Logic

  private emitChange(change: EventChange): void {
    if (this.isInTransaction) {
      this.pendingChanges.push(change);
    } else {
      this.onEventChange?.(change);
    }
  }

  /**
   * Pure function to normalize a list of changes.
   * Merges multiple changes for the same ID into a single effective change.
   */
  private static normalizeChanges(changes: EventChange[]): EventChange[] {
    // Map to track the net effect for each event ID
    const changeMap = new Map<string, EventChange>();

    for (const change of changes) {
      const id =
        change.type === 'delete'
          ? change.event.id
          : change.type === 'update'
            ? change.after.id
            : change.event.id;

      const prev = changeMap.get(id);

      if (!prev) {
        changeMap.set(id, change);
        continue;
      }

      // Merge logic based on the type of the previous change
      if (prev.type === 'create') {
        // PREV: Create(A)
        if (change.type === 'update') {
          // + CURR: Update(A->B)
          // = Create(B)
          changeMap.set(id, { type: 'create', event: change.after });
        } else if (change.type === 'delete') {
          // + CURR: Delete(A)
          // = Cancel out
          changeMap.delete(id);
        }
      } else if (prev.type === 'update') {
        // PREV: Update(A->B)
        if (change.type === 'update') {
          // + CURR: Update(B->C)
          // = Update(A->C)
          changeMap.set(id, {
            type: 'update',
            before: prev.before,
            after: change.after,
          });
        } else if (change.type === 'delete') {
          // + CURR: Delete(B)
          // = Delete(A)  (The original state A is now gone)
          changeMap.set(id, { type: 'delete', event: prev.before });
        }
      } else if (prev.type === 'delete') {
        // PREV: Delete(A)
        if (change.type === 'create') {
          // + CURR: Create(B) (where B.id === A.id)
          // = Update(A->B)
          changeMap.set(id, {
            type: 'update',
            before: prev.event,
            after: change.event,
          });
        }
      }
    }

    return Array.from(changeMap.values());
  }
}
