import {
  autoScrollDelta,
  columnShiftOffsets,
  resolveColumnDropIndex,
} from './dropTarget';
import type { ColumnRect } from './dropTarget';
import { PointerGesture } from './PointerGesture';

export interface ColumnDragElements {
  root: HTMLElement;
  viewport: HTMLElement;
  overlay: HTMLElement;
}

export interface ColumnDragCallbacks {
  onDragStart(groupId: string, column: HTMLElement): void;
  /**
   * `targetIndex` is the new position among the rendered columns, or null
   * when the drag was cancelled.
   */
  onDragEnd(groupId: string, targetIndex: number | null): void;
}

interface ColumnSession {
  groupId: string;
  gesture: PointerGesture;
  column: HTMLElement;
  offsetX: number;
  offsetY: number;
  rects: ColumnRect[];
  columns: Map<string, HTMLElement>;
  sourceIndex: number;
  targetIndex: number;
  frame: number | null;
}

/** Transitions only run while this attribute is set (see board.css). */
const DRAGGING_ATTRIBUTE = 'columnDragging';
const SETTLE_MS = 200;

/**
 * Reorders columns by dragging their header. While dragging, the other
 * columns slide aside (CSS transforms) to open a gap where the column will
 * land, and a clone of the column follows the pointer. The drop is reported
 * once; the DOM is never reordered here.
 */
export class ColumnDragController {
  private session: ColumnSession | null = null;
  private settleTimer: ReturnType<typeof setTimeout> | null = null;

  public constructor(
    private readonly getElements: () => ColumnDragElements | null,
    private readonly callbacks: ColumnDragCallbacks
  ) {}

  public isDragging(): boolean {
    return this.session?.gesture.active === true;
  }

  public handlePointerDown(
    event: PointerEvent,
    groupId: string,
    column: HTMLElement
  ): void {
    if (this.session || (event.pointerType === 'mouse' && event.button !== 0))
      return;
    const rect = column.getBoundingClientRect();
    this.session = {
      groupId,
      gesture: new PointerGesture(event, {
        onActivate: () => this.activate(),
        onEnd: cancelled => this.end(cancelled),
        onRelease: () => {
          this.session = null;
        },
      }),
      column,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      rects: [],
      columns: new Map(),
      sourceIndex: -1,
      targetIndex: -1,
      frame: null,
    };
  }

  public destroy(): void {
    this.session?.gesture.dispose();
    if (this.settleTimer) clearTimeout(this.settleTimer);
    this.reset(false);
  }

  private activate(): void {
    const session = this.session;
    const elements = this.getElements();
    if (!session || !elements) return;
    if (this.settleTimer) {
      clearTimeout(this.settleTimer);
      this.settleTimer = null;
    }
    // Layout positions (offsetLeft) ignore transforms and scrolling, so the
    // hit test stays stable while columns slide and the viewport scrolls.
    const columns = [
      ...elements.viewport.querySelectorAll<HTMLElement>(
        ':scope > [data-board-group]'
      ),
    ];
    session.rects = columns.map(column => ({
      id: column.dataset.boardGroup!,
      left: column.offsetLeft,
      width: column.offsetWidth,
    }));
    session.columns = new Map(
      columns.map(column => [column.dataset.boardGroup!, column])
    );
    session.sourceIndex = session.rects.findIndex(
      rect => rect.id === session.groupId
    );
    session.targetIndex = session.sourceIndex;
    const { overlay, root } = elements;
    overlay.style.width = `${session.column.offsetWidth}px`;
    overlay.style.maxHeight = `${session.column.offsetHeight}px`;
    overlay.hidden = false;
    session.column.classList.add('is-column-drag-source');
    root.dataset[DRAGGING_ATTRIBUTE] = 'true';
    root.dataset.dragging = 'true';
    this.callbacks.onDragStart(session.groupId, session.column);
    const tick = () => {
      if (!this.session?.gesture.active) return;
      this.frame();
      this.session.frame = requestAnimationFrame(tick);
    };
    session.frame = requestAnimationFrame(tick);
  }

  private frame(): void {
    const session = this.session;
    const elements = this.getElements();
    if (!session || !elements) return;
    const { x, y } = session.gesture;
    const { overlay, viewport } = elements;
    overlay.style.transform = `translate3d(${x - session.offsetX}px, ${y - session.offsetY}px, 0)`;

    const viewportRect = viewport.getBoundingClientRect();
    const dx = autoScrollDelta(x, viewportRect.left, viewportRect.right);
    if (dx) viewport.scrollLeft += dx;

    const contentX =
      x - viewportRect.left - viewport.clientLeft + viewport.scrollLeft;
    const targetIndex = resolveColumnDropIndex(
      contentX,
      session.rects,
      session.groupId
    );
    if (targetIndex === session.targetIndex) return;
    session.targetIndex = targetIndex;
    const offsets = columnShiftOffsets(
      session.rects,
      session.groupId,
      targetIndex
    );
    for (const [id, column] of session.columns) {
      const offset = offsets.get(id) ?? 0;
      column.style.transform = offset ? `translateX(${offset}px)` : '';
    }
  }

  private end(cancelled: boolean): void {
    const session = this.session;
    if (!session) return;
    if (!cancelled) this.frame();
    const moved = !cancelled && session.targetIndex !== session.sourceIndex;
    // A drop lands instantly (the columns re-render in their new order in
    // the same frame); a cancel slides the columns back.
    this.reset(!moved);
    this.callbacks.onDragEnd(
      session.groupId,
      moved ? session.targetIndex : null
    );
  }

  private reset(animate: boolean): void {
    const session = this.session;
    this.session = null;
    const elements = this.getElements();
    if (session?.frame !== null && session?.frame !== undefined) {
      cancelAnimationFrame(session.frame);
    }
    session?.column.classList.remove('is-column-drag-source');
    session?.columns.forEach(column => {
      column.style.transform = '';
    });
    if (!elements) return;
    elements.overlay.hidden = true;
    delete elements.root.dataset.dragging;
    elements.overlay.style.maxHeight = '';
    if (animate) {
      this.settleTimer = setTimeout(() => {
        delete elements.root.dataset.columnDragging;
        this.settleTimer = null;
      }, SETTLE_MS);
    } else {
      delete elements.root.dataset.columnDragging;
    }
  }
}
