import { Temporal } from 'temporal-polyfill';

import { CalendarApp } from '@/core/CalendarApp';
import { createDayView } from '@/factories/createDayView';
import { createMonthView } from '@/factories/createMonthView';
import { createWeekView } from '@/factories/createWeekView';
import { EventChange, EventMutationSource, ViewType } from '@/types';

function makeEvent(id: string) {
  return {
    id,
    title: `Event ${id}`,
    start: Temporal.Now.plainDateISO(),
    end: Temporal.Now.plainDateISO(),
  };
}

function makeApp() {
  return new CalendarApp({
    views: [createWeekView(), createDayView(), createMonthView()],
    plugins: [],
    events: [],
    defaultView: ViewType.WEEK,
  });
}

function getChangeId(change: EventChange): string {
  if (change.type === 'delete') return change.event.id;
  if (change.type === 'update') return change.after.id;
  return change.event.id;
}

function createWriteBackTracker(
  writeBackIds: string[]
): (changes: EventChange[]) => void {
  return (changes: EventChange[]) => {
    for (const change of changes) {
      if (change.source !== 'remote') {
        writeBackIds.push(getChangeId(change));
      }
    }
  };
}

// ─── Visible Range Subscriptions ────────────────────────────────────────────

describe('subscribeVisibleRangeChange', () => {
  it('does not replay the initial visible range to late subscribers', () => {
    const listener = jest.fn();
    const app = new CalendarApp({
      views: [createWeekView()],
      plugins: [],
      events: [],
      defaultView: ViewType.WEEK,
      callbacks: {
        onVisibleRangeChange: () => {
          // baseline: old callback still works
        },
      },
    });

    // Subscribe after construction — listener is not called retroactively
    app.subscribeVisibleRangeChange(listener);
    expect(listener).not.toHaveBeenCalled();
  });

  it('fires when navigating forward', () => {
    const app = makeApp();
    const listener = jest.fn();
    app.subscribeVisibleRangeChange(listener);

    app.goToNext();

    expect(listener).toHaveBeenCalledTimes(1);
    const payload = listener.mock.calls[0][0];
    expect(payload).toMatchObject({
      reason: 'navigation',
      view: ViewType.WEEK,
    });
    expect(payload.start).toBeInstanceOf(Date);
    expect(payload.end).toBeInstanceOf(Date);
    expect(payload.end.getTime()).toBeGreaterThan(payload.start.getTime());
  });

  it('fires when navigating backward', () => {
    const app = makeApp();
    const listener = jest.fn();
    app.subscribeVisibleRangeChange(listener);

    app.goToPrevious();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].reason).toBe('navigation');
  });

  it('fires when changing view and includes the new view type', () => {
    const app = makeApp();
    const listener = jest.fn();
    app.subscribeVisibleRangeChange(listener);

    app.changeView(ViewType.DAY);

    expect(listener).toHaveBeenCalledTimes(1);
    const payload = listener.mock.calls[0][0];
    expect(payload.reason).toBe('viewChange');
    expect(payload.view).toBe(ViewType.DAY);
  });

  it('fires when setCurrentDate is called', () => {
    const app = makeApp();
    const listener = jest.fn();
    app.subscribeVisibleRangeChange(listener);

    app.setCurrentDate(new Date(2025, 0, 1));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].reason).toBe('navigation');
  });

  it('supports multiple independent listeners', () => {
    const app = makeApp();
    const listenerA = jest.fn();
    const listenerB = jest.fn();
    app.subscribeVisibleRangeChange(listenerA);
    app.subscribeVisibleRangeChange(listenerB);

    app.goToNext();

    expect(listenerA).toHaveBeenCalledTimes(1);
    expect(listenerB).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes when the returned function is called', () => {
    const app = makeApp();
    const listener = jest.fn();
    const unsubscribe = app.subscribeVisibleRangeChange(listener);

    app.goToNext();
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    app.goToNext();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('includes start/end dates in the correct order and spanning the full view window', () => {
    const app = makeApp();
    const listener = jest.fn();
    app.subscribeVisibleRangeChange(listener);

    app.setCurrentDate(new Date(2025, 0, 15)); // mid-January 2025

    const { start, end } = listener.mock.calls[0][0];
    // Week view spans 7 days
    const spanMs = end.getTime() - start.getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(spanMs).toBe(sevenDaysMs);
  });
});

