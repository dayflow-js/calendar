import { render, act } from '@testing-library/preact';
import { useRef } from 'preact/hooks';

import {
  getPanelHandoffStartPosition,
  usePanelHandoffAnimation,
} from '@/components/calendarEvent/hooks/usePanelHandoffAnimation';
import { EventDetailPosition } from '@/types';

const makeRect = (
  left: number,
  top: number,
  width = 260,
  height = 180
): DOMRect =>
  ({
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
    x: left,
    y: top,
    toJSON: () => ({}),
  }) as DOMRect;

const makePosition = (rect: DOMRect): EventDetailPosition => ({
  top: rect.top,
  left: rect.left,
  eventHeight: 0,
  eventMiddleY: 0,
  isSunday: false,
});

interface HarnessProps {
  calendarElement: HTMLDivElement;
  eventId: string;
  rect: DOMRect;
  position: EventDetailPosition;
}

const Harness = ({
  calendarElement,
  eventId,
  rect,
  position,
}: HarnessProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const rectRef = useRef(rect);
  rectRef.current = rect;

  usePanelHandoffAnimation({
    panelRef,
    calendarRef: { current: calendarElement },
    eventId,
    position,
  });

  return (
    <div
      data-testid='panel'
      ref={node => {
        panelRef.current = node;
        if (node) {
          node.getBoundingClientRect = jest.fn(() => rectRef.current);
        }
      }}
    />
  );
};

describe('usePanelHandoffAnimation', () => {
  let requestAnimationFrameSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    requestAnimationFrameSpy = jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation(callback => {
        callback(0);
        return 1;
      });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    requestAnimationFrameSpy.mockRestore();
  });

  it('provides the previous panel position as the start point for a new event', () => {
    const calendarElement = document.createElement('div');
    const oldRect = makeRect(420, 48);

    render(
      <Harness
        calendarElement={calendarElement}
        eventId='event-1'
        rect={oldRect}
        position={makePosition(oldRect)}
      />
    );

    expect(
      getPanelHandoffStartPosition({ current: calendarElement }, 'event-2')
    ).toEqual(expect.objectContaining({ left: 420, top: 48 }));
    expect(
      getPanelHandoffStartPosition({ current: calendarElement }, 'event-1')
    ).toBeNull();
  });

  it('keeps the handoff stash until the new panel reaches its real position', () => {
    const calendarElement = document.createElement('div');
    const oldRect = makeRect(420, 48);
    const newRect = makeRect(80, 520);

    const { container, rerender } = render(
      <Harness
        calendarElement={calendarElement}
        eventId='event-1'
        rect={oldRect}
        position={makePosition(oldRect)}
      />
    );

    rerender(
      <Harness
        calendarElement={calendarElement}
        eventId='event-2'
        rect={oldRect}
        position={makePosition(oldRect)}
      />
    );

    expect(
      getPanelHandoffStartPosition({ current: calendarElement }, 'event-2')
    ).toEqual(expect.objectContaining({ left: 420, top: 48 }));

    act(() => {
      rerender(
        <Harness
          calendarElement={calendarElement}
          eventId='event-2'
          rect={newRect}
          position={makePosition(newRect)}
        />
      );
    });

    const livePanel = container.querySelector(
      '[data-testid="panel"]:not([data-event-detail-panel-handoff])'
    );

    expect(livePanel).not.toBeNull();
    expect(
      document.querySelector('[data-event-detail-panel-handoff]')
    ).not.toBeNull();
  });
});
