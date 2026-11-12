import { Fragment } from 'preact';
import { useRef, useState } from 'preact/hooks';
import { Temporal } from 'temporal-polyfill';

import { useLocale } from '@/locale';
import type {
  TimeGridBackgroundChangeReason,
  TimeGridBackgroundRange,
  TimeGridBackgroundSource,
  TimeGridLayerContext,
} from '@/types';

export type TimeGridBackgroundLayerProps = TimeGridLayerContext & {
  sources: readonly TimeGridBackgroundSource[];
};

type PositionedRange = {
  source: TimeGridBackgroundSource;
  range: TimeGridBackgroundRange;
  dayIndex: number;
  startMinutes: number;
  endMinutes: number;
};

type Interaction = {
  source: TimeGridBackgroundSource;
  range?: TimeGridBackgroundRange;
  mode: 'create' | 'move' | 'resize-start' | 'resize-end';
  dayIndex: number;
  originY: number;
  originStartMinutes: number;
  originEndMinutes: number;
  startMinutes: number;
  endMinutes: number;
  didDrag: boolean;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function calculateAnchoredRange({
  mode,
  originStartMinutes,
  originEndMinutes,
  deltaMinutes,
  gridStart,
  gridEnd,
  minimumDuration,
}: {
  mode: 'move' | 'resize-start' | 'resize-end';
  originStartMinutes: number;
  originEndMinutes: number;
  deltaMinutes: number;
  gridStart: number;
  gridEnd: number;
  minimumDuration: number;
}) {
  const duration = originEndMinutes - originStartMinutes;
  if (mode === 'move') {
    const startMinutes = clamp(
      originStartMinutes + deltaMinutes,
      gridStart,
      gridEnd - duration
    );
    return { startMinutes, endMinutes: startMinutes + duration };
  }
  if (mode === 'resize-start') {
    return {
      startMinutes: clamp(
        originStartMinutes + deltaMinutes,
        gridStart,
        originEndMinutes - minimumDuration
      ),
      endMinutes: originEndMinutes,
    };
  }
  return {
    startMinutes: originStartMinutes,
    endMinutes: clamp(
      originEndMinutes + deltaMinutes,
      originStartMinutes + minimumDuration,
      gridEnd
    ),
  };
}

const minutesOfDay = (date: Temporal.ZonedDateTime) =>
  date.hour * 60 + date.minute + date.second / 60;

const snapFor = (source: TimeGridBackgroundSource) =>
  Math.max(1, source.snapMinutes ?? 15);

function atMinutes(
  date: Temporal.PlainDate,
  minutes: number,
  timeZone: string
): Temporal.ZonedDateTime {
  const safe = clamp(Math.round(minutes), 0, 24 * 60);
  const targetDate = safe === 24 * 60 ? date.add({ days: 1 }) : date;
  const minutesInDay = safe % (24 * 60);
  return targetDate.toZonedDateTime({
    timeZone,
    plainTime: new Temporal.PlainTime(
      Math.floor(minutesInDay / 60),
      minutesInDay % 60
    ),
  });
}

export function TimeGridBackgroundLayer({
  app,
  visibleDates,
  timeZone,
  hourHeight,
  firstHour,
  lastHour,
  sources,
}: TimeGridBackgroundLayerProps) {
  const { t } = useLocale();
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const interactionRef = useRef<Interaction | null>(null);
  const setActiveInteraction = (next: Interaction | null) => {
    interactionRef.current = next;
    setInteraction(next);
  };
  const rangeStart = visibleDates[0];
  const rangeEnd = visibleDates.at(-1);
  const dayCount = visibleDates.length;
  const dateIndexes = new Map(
    visibleDates.map((date, index) => [date.toString(), index])
  );

  if (!rangeStart || !rangeEnd || sources.length === 0) return null;

  const positioned = (() => {
    const result: PositionedRange[] = [];
    for (const source of sources) {
      const ranges = source.getRanges({ app, rangeStart, rangeEnd, timeZone });
      for (const range of ranges) {
        const start = range.start.withTimeZone(timeZone);
        const end = range.end.withTimeZone(timeZone);
        const date = start.toPlainDate();
        const dayIndex = dateIndexes.get(date.toString());
        if (dayIndex === undefined) continue;
        result.push({
          source,
          range,
          dayIndex,
          startMinutes: minutesOfDay(start),
          endMinutes: start.toPlainDate().equals(end.toPlainDate())
            ? minutesOfDay(end)
            : 24 * 60,
        });
      }
    }
    return result;
  })();

  const gridStart = firstHour * 60;
  const gridEnd = lastHour * 60;
  const snap = (value: number, source: TimeGridBackgroundSource) => {
    const size = snapFor(source);
    return Math.round(value / size) * size;
  };

  const pointerMinutes = (clientY: number, rect: DOMRect) =>
    gridStart + ((clientY - rect.top) / hourHeight) * 60;

  const commit = (
    current: Interaction,
    startMinutes: number,
    endMinutes: number,
    reason: TimeGridBackgroundChangeReason
  ) => {
    const date = visibleDates[current.dayIndex];
    if (!date) return;
    const start = atMinutes(date, startMinutes, timeZone);
    const end = atMinutes(date, endMinutes, timeZone);
    if (current.mode === 'create') current.source.onRangeCreate?.(start, end);
    else if (current.range) {
      current.source.onRangeChange?.(current.range, start, end, reason);
    }
    app.triggerRender();
  };

  const beginCreate = (event: PointerEvent) => {
    if (event.button !== 0) return;
    const source = sources.find(item => item.editable && item.onRangeCreate);
    if (!source) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const dayIndex = clamp(
      Math.floor(((event.clientX - rect.left) / rect.width) * dayCount),
      0,
      dayCount - 1
    );
    const startMinutes = clamp(
      snap(pointerMinutes(event.clientY, rect), source),
      gridStart,
      gridEnd
    );
    const duration = source.defaultCreateDurationMinutes ?? 60;
    setActiveInteraction({
      source,
      mode: 'create',
      dayIndex,
      originY: event.clientY,
      originStartMinutes: startMinutes,
      originEndMinutes: clamp(startMinutes + duration, gridStart, gridEnd),
      startMinutes,
      endMinutes: clamp(startMinutes + duration, gridStart, gridEnd),
      didDrag: false,
    });
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    event.preventDefault();
    event.stopPropagation();
  };

  const updatePointer = (event: PointerEvent) => {
    const currentInteraction = interactionRef.current;
    if (!currentInteraction) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const delta = snap(
      ((event.clientY - currentInteraction.originY) / hourHeight) * 60,
      currentInteraction.source
    );
    const didDrag =
      currentInteraction.didDrag ||
      Math.abs(event.clientY - currentInteraction.originY) > 3;
    if (!didDrag) return;
    let startMinutes = currentInteraction.originStartMinutes;
    let endMinutes = currentInteraction.originEndMinutes;
    if (currentInteraction.mode === 'create') {
      const current = clamp(
        snap(pointerMinutes(event.clientY, rect), currentInteraction.source),
        gridStart,
        gridEnd
      );
      startMinutes = Math.min(currentInteraction.originStartMinutes, current);
      endMinutes = Math.max(
        currentInteraction.originStartMinutes +
          snapFor(currentInteraction.source),
        current
      );
    } else {
      ({ startMinutes, endMinutes } = calculateAnchoredRange({
        mode: currentInteraction.mode,
        originStartMinutes: currentInteraction.originStartMinutes,
        originEndMinutes: currentInteraction.originEndMinutes,
        deltaMinutes: delta,
        gridStart,
        gridEnd,
        minimumDuration: snapFor(currentInteraction.source),
      }));
    }
    setActiveInteraction({
      ...currentInteraction,
      startMinutes,
      endMinutes,
      didDrag,
    });
    event.preventDefault();
  };

  const endPointer = (event: PointerEvent) => {
    const currentInteraction = interactionRef.current;
    if (!currentInteraction) return;
    const reason: TimeGridBackgroundChangeReason = currentInteraction.mode;
    commit(
      currentInteraction,
      currentInteraction.startMinutes,
      currentInteraction.endMinutes,
      reason
    );
    setActiveInteraction(null);
    (event.currentTarget as HTMLElement).releasePointerCapture?.(
      event.pointerId
    );
    event.preventDefault();
    event.stopPropagation();
  };

  const beginRangeInteraction = (
    event: PointerEvent,
    item: PositionedRange,
    mode: Interaction['mode']
  ) => {
    if (!item.source.editable || !item.range.editable) return;
    item.source.onRangeSelect?.(item.range);
    setActiveInteraction({
      source: item.source,
      range: item.range,
      mode,
      dayIndex: item.dayIndex,
      originY: event.clientY,
      originStartMinutes: item.startMinutes,
      originEndMinutes: item.endMinutes,
      startMinutes: item.startMinutes,
      endMinutes: item.endMinutes,
      didDrag: false,
    });
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    event.preventDefault();
    event.stopPropagation();
  };

  const keyboardChange = (event: KeyboardEvent, item: PositionedRange) => {
    const { source, range } = item;
    if (!source.editable || !range.editable) return;
    if (event.key === 'Delete' || event.key === 'Backspace') {
      source.onRangeDelete?.(range);
      app.triggerRender();
      event.preventDefault();
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      (source.onRangeOpen ?? source.onRangeSelect)?.(range);
      event.preventDefault();
      return;
    }
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    const delta = (event.key === 'ArrowUp' ? -1 : 1) * snapFor(source);
    let startMinutes = item.startMinutes;
    let endMinutes = item.endMinutes;
    let reason: TimeGridBackgroundChangeReason = 'keyboard-move';
    if (event.altKey) {
      startMinutes = clamp(
        startMinutes + delta,
        gridStart,
        endMinutes - snapFor(source)
      );
      reason = 'keyboard-resize-start';
    } else if (event.shiftKey) {
      endMinutes = clamp(
        endMinutes + delta,
        startMinutes + snapFor(source),
        gridEnd
      );
      reason = 'keyboard-resize-end';
    } else {
      const duration = endMinutes - startMinutes;
      startMinutes = clamp(startMinutes + delta, gridStart, gridEnd - duration);
      endMinutes = startMinutes + duration;
    }
    commit(
      {
        source,
        range,
        mode: 'move',
        dayIndex: item.dayIndex,
        originY: 0,
        originStartMinutes: startMinutes,
        originEndMinutes: endMinutes,
        startMinutes,
        endMinutes,
        didDrag: false,
      },
      startMinutes,
      endMinutes,
      reason
    );
    event.preventDefault();
  };

  return (
    <div
      className={`df-time-grid-background-layer ${sources.some(source => source.editable) ? 'df-time-grid-background-layer-editable' : ''}`}
      onPointerDown={beginCreate}
      onPointerMove={updatePointer}
      onPointerUp={endPointer}
      onPointerCancel={() => setActiveInteraction(null)}
    >
      {positioned.map(item => {
        const preview =
          interaction?.range?.id === item.range.id &&
          interaction.source.id === item.source.id
            ? interaction
            : null;
        const startMinutes = preview?.startMinutes ?? item.startMinutes;
        const endMinutes = preview?.endMinutes ?? item.endMinutes;
        const clippedStart = Math.max(startMinutes, gridStart);
        const clippedEnd = Math.min(endMinutes, gridEnd);
        if (clippedEnd <= clippedStart) return null;
        const editable = Boolean(item.source.editable && item.range.editable);
        const isBar = item.range.variant === 'bar';
        const dayLeft = (100 / dayCount) * item.dayIndex;
        const dayWidth = 100 / dayCount;
        const top = ((clippedStart - gridStart) / 60) * hourHeight;
        const canDelete = Boolean(
          editable && item.range.title && item.source.onRangeDelete
        );
        return (
          <Fragment key={`${item.source.id}:${item.range.id}`}>
            <button
              type='button'
              className={[
                'df-time-grid-background-range',
                editable && 'df-time-grid-background-range-editable',
                item.range.selected && 'df-time-grid-background-range-selected',
                item.range.invalid && 'df-time-grid-background-range-invalid',
                item.range.variant === 'bar' &&
                  'df-time-grid-background-range-bar',
                item.range.segmentMinutes &&
                  'df-time-grid-background-range-segmented',
                preview && 'df-time-grid-background-range-dragging',
                item.range.className,
              ]
                .filter(Boolean)
                .join(' ')}
              style={{
                left: `${dayLeft}%`,
                width: isBar ? '3px' : `${dayWidth}%`,
                transform:
                  isBar && item.dayIndex > 0 ? 'translateX(-50%)' : undefined,
                top: `${top}px`,
                height: `${((clippedEnd - clippedStart) / 60) * hourHeight}px`,
                backgroundColor: item.range.backgroundColor,
              }}
              tabIndex={0}
              aria-label={
                item.range.ariaLabel ?? item.range.title ?? t('timeRange')
              }
              aria-pressed={item.range.selected}
              onClick={event => {
                item.source.onRangeSelect?.(item.range);
                event.stopPropagation();
              }}
              onDblClick={event => {
                item.source.onRangeOpen?.(item.range);
                event.stopPropagation();
              }}
              onKeyDown={event => keyboardChange(event, item)}
              onPointerDown={event =>
                beginRangeInteraction(event, item, 'move')
              }
            >
              {item.range.segmentMinutes && item.range.segmentMinutes > 0 && (
                <span
                  className='df-time-grid-background-range-segments'
                  aria-hidden='true'
                >
                  {Array.from({
                    length: Math.ceil(
                      (endMinutes - startMinutes) / item.range.segmentMinutes
                    ),
                  }).map((_, index) => {
                    const segmentStart =
                      startMinutes + index * item.range.segmentMinutes!;
                    const segmentDuration = Math.min(
                      item.range.segmentMinutes!,
                      endMinutes - segmentStart
                    );
                    const available =
                      item.range.segmentAvailability?.[index] !== false;
                    return (
                      <span
                        key={index}
                        className={`df-time-grid-background-range-segment ${available ? '' : 'df-time-grid-background-range-segment-unavailable'}`}
                        style={{ flexGrow: segmentDuration }}
                        onPointerDown={
                          available
                            ? undefined
                            : event => {
                                event.preventDefault();
                                event.stopPropagation();
                              }
                        }
                        onClick={
                          available
                            ? undefined
                            : event => event.stopPropagation()
                        }
                      />
                    );
                  })}
                </span>
              )}
              {editable && (
                <span
                  className='df-time-grid-background-resize-handle df-time-grid-background-resize-handle-start'
                  aria-hidden='true'
                  onPointerDown={event =>
                    beginRangeInteraction(event, item, 'resize-start')
                  }
                />
              )}
              <span className='df-time-grid-background-range-title'>
                {item.range.title}
              </span>
              {item.range.hoverCard && (
                <span
                  className='df-time-grid-background-hover-card'
                  role='tooltip'
                >
                  <strong>{item.range.hoverCard.title}</strong>
                  <span>{item.range.hoverCard.detail}</span>
                </span>
              )}
              {editable && (
                <span
                  className='df-time-grid-background-resize-handle df-time-grid-background-resize-handle-end'
                  aria-hidden='true'
                  onPointerDown={event =>
                    beginRangeInteraction(event, item, 'resize-end')
                  }
                />
              )}
            </button>
            {canDelete && (
              <button
                type='button'
                className='df-time-grid-background-range-delete'
                style={{
                  left: `calc(${dayLeft + dayWidth}% - 1.9rem)`,
                  top: `${top + 4}px`,
                }}
                aria-label={
                  item.range.title
                    ? `${t('removeSlot')}: ${item.range.title}`
                    : t('removeSlot')
                }
                title={t('removeSlot')}
                onPointerDown={event => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onClick={event => {
                  item.source.onRangeDelete?.(item.range);
                  app.triggerRender();
                  event.preventDefault();
                  event.stopPropagation();
                }}
              >
                <svg viewBox='0 0 20 20' aria-hidden='true'>
                  <path d='M6 6l8 8M14 6l-8 8' />
                </svg>
              </button>
            )}
          </Fragment>
        );
      })}
      {interaction?.mode === 'create' && (
        <div
          className='df-time-grid-background-range df-time-grid-background-range-creating'
          style={{
            left: `${(100 / dayCount) * interaction.dayIndex}%`,
            width: `${100 / dayCount}%`,
            top: `${((interaction.startMinutes - gridStart) / 60) * hourHeight}px`,
            height: `${((interaction.endMinutes - interaction.startMinutes) / 60) * hourHeight}px`,
          }}
        />
      )}
    </div>
  );
}