// ─── Event Change Subscriptions ─────────────────────────────────────────────

describe('subscribeEventChanges', () => {
  it('fires when an event is added via addEvent', () => {
    const app = makeApp();
    const listener = jest.fn();
    app.subscribeEventChanges(listener);

    app.addEvent(makeEvent('e1'));

    expect(listener).toHaveBeenCalledTimes(1);
    const changes: EventChange[] = listener.mock.calls[0][0];
    expect(changes).toHaveLength(1);
    expect(changes[0].type).toBe('create');
    expect(
      (changes[0] as Extract<EventChange, { type: 'create' }>).event.id
    ).toBe('e1');
  });

  it('fires when an event is updated via updateEvent', async () => {
    const app = makeApp();
    app.addEvent(makeEvent('e1'));

    const listener = jest.fn();
    app.subscribeEventChanges(listener);

    await app.updateEvent('e1', { title: 'Updated' });

    expect(listener).toHaveBeenCalledTimes(1);
    const changes: EventChange[] = listener.mock.calls[0][0];
    expect(changes[0].type).toBe('update');
    const update = changes[0] as Extract<EventChange, { type: 'update' }>;
    expect(update.after.title).toBe('Updated');
  });

  it('fires when an event is deleted via deleteEvent', async () => {
    const app = makeApp();
    app.addEvent(makeEvent('e1'));

    const listener = jest.fn();
    app.subscribeEventChanges(listener);

    await app.deleteEvent('e1');

    expect(listener).toHaveBeenCalledTimes(1);
    const changes: EventChange[] = listener.mock.calls[0][0];
    expect(changes[0].type).toBe('delete');
    expect(
      (changes[0] as Extract<EventChange, { type: 'delete' }>).event.id
    ).toBe('e1');
  });

  it('fires for batch add/update/delete via applyEventsChanges', () => {
    const app = makeApp();
    const listener = jest.fn();
    app.subscribeEventChanges(listener);

    app.applyEventsChanges({
      add: [makeEvent('e1'), makeEvent('e2')],
    });

    expect(listener).toHaveBeenCalledTimes(1);
    const changes: EventChange[] = listener.mock.calls[0][0];
    expect(changes).toHaveLength(2);
    changes.forEach(c => expect(c.type).toBe('create'));
  });

  it('stamps source=local on user-initiated changes', () => {
    const app = makeApp();
    const listener = jest.fn();
    app.subscribeEventChanges(listener);

    app.addEvent(makeEvent('e1'));

    const changes: EventChange[] = listener.mock.calls[0][0];
    expect(changes[0].source).toBe<EventMutationSource>('local');
  });

  it('stamps source=drag on drag-sourced batch changes', () => {
    const app = makeApp();
    app.addEvent(makeEvent('e1'));

    const listener = jest.fn();
    app.subscribeEventChanges(listener);

    app.applyEventsChanges(
      { update: [{ id: 'e1', updates: { title: 'Dragged' } }] },
      false,
      'drag'
    );

    const changes: EventChange[] = listener.mock.calls[0][0];
    expect(changes[0].source).toBe<EventMutationSource>('drag');
  });

  it('stamps source=resize on resize-sourced batch changes', () => {
    const app = makeApp();
    app.addEvent(makeEvent('e1'));

    const listener = jest.fn();
    app.subscribeEventChanges(listener);

    app.applyEventsChanges(
      { update: [{ id: 'e1', updates: { title: 'Resized' } }] },
      false,
      'resize'
    );

    const changes: EventChange[] = listener.mock.calls[0][0];
    expect(changes[0].source).toBe<EventMutationSource>('resize');
  });

  it('supports multiple independent listeners', () => {
    const app = makeApp();
    const listenerA = jest.fn();
    const listenerB = jest.fn();
    app.subscribeEventChanges(listenerA);
    app.subscribeEventChanges(listenerB);

    app.addEvent(makeEvent('e1'));

    expect(listenerA).toHaveBeenCalledTimes(1);
    expect(listenerB).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes when the returned function is called', () => {
    const app = makeApp();
    const listener = jest.fn();
    const unsubscribe = app.subscribeEventChanges(listener);

    app.addEvent(makeEvent('e1'));
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    app.addEvent(makeEvent('e2'));
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

// ─── Remote Source Suppression ───────────────────────────────────────────────

describe('remote-source changes', () => {
  it('notifies subscribeEventChanges with source=remote', () => {
    const app = makeApp();
    const listener = jest.fn();
    app.subscribeEventChanges(listener);

    app.applyEventsChanges({ add: [makeEvent('remote-1')] }, false, 'remote');

    expect(listener).toHaveBeenCalledTimes(1);
    const changes: EventChange[] = listener.mock.calls[0][0];
    expect(changes[0].source).toBe<EventMutationSource>('remote');
  });

  it('does NOT call onEventBatchChange for remote-sourced changes', () => {
    const onEventBatchChange = jest.fn();
    const app = new CalendarApp({
      views: [],
      plugins: [],
      events: [],
      callbacks: { onEventBatchChange },
    });

    app.applyEventsChanges({ add: [makeEvent('remote-1')] }, false, 'remote');

    expect(onEventBatchChange).not.toHaveBeenCalled();
  });

  it('does NOT call onEventUpdate for remote-sourced single updates', async () => {
    const onEventUpdate = jest.fn();
    const app = new CalendarApp({
      views: [],
      plugins: [],
      events: [makeEvent('remote-1')],
      callbacks: { onEventUpdate },
    });

    await app.updateEvent(
      'remote-1',
      { title: 'Remote update' },
      false,
      'remote'
    );

    expect(onEventUpdate).not.toHaveBeenCalled();
  });

  it('does NOT call onEventBatchChange for drag/resize changes', () => {
    const onEventBatchChange = jest.fn();
    const app = new CalendarApp({
      views: [],
      plugins: [],
      events: [makeEvent('e1')],
      callbacks: { onEventBatchChange },
    });

    app.applyEventsChanges(
      { update: [{ id: 'e1', updates: { title: 'Dragged' } }] },
      false,
      'drag'
    );

    expect(onEventBatchChange).not.toHaveBeenCalled();
  });

  it('DOES call onEventBatchChange for local (default) changes', () => {
    const onEventBatchChange = jest.fn();
    const app = new CalendarApp({
      views: [],
      plugins: [],
      events: [],
      callbacks: { onEventBatchChange },
    });

    app.applyEventsChanges({ add: [makeEvent('local-1')] });

    expect(onEventBatchChange).toHaveBeenCalledTimes(1);
  });

  it('applies remote events to DayFlow state so they are queryable', () => {
    const app = makeApp();

    app.applyEventsChanges(
      { add: [makeEvent('remote-1'), makeEvent('remote-2')] },
      false,
      'remote'
    );

    expect(app.getAllEvents()).toHaveLength(2);
    expect(app.getAllEvents().map(e => e.id)).toContain('remote-1');
  });

  it('does not leak remote source after a no-op remote batch', () => {
    const app = makeApp();
    const listener = jest.fn();
    app.subscribeEventChanges(listener);

    app.applyEventsChanges({ delete: ['missing-event'] }, false, 'remote');
    app.applyEventsChanges({ add: [makeEvent('local-1')] });

    expect(listener).toHaveBeenCalledTimes(1);
    const changes: EventChange[] = listener.mock.calls[0][0];
    expect(changes[0].source).toBe<EventMutationSource>('local');
  });

  it('sync controller can distinguish remote from local to avoid write-back', () => {
    const app = makeApp();
    const writeBackIds: string[] = [];

    app.subscribeEventChanges(createWriteBackTracker(writeBackIds));

    // Remote load — should NOT trigger write-back
    app.applyEventsChanges({ add: [makeEvent('remote-1')] }, false, 'remote');

    // Local user change — SHOULD trigger write-back
    app.applyEventsChanges({ add: [makeEvent('local-1')] });

    expect(writeBackIds).toEqual(['local-1']);
  });
});
