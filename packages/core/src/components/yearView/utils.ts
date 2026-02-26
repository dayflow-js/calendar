import { Event } from '@/types';
import { temporalToDate } from '@/utils/temporal';

export interface YearMultiDaySegment {
  id: string;
  event: Event;
  startCellIndex: number; // 0 to columnsPerRow-1
  endCellIndex: number; // 0 to columnsPerRow-1
  isFirstSegment: boolean;
  isLastSegment: boolean;
  visualRowIndex: number; // Vertical slot index within the row to avoid overlap
}

/**
 * Groups an array of days into rows based on the number of columns per row.
 */
export function groupDaysIntoRows(
  yearDays: Date[],
  columnsPerRow: number
): Date[][] {
  const rows: Date[][] = [];
  for (let i = 0; i < yearDays.length; i += columnsPerRow) {
    rows.push(yearDays.slice(i, i + columnsPerRow));
  }
  return rows;
}

/**
 * Analyzes events for a specific row of days and returns segments for multi-day events.
 * It also calculates the vertical layout (visualRowIndex) to prevent overlaps.
 */
export function analyzeMultiDayEventsForRow(
  events: Event[],
  rowDays: Date[],
  columnsPerRow: number
): YearMultiDaySegment[] {
  if (rowDays.length === 0) return [];

  const rowStart = rowDays[0];
  const rowEnd = rowDays.at(-1)!;

  // Normalize row start/end to midnight
  const rowStartMs = new Date(
    rowStart.getFullYear(),
    rowStart.getMonth(),
    rowStart.getDate()
  ).getTime();
  const rowEndMs = new Date(
    rowEnd.getFullYear(),
    rowEnd.getMonth(),
    rowEnd.getDate(),
    23,
    59,
    59,
    999
  ).getTime();

  // 1. Filter events that overlap with this row
  const rowEvents = events.filter(event => {
    if (!event.start) return false;
    const start = temporalToDate(event.start);
    const end = event.end ? temporalToDate(event.end) : start;

    // Normalize event start/end
    const eventStartMs = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate()
    ).getTime();
    const eventEndMs = new Date(
      end.getFullYear(),
      end.getMonth(),
      end.getDate()
    ).getTime();

    return eventStartMs <= rowEndMs && eventEndMs >= rowStartMs;
  });

  // Sort events by length (longer first) then start time for better packing
  rowEvents.sort((a, b) => {
    const aStart = temporalToDate(a.start!).getTime();
    const aEnd = a.end ? temporalToDate(a.end).getTime() : aStart;
    const bStart = temporalToDate(b.start!).getTime();
    const bEnd = b.end ? temporalToDate(b.end).getTime() : bStart;

    const durationA = aEnd - aStart;
    const durationB = bEnd - bStart;

    if (durationA !== durationB) return durationB - durationA; // Longest first
    return aStart - bStart; // Then earliest start
  });

  const segments: YearMultiDaySegment[] = [];
  const occupiedSlots: boolean[][] = []; // [visualRowIndex][colIndex]

  rowEvents.forEach(event => {
    const eventStart = temporalToDate(event.start!);
    const eventEnd = event.end ? temporalToDate(event.end) : eventStart;

    const eventStartMs = new Date(
      eventStart.getFullYear(),
      eventStart.getMonth(),
      eventStart.getDate()
    ).getTime();
    const eventEndMs = new Date(
      eventEnd.getFullYear(),
      eventEnd.getMonth(),
      eventEnd.getDate()
    ).getTime();

    // Calculate start and end indices in the current row
    let startCellIndex = -1;
    let endCellIndex = -1;

    // Find start index
    // Optimization: Calculate diff in days from rowStart
    const daysFromStart = Math.round(
      (eventStartMs - rowStartMs) / (1000 * 60 * 60 * 24)
    );
    if (daysFromStart >= 0) {
      startCellIndex = daysFromStart;
    } else {
      startCellIndex = 0; // Starts before this row
    }

    // Find end index
    const daysFromEnd = Math.round(
      (eventEndMs - rowStartMs) / (1000 * 60 * 60 * 24)
    );
    if (daysFromEnd < rowDays.length) {
      endCellIndex = daysFromEnd;
    } else {
      endCellIndex = rowDays.length - 1; // Ends after this row
    }

    // Clamp indices
    startCellIndex = Math.max(0, Math.min(startCellIndex, columnsPerRow - 1));
    endCellIndex = Math.max(0, Math.min(endCellIndex, columnsPerRow - 1));

    // Determine if it's the very first/last segment of the entire event
    const isFirstSegment = eventStartMs >= rowStartMs;
    const isLastSegment = eventEndMs <= rowEndMs;

    // Determine visualRowIndex (simple packing algorithm)
    let visualRowIndex = 0;
    while (true) {
      let overlap = false;
      if (!occupiedSlots[visualRowIndex]) {
        occupiedSlots[visualRowIndex] = [];
      }

      for (let i = startCellIndex; i <= endCellIndex; i++) {
        if (occupiedSlots[visualRowIndex][i]) {
          overlap = true;
          break;
        }
      }

      if (!overlap) {
        // Found a slot, mark it occupied
        for (let i = startCellIndex; i <= endCellIndex; i++) {
          occupiedSlots[visualRowIndex][i] = true;
        }
        break;
      }
      visualRowIndex++;
    }

    segments.push({
      id: `${event.id}_${rowStart.getTime()}`, // Unique ID for key
      event,
      startCellIndex,
      endCellIndex,
      isFirstSegment,
      isLastSegment,
      visualRowIndex,
    });
  });

  return segments;
}
