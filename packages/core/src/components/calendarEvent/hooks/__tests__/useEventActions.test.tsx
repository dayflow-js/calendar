import { render, fireEvent, act } from '@testing-library/preact';
import { useRef } from 'preact/hooks';
import { Temporal } from 'temporal-polyfill';

import { useEventActions } from '@/components/calendarEvent/hooks/useEventActions';
import { Event, ViewType } from '@/types';

const baseEvent: Event = {
  id: 'event-1',
  title: 'Year event',
  allDay: true,
  calendarId: 'default',
  start: Temporal.PlainDate.from('2026-03-24'),
  end: Temporal.PlainDate.from('2026-03-24'),
};

interface HarnessProps {
  onEventSelect?: (eventId: string | null) => void;
  onDetailPanelToggle?: (key: string | null) => void;
}

const Harness = ({ onEventSelect, onDetailPanelToggle }: HarnessProps) => {
  const selectedEventElementRef = useRef<HTMLElement | null>(null);
  const handlers = useEventActions({
    event: baseEvent,
    viewType: ViewType.YEAR,
    isAllDay: true,
    isMultiDay: false,
    calendarRef: { current: document.createElement('div') },
    firstHour: 0,
    hourHeight: 56,
    isMobile: false,
    canOpenDetail: true,
    detailPanelKey: 'event-1::year-segment',
    onEventSelect,
    onDetailPanelToggle,
    setIsSelected: jest.fn(),
    setDetailPanelPosition: jest.fn(),
    setContextMenuPosition: jest.fn(),
    setActiveDayIndex: jest.fn(),
    getClickedDayIdx: jest.fn(),
    updatePanelPosition: jest.fn(),
    selectedEventElementRef,
  });

  return (
    <button
      type='button'
      data-testid='event'
      onClick={handlers.handleClick}
      onDblClick={handlers.handleDoubleClick}
    >
      Event
    </button>
  );
};

