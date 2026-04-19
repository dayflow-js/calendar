import { useState, useEffect, useRef } from 'preact/hooks';

interface TimePickerWheelProps {
  date: Date;
  onChange: (d: Date) => void;
  timeFormat?: '12h' | '24h';
}

export const TimePickerWheel = ({ date, onChange }: TimePickerWheelProps) => {
  const originalHours = Array.from({ length: 24 }, (_, i) => i);
  const originalMinutes = Array.from({ length: 12 }, (_, i) => i * 5);
  // Triple the arrays for infinite scroll simulation
  const hours = [...originalHours, ...originalHours, ...originalHours];
  const minutes = [...originalMinutes, ...originalMinutes, ...originalMinutes];

  const itemHeight = 32;
  const containerHeight = 224; // 7 items * 32px
  const spacerHeight = (containerHeight - itemHeight) / 2; // 96px

  const currentHour = date.getHours();
  const currentMinute = Math.round(date.getMinutes() / 5) * 5;

  // Initial position in the middle set
  const initialHourScroll = (24 + currentHour) * itemHeight;
  const initialMinuteScroll = (12 + currentMinute / 5) * itemHeight;

  // State to track scroll position for visual effects
  const [scrollTopHour, setScrollTopHour] = useState(initialHourScroll);
  const [scrollTopMin, setScrollTopMin] = useState(initialMinuteScroll);

  // Refs for scrolling to initial position and handling scroll stop
  const hourRef = useRef<HTMLDivElement>(null);
  const minRef = useRef<HTMLDivElement>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (hourRef.current) {
      hourRef.current.scrollTop = initialHourScroll;
      setScrollTopHour(initialHourScroll);
    }
    if (minRef.current) {
      minRef.current.scrollTop = initialMinuteScroll;
      setScrollTopMin(initialMinuteScroll);
    }
  }, [initialHourScroll, initialMinuteScroll]);

  const handleScrollStop = (type: 'hour' | 'minute', scrollTop: number) => {
    const index = Math.round(scrollTop / itemHeight);

    if (type === 'hour') {
      const h = hours[index]; // Use extended array
      if (h !== undefined && h !== date.getHours()) {
        const newDate = new Date(date);
        newDate.setHours(h);
        onChange(newDate);
      }
    } else {
      const m = minutes[index]; // Use extended array
      if (m !== undefined && Math.round(date.getMinutes() / 5) * 5 !== m) {
        const newDate = new Date(date);
        newDate.setMinutes(m);
        onChange(newDate);
      }
    }
  };

  const onScroll = (
    e: { currentTarget: HTMLDivElement },
    type: 'hour' | 'minute'
  ) => {
    const target = e.currentTarget;
    let scrollTop = target.scrollTop;

    // Infinite scroll logic: jump when reaching ends
    if (type === 'hour') {
      const totalHeight = 24 * itemHeight; // Height of one set
      if (scrollTop < 10 * itemHeight) {
        scrollTop += totalHeight;
        target.scrollTop = scrollTop;
      } else if (scrollTop > 50 * itemHeight) {
        // Near bottom of 2nd set
        scrollTop -= totalHeight;
        target.scrollTop = scrollTop;
      }
      setScrollTopHour(scrollTop);
    } else {
      const totalHeight = 12 * itemHeight; // Height of one set
      if (scrollTop < 5 * itemHeight) {
        scrollTop += totalHeight;
        target.scrollTop = scrollTop;
      } else if (scrollTop > 25 * itemHeight) {
        scrollTop -= totalHeight;
        target.scrollTop = scrollTop;
      }
      setScrollTopMin(scrollTop);
    }

    if (scrollTimerRef.current) {
      clearTimeout(scrollTimerRef.current);
    }
    scrollTimerRef.current = setTimeout(() => {
      handleScrollStop(type, scrollTop);
    }, 150);
  };

  const getItemStyle = (index: number, scrollTop: number) => {
    const itemCenterY = spacerHeight + index * itemHeight + itemHeight / 2;
    const scrollCenterY = scrollTop + containerHeight / 2;
    const distance = itemCenterY - scrollCenterY;
    const maxDistance = containerHeight / 2;

    const ratio = Math.min(Math.abs(distance) / maxDistance, 1);

    // Visual tweaks - curvature
    const scale = 1 - ratio * 0.4;
    const opacity = 1 - ratio * 0.7;
    const rotateX = (distance / maxDistance) * 80;

    return {
      transform: `perspective(500px) rotateX(${-rotateX}deg) scale(${scale})`,
      opacity,
      transition: 'transform 0.1s ease-out, opacity 0.1s ease-out',
    };
  };

  return (
    <div className='df-time-wheel'>
      <div
        ref={hourRef}
        className='df-time-wheel-column'
        onScroll={e => onScroll(e, 'hour')}
      >
        <div
          className='df-time-wheel-spacer'
          style={{ height: spacerHeight }}
        ></div>
        {hours.map((h, i) => (
          <div
            key={`h-${i}-${h}`}
            className='df-time-wheel-option df-time-wheel-option-hour'
            onClick={() => {
              const newDate = new Date(date);
              newDate.setHours(h);
              onChange(newDate);
              hourRef.current?.scrollTo({
                top: i * itemHeight,
                behavior: 'smooth',
              });
            }}
          >
            <div
              className='df-time-wheel-value'
              data-selected={String(h === currentHour)}
              style={getItemStyle(i, scrollTopHour)}
            >
              {h.toString().padStart(2, '0')}
            </div>
          </div>
        ))}
        <div
          className='df-time-wheel-spacer'
          style={{ height: spacerHeight }}
        ></div>
      </div>
      <div
        ref={minRef}
        className='df-time-wheel-column'
        onScroll={e => onScroll(e, 'minute')}
      >
        <div
          className='df-time-wheel-spacer'
          style={{ height: spacerHeight }}
        ></div>
        {minutes.map((m, i) => (
          <div
            key={`m-${i}-${m}`}
            className='df-time-wheel-option df-time-wheel-option-minute'
            onClick={() => {
              const newDate = new Date(date);
              newDate.setMinutes(m);
              onChange(newDate);
              minRef.current?.scrollTo({
                top: i * itemHeight,
                behavior: 'smooth',
              });
            }}
          >
            <div
              className='df-time-wheel-value'
              data-selected={String(m === currentMinute)}
              style={getItemStyle(i, scrollTopMin)}
            >
              {m.toString().padStart(2, '0')}
            </div>
          </div>
        ))}
        <div
          className='df-time-wheel-spacer'
          style={{ height: spacerHeight }}
        ></div>
      </div>
      <div className='df-time-wheel-selection'></div>
    </div>
  );
};
