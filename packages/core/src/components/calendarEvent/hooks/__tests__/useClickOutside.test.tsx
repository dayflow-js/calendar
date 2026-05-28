import { fireEvent, render } from '@testing-library/preact';
import { useRef } from 'preact/hooks';

import { useClickOutside } from '@/components/calendarEvent/hooks/useClickOutside';

interface HarnessProps {
  onEventSelect?: (id: string | null) => void;
  onDetailPanelToggle?: (key: string | null) => void;
  setIsSelected?: (selected: boolean) => void;
  setActiveDayIndex?: (index: number | null) => void;
}

const Harness = ({
  onEventSelect = jest.fn(),
  onDetailPanelToggle = jest.fn(),
  setIsSelected = jest.fn(),
  setActiveDayIndex = jest.fn(),
}: HarnessProps) => {
  const calendarRef = useRef<HTMLDivElement>(null);
  const eventRef = useRef<HTMLButtonElement>(null);
  const detailPanelRef = useRef<HTMLDivElement>(null);

  useClickOutside({
    eventRef,
    detailPanelRef,
    calendarRef,
    eventId: 'event-1',
    isEventSelected: true,
    showDetailPanel: true,
    onEventSelect,
    onDetailPanelToggle,
    setIsSelected,
    setActiveDayIndex,
  });

  return (
    <div ref={calendarRef}>
      <button ref={eventRef} type='button' data-event-id='event-1'>
        Current event
      </button>
      <button type='button' data-event-id='event-2'>
        Other event
      </button>
      <div ref={detailPanelRef} data-event-detail-panel='true'>
        Panel
      </div>
      <button type='button'>Outside</button>
    </div>
  );
};

describe('useClickOutside', () => {
  it('keeps the current panel mounted when another event receives mousedown', () => {
    const onDetailPanelToggle = jest.fn();
    const onEventSelect = jest.fn();
    const setIsSelected = jest.fn();
    const setActiveDayIndex = jest.fn();

    const { getByText } = render(
      <Harness
        onEventSelect={onEventSelect}
        onDetailPanelToggle={onDetailPanelToggle}
        setIsSelected={setIsSelected}
        setActiveDayIndex={setActiveDayIndex}
      />
    );

    fireEvent.mouseDown(getByText('Other event'));

    expect(onDetailPanelToggle).not.toHaveBeenCalled();
    expect(onEventSelect).not.toHaveBeenCalled();
    expect(setIsSelected).not.toHaveBeenCalled();
    expect(setActiveDayIndex).not.toHaveBeenCalled();
  });

  it('dismisses the panel when mousedown lands outside events and overlays', () => {
    const onDetailPanelToggle = jest.fn();
    const onEventSelect = jest.fn();
    const setIsSelected = jest.fn();
    const setActiveDayIndex = jest.fn();

    const { getByText } = render(
      <Harness
        onEventSelect={onEventSelect}
        onDetailPanelToggle={onDetailPanelToggle}
        setIsSelected={setIsSelected}
        setActiveDayIndex={setActiveDayIndex}
      />
    );

    fireEvent.mouseDown(getByText('Outside'));

    expect(onEventSelect).toHaveBeenCalledWith(null);
    expect(setActiveDayIndex).toHaveBeenCalledWith(null);
    expect(setIsSelected).toHaveBeenCalledWith(false);
    expect(onDetailPanelToggle).toHaveBeenCalledWith(null);
  });
});