describe('useEventActions', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('delays year-view single click selection until the double-click window passes', () => {
    const onEventSelect = jest.fn();
    const onDetailPanelToggle = jest.fn();
    const { getByTestId } = render(
      <Harness
        onEventSelect={onEventSelect}
        onDetailPanelToggle={onDetailPanelToggle}
      />
    );

    fireEvent.click(getByTestId('event'), { clientX: 24 });

    expect(onEventSelect).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(179);
    });
    expect(onEventSelect).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(onEventSelect).toHaveBeenCalledWith('event-1');
    expect(onDetailPanelToggle).toHaveBeenCalledWith(null);
  });

  it('cancels the pending year-view single click when the event is double-clicked', async () => {
    const onEventSelect = jest.fn();
    const onDetailPanelToggle = jest.fn();
    const { getByTestId } = render(
      <Harness
        onEventSelect={onEventSelect}
        onDetailPanelToggle={onDetailPanelToggle}
      />
    );

    const eventButton = getByTestId('event');

    fireEvent.click(eventButton, { clientX: 24 });

    await act(async () => {
      fireEvent.dblClick(eventButton, { clientX: 24 });
      await Promise.resolve();
    });

    act(() => {
      jest.advanceTimersByTime(180);
    });

    expect(onEventSelect).toHaveBeenCalledWith('event-1');
    expect(onEventSelect).toHaveBeenCalledTimes(1);
    expect(onDetailPanelToggle).toHaveBeenCalledWith('event-1::year-segment');
    expect(onDetailPanelToggle).not.toHaveBeenCalledWith(null);
  });

  it('selects non-year events on double click before opening the detail panel', async () => {
    const onEventSelect = jest.fn();
    const onDetailPanelToggle = jest.fn();
    const selectedEventElementRef = { current: null as HTMLElement | null };
    const setIsSelected = jest.fn();

    const DayHarness = () => {
      const handlers = useEventActions({
        event: baseEvent,
        viewType: ViewType.DAY,
        isAllDay: true,
        isMultiDay: false,
        calendarRef: { current: document.createElement('div') },
        firstHour: 0,
        hourHeight: 56,
        isMobile: false,
        canOpenDetail: true,
        detailPanelKey: 'event-1',
        onEventSelect,
        onDetailPanelToggle,
        setIsSelected,
        setDetailPanelPosition: jest.fn(),
        setContextMenuPosition: jest.fn(),
        setActiveDayIndex: jest.fn(),
        getClickedDayIdx: jest.fn(),
        updatePanelPosition: jest.fn(),
        selectedEventElementRef,
      });

      return (
        <button
          type='button'
          data-testid='day-event'
          onDblClick={handlers.handleDoubleClick}
        >
          Event
        </button>
      );
    };

    const { getByTestId } = render(<DayHarness />);

    await act(async () => {
      fireEvent.dblClick(getByTestId('day-event'), { clientX: 24 });
      await Promise.resolve();
    });

    expect(onEventSelect).toHaveBeenCalledWith('event-1');
    expect(onDetailPanelToggle).toHaveBeenCalledWith('event-1');
    expect(setIsSelected).toHaveBeenCalledWith(true);
  });

  it('defers non-year click callbacks until the double-click window passes', () => {
    const app = {
      onEventClick: jest.fn(),
    } as unknown as import('@/types').ICalendarApp;
    const onEventSelect = jest.fn();
    const onDetailPanelToggle = jest.fn();
    const selectedEventElementRef = { current: null as HTMLElement | null };
    const setIsSelected = jest.fn();

    const DayHarness = () => {
      const handlers = useEventActions({
        event: baseEvent,
        viewType: ViewType.DAY,
        isAllDay: true,
        isMultiDay: false,
        app,
        calendarRef: { current: document.createElement('div') },
        firstHour: 0,
        hourHeight: 56,
        isMobile: false,
        canOpenDetail: true,
        detailPanelKey: 'event-1',
        onEventSelect,
        onDetailPanelToggle,
        setIsSelected,
        setDetailPanelPosition: jest.fn(),
        setContextMenuPosition: jest.fn(),
        setActiveDayIndex: jest.fn(),
        getClickedDayIdx: jest.fn(),
        updatePanelPosition: jest.fn(),
        selectedEventElementRef,
      });

      return (
        <button
          type='button'
          data-testid='day-click-event'
          onClick={handlers.handleClick}
        >
          Event
        </button>
      );
    };

    const { getByTestId } = render(<DayHarness />);

    fireEvent.click(getByTestId('day-click-event'), { clientX: 24 });

    expect(onEventSelect).toHaveBeenCalledWith('event-1');
    expect(onDetailPanelToggle).toHaveBeenCalledWith(null);
    expect(app.onEventClick).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(179);
    });
    expect(app.onEventClick).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(app.onEventClick).toHaveBeenCalledWith(baseEvent);
  });

  it('suppresses click callbacks when a non-year event becomes a double click', async () => {
    const app = {
      onEventClick: jest.fn(),
      onEventDoubleClick: jest.fn(),
    } as unknown as import('@/types').ICalendarApp;
    const onEventSelect = jest.fn();
    const onDetailPanelToggle = jest.fn();
    const selectedEventElementRef = { current: null as HTMLElement | null };
    const setIsSelected = jest.fn();

    const DayHarness = () => {
      const handlers = useEventActions({
        event: baseEvent,
        viewType: ViewType.DAY,
        isAllDay: true,
        isMultiDay: false,
        app,
        calendarRef: { current: document.createElement('div') },
        firstHour: 0,
        hourHeight: 56,
        isMobile: false,
        canOpenDetail: true,
        detailPanelKey: 'event-1',
        onEventSelect,
        onDetailPanelToggle,
        setIsSelected,
        setDetailPanelPosition: jest.fn(),
        setContextMenuPosition: jest.fn(),
        setActiveDayIndex: jest.fn(),
        getClickedDayIdx: jest.fn(),
        updatePanelPosition: jest.fn(),
        selectedEventElementRef,
      });

      return (
        <button
          type='button'
          data-testid='day-double-event'
          onClick={handlers.handleClick}
          onDblClick={handlers.handleDoubleClick}
        >
          Event
        </button>
      );
    };

    const { getByTestId } = render(<DayHarness />);
    const eventButton = getByTestId('day-double-event');

    fireEvent.click(eventButton, { clientX: 24 });
    fireEvent.click(eventButton, { clientX: 24 });

    await act(async () => {
      fireEvent.dblClick(eventButton, { clientX: 24 });
      await Promise.resolve();
    });

    act(() => {
      jest.advanceTimersByTime(180);
    });

    expect(app.onEventClick).not.toHaveBeenCalled();
    expect(app.onEventDoubleClick).toHaveBeenCalledWith(
      baseEvent,
      expect.any(MouseEvent)
    );
    expect(onEventSelect).toHaveBeenCalledWith('event-1');
    expect(onDetailPanelToggle).toHaveBeenCalledWith('event-1');
  });

  it('allows onEventDoubleClick to suppress the default detail panel', async () => {
    const app = {
      onEventClick: jest.fn(),
      onEventDoubleClick: jest.fn(() => false),
    } as unknown as import('@/types').ICalendarApp;
    const onEventSelect = jest.fn();
    const onDetailPanelToggle = jest.fn();
    const selectedEventElementRef = { current: null as HTMLElement | null };
    const setIsSelected = jest.fn();

    const DayHarness = () => {
      const handlers = useEventActions({
        event: baseEvent,
        viewType: ViewType.DAY,
        isAllDay: true,
        isMultiDay: false,
        app,
        calendarRef: { current: document.createElement('div') },
        firstHour: 0,
        hourHeight: 56,
        isMobile: false,
        canOpenDetail: true,
        detailPanelKey: 'event-1',
        onEventSelect,
        onDetailPanelToggle,
        setIsSelected,
        setDetailPanelPosition: jest.fn(),
        setContextMenuPosition: jest.fn(),
        setActiveDayIndex: jest.fn(),
        getClickedDayIdx: jest.fn(),
        updatePanelPosition: jest.fn(),
        selectedEventElementRef,
      });

      return (
        <button
          type='button'
          data-testid='day-event-suppress'
          onDblClick={handlers.handleDoubleClick}
        >
          Event
        </button>
      );
    };

    const { getByTestId } = render(<DayHarness />);

    await act(async () => {
      fireEvent.dblClick(getByTestId('day-event-suppress'), { clientX: 24 });
      await Promise.resolve();
    });

    expect(app.onEventClick).not.toHaveBeenCalled();
    expect(app.onEventDoubleClick).toHaveBeenCalledWith(
      baseEvent,
      expect.any(MouseEvent)
    );
    expect(onEventSelect).toHaveBeenCalledWith('event-1');
    expect(setIsSelected).toHaveBeenCalledWith(true);
    expect(onDetailPanelToggle).not.toHaveBeenCalled();
  });

  it('waits for resource-view scrolling to settle before opening the detail panel', async () => {
    const app = {
      onEventClick: jest.fn(),
    } as unknown as import('@/types').ICalendarApp;
    const onEventSelect = jest.fn();
    const onDetailPanelToggle = jest.fn();
    const setIsSelected = jest.fn();
    const setDetailPanelPosition = jest.fn();
    const selectedEventElementRef = { current: null as HTMLElement | null };
    const calendarContent = document.createElement('div');
    calendarContent.className = 'df-calendar-content';
    calendarContent.scrollLeft = 0;
    calendarContent.scrollTop = 0;
    Object.defineProperty(calendarContent, 'clientWidth', {
      value: 320,
      configurable: true,
    });
    Object.defineProperty(calendarContent, 'clientHeight', {
      value: 240,
      configurable: true,
    });
    Object.defineProperty(calendarContent, 'scrollWidth', {
      value: 1200,
      configurable: true,
    });
    Object.defineProperty(calendarContent, 'scrollHeight', {
      value: 1400,
      configurable: true,
    });
    calendarContent.getBoundingClientRect = jest.fn(() => ({
      left: 0,
      top: 0,
      right: 320,
      bottom: 240,
      width: 320,
      height: 240,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })) as unknown as typeof calendarContent.getBoundingClientRect;
    const scrollToMock = jest.fn((left: number, top: number) => {
      calendarContent.scrollLeft = left;
      calendarContent.scrollTop = top;
    });
    calendarContent.scrollTo =
      scrollToMock as unknown as typeof calendarContent.scrollTo;

    const timedEvent: Event = {
      ...baseEvent,
      allDay: false,
      start: Temporal.ZonedDateTime.from(
        '2026-03-24T10:00:00+11:00[Australia/Sydney]'
      ),
      end: Temporal.ZonedDateTime.from(
        '2026-03-24T11:00:00+11:00[Australia/Sydney]'
      ),
    };

    const ResourceHarness = () => {
      const handlers = useEventActions({
        event: timedEvent,
        viewType: ViewType.RESOURCE,
        isAllDay: false,
        isMultiDay: false,
        app,
        calendarRef: { current: calendarContent },
        firstHour: 0,
        hourHeight: 56,
        isMobile: false,
        canOpenDetail: true,
        detailPanelKey: 'event-1::resource',
        onEventSelect,
        onDetailPanelToggle,
        setIsSelected,
        setDetailPanelPosition,
        setContextMenuPosition: jest.fn(),
        setActiveDayIndex: jest.fn(),
        getClickedDayIdx: jest.fn(),
        updatePanelPosition: jest.fn(),
        selectedEventElementRef,
      });

      return (
        <button
          type='button'
          data-testid='resource-event'
          onDblClick={handlers.handleDoubleClick}
          ref={element => {
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions, jest/no-conditional-in-test
            element &&
              (element.getBoundingClientRect = jest.fn(() => ({
                left: 680,
                top: 420,
                right: 780,
                bottom: 480,
                width: 100,
                height: 60,
                x: 680,
                y: 420,
                toJSON: () => ({}),
              })) as unknown as typeof element.getBoundingClientRect);
          }}
        >
          Event
        </button>
      );
    };

    const { getByTestId } = render(<ResourceHarness />);

    await act(async () => {
      fireEvent.dblClick(getByTestId('resource-event'), { clientX: 720 });
      await Promise.resolve();
    });

    expect(scrollToMock).toHaveBeenCalled();
    expect(app.onEventClick).not.toHaveBeenCalled();
    expect(onEventSelect).toHaveBeenCalledWith('event-1');
    expect(setIsSelected).toHaveBeenCalledWith(true);
    expect(onDetailPanelToggle).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(159);
    });
    expect(onDetailPanelToggle).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(1);
      await Promise.resolve();
    });

    expect(onDetailPanelToggle).toHaveBeenCalledWith('event-1::resource');
    expect(setDetailPanelPosition).toHaveBeenCalledWith(
      expect.objectContaining({ left: -9999, top: -9999 })
    );
  });

  it('does not auto-scroll resource-view events that are already fully visible', async () => {
    const app = {
      onEventClick: jest.fn(),
    } as unknown as import('@/types').ICalendarApp;
    const onEventSelect = jest.fn();
    const onDetailPanelToggle = jest.fn();
    const setIsSelected = jest.fn();
    const setDetailPanelPosition = jest.fn();
    const selectedEventElementRef = { current: null as HTMLElement | null };
    const calendarContent = document.createElement('div');
    calendarContent.className = 'df-calendar-content';
    Object.defineProperty(calendarContent, 'clientWidth', {
      value: 320,
      configurable: true,
    });
    Object.defineProperty(calendarContent, 'clientHeight', {
      value: 240,
      configurable: true,
    });
    calendarContent.getBoundingClientRect = jest.fn(() => ({
      left: 0,
      top: 0,
      right: 320,
      bottom: 240,
      width: 320,
      height: 240,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })) as unknown as typeof calendarContent.getBoundingClientRect;
    const scrollToMock = jest.fn();
    calendarContent.scrollTo =
      scrollToMock as unknown as typeof calendarContent.scrollTo;

    const timedEvent: Event = {
      ...baseEvent,
      allDay: false,
      start: Temporal.ZonedDateTime.from(
        '2026-03-24T10:00:00+11:00[Australia/Sydney]'
      ),
      end: Temporal.ZonedDateTime.from(
        '2026-03-24T11:00:00+11:00[Australia/Sydney]'
      ),
    };

    const ResourceHarness = () => {
      const handlers = useEventActions({
        event: timedEvent,
        viewType: ViewType.RESOURCE,
        isAllDay: false,
        isMultiDay: false,
        app,
        calendarRef: { current: calendarContent },
        firstHour: 0,
        hourHeight: 56,
        isMobile: false,
        canOpenDetail: true,
        detailPanelKey: 'event-1::resource',
        onEventSelect,
        onDetailPanelToggle,
        setIsSelected,
        setDetailPanelPosition,
        setContextMenuPosition: jest.fn(),
        setActiveDayIndex: jest.fn(),
        getClickedDayIdx: jest.fn(),
        updatePanelPosition: jest.fn(),
        selectedEventElementRef,
      });

      return (
        <button
          type='button'
          data-testid='resource-visible-event'
          onDblClick={handlers.handleDoubleClick}
          ref={element => {
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions, jest/no-conditional-in-test
            element &&
              (element.getBoundingClientRect = jest.fn(() => ({
                left: 80,
                top: 60,
                right: 180,
                bottom: 120,
                width: 100,
                height: 60,
                x: 80,
                y: 60,
                toJSON: () => ({}),
              })) as unknown as typeof element.getBoundingClientRect);
          }}
        >
          Event
        </button>
      );
    };

    const { getByTestId } = render(<ResourceHarness />);

    await act(async () => {
      fireEvent.dblClick(getByTestId('resource-visible-event'), {
        clientX: 120,
      });
      await Promise.resolve();
    });

    expect(scrollToMock).not.toHaveBeenCalled();
    expect(app.onEventClick).not.toHaveBeenCalled();
    expect(onEventSelect).toHaveBeenCalledWith('event-1');
    expect(setIsSelected).toHaveBeenCalledWith(true);
    expect(onDetailPanelToggle).toHaveBeenCalledWith('event-1::resource');
  });
});
