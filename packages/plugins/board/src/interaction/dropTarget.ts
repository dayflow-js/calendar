/**
 * Pure geometry for pointer and keyboard drag & drop. No DOM access here, so
 * the drop rules are unit-testable; `DragController` feeds it measured rects.
 */

export interface DropItemRect {
  id: string;
  top: number;
  bottom: number;
}

export interface DropGroupRect {
  id: string;
  left: number;
  right: number;
}

export interface DropPosition {
  /** Insertion index among the listed items (the dragged card excluded). */
  index: number;
  beforeTaskId?: string;
  afterTaskId?: string;
}

export function positionAt(
  ids: readonly string[],
  index: number
): DropPosition {
  const clamped = Math.max(0, Math.min(index, ids.length));
  return {
    index: clamped,
    beforeTaskId: ids[clamped],
    afterTaskId: clamped > 0 ? ids[clamped - 1] : undefined,
  };
}

/** Insert before the first card whose vertical midpoint is below `y`. */
export function resolveDropIndex(
  y: number,
  items: readonly DropItemRect[]
): DropPosition {
  let index = items.findIndex(
    item => y < item.top + (item.bottom - item.top) / 2
  );
  if (index < 0) index = items.length;
  return positionAt(
    items.map(item => item.id),
    index
  );
}

/** The column under `x`, or the horizontally nearest one. */
export function pickGroupAtPoint(
  x: number,
  groups: readonly DropGroupRect[]
): string | null {
  let nearest: string | null = null;
  let nearestDistance = Infinity;
  for (const group of groups) {
    if (x >= group.left && x <= group.right) return group.id;
    const distance = x < group.left ? group.left - x : x - group.right;
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = group.id;
    }
  }
  return nearest;
}

/**
 * Scroll speed near a container edge: 0 outside the edge zone, growing
 * linearly to `maxSpeed` at the edge itself. Negative scrolls backwards.
 */
export function autoScrollDelta(
  position: number,
  start: number,
  end: number,
  edge = 56,
  maxSpeed = 18
): number {
  const size = end - start;
  const zone = Math.min(edge, size / 3);
  if (zone <= 0) return 0;
  if (position < start + zone) {
    return -Math.ceil(Math.min(1, (start + zone - position) / zone) * maxSpeed);
  }
  if (position > end - zone) {
    return Math.ceil(Math.min(1, (position - (end - zone)) / zone) * maxSpeed);
  }
  return 0;
}

export interface KeyboardDropGroup {
  id: string;
  visibleTaskIds: readonly string[];
  droppable: boolean;
}

export interface KeyboardDropState {
  groupId: string;
  index: number;
}

export type KeyboardDropKey =
  | 'ArrowUp'
  | 'ArrowDown'
  | 'ArrowLeft'
  | 'ArrowRight'
  | 'Home'
  | 'End';

function idsWithout(group: KeyboardDropGroup, taskId: string): string[] {
  return group.visibleTaskIds.filter(id => id !== taskId);
}

/**
 * Next virtual position of a keyboard-lifted card. Up/down move within the
 * column, left/right jump to the nearest column that accepts drops, keeping
 * the index where possible.
 */
export function nextKeyboardDropState(
  groups: readonly KeyboardDropGroup[],
  taskId: string,
  current: KeyboardDropState,
  key: KeyboardDropKey
): KeyboardDropState {
  const groupIndex = groups.findIndex(group => group.id === current.groupId);
  if (groupIndex < 0) return current;
  const length = idsWithout(groups[groupIndex], taskId).length;
  switch (key) {
    case 'ArrowUp':
      return { ...current, index: Math.max(0, current.index - 1) };
    case 'ArrowDown':
      return { ...current, index: Math.min(length, current.index + 1) };
    case 'Home':
      return { ...current, index: 0 };
    case 'End':
      return { ...current, index: length };
    case 'ArrowLeft':
    case 'ArrowRight': {
      const step = key === 'ArrowLeft' ? -1 : 1;
      for (let i = groupIndex + step; i >= 0 && i < groups.length; i += step) {
        if (!groups[i].droppable) continue;
        return {
          groupId: groups[i].id,
          index: Math.min(current.index, idsWithout(groups[i], taskId).length),
        };
      }
      return current;
    }
    default:
      return current;
  }
}

export interface KeyboardFocusGroup {
  id: string;
  visibleTaskIds: readonly string[];
}

/** Roving-focus target for arrow keys when no card is lifted. */
export function nextFocusedTaskId(
  groups: readonly KeyboardFocusGroup[],
  taskId: string,
  key: KeyboardDropKey
): string | null {
  const groupIndex = groups.findIndex(group =>
    group.visibleTaskIds.includes(taskId)
  );
  if (groupIndex < 0) return null;
  const ids = groups[groupIndex].visibleTaskIds;
  const index = ids.indexOf(taskId);
  switch (key) {
    case 'ArrowUp':
      return ids[Math.max(0, index - 1)];
    case 'ArrowDown':
      return ids[Math.min(ids.length - 1, index + 1)];
    case 'Home':
      return ids[0];
    case 'End':
      return ids.at(-1) ?? null;
    case 'ArrowLeft':
    case 'ArrowRight': {
      const step = key === 'ArrowLeft' ? -1 : 1;
      for (let i = groupIndex + step; i >= 0 && i < groups.length; i += step) {
        const target = groups[i].visibleTaskIds;
        if (target.length > 0)
          return target[Math.min(index, target.length - 1)];
      }
      return taskId;
    }
    default:
      return taskId;
  }
}

export interface ColumnRect {
  id: string;
  /** Layout position (unaffected by drag transforms), in scroll-content px. */
  left: number;
  width: number;
}

/**
 * Index a dragged column takes among all columns: before the first other
 * column whose midpoint lies right of the pointer.
 */
export function resolveColumnDropIndex(
  x: number,
  columns: readonly ColumnRect[],
  sourceId: string
): number {
  const others = columns.filter(column => column.id !== sourceId);
  const index = others.findIndex(column => x < column.left + column.width / 2);
  return index < 0 ? others.length : index;
}

/**
 * Horizontal offsets that lay the columns out as if the source already sat at
 * `targetIndex` — the other columns slide aside to open the gap and the
 * source (the placeholder) moves into it. Widths may differ (collapsed
 * columns); the gap is taken from the current layout.
 */
export function columnShiftOffsets(
  columns: readonly ColumnRect[],
  sourceId: string,
  targetIndex: number
): Map<string, number> {
  const offsets = new Map<string, number>();
  const source = columns.find(column => column.id === sourceId);
  if (!source || columns.length === 0) return offsets;
  const gap =
    columns.length > 1
      ? Math.max(0, columns[1].left - (columns[0].left + columns[0].width))
      : 0;
  const order = columns.filter(column => column.id !== sourceId);
  order.splice(Math.max(0, Math.min(targetIndex, order.length)), 0, source);
  let cursor = columns[0].left;
  for (const column of order) {
    offsets.set(column.id, cursor - column.left);
    cursor += column.width + gap;
  }
  return offsets;
}
