const MOUSE_THRESHOLD = 4;
const TOUCH_DELAY = 220;
const TOUCH_TOLERANCE = 8;

export interface PointerGestureHandlers {
  /** The gesture became a drag (moved past the threshold / long-pressed). */
  onActivate(): void;
  /** Pointer moved while active. `gesture.x/y` hold the position. */
  onMove?(): void;
  /** Ended after activation; `cancelled` for Escape / pointercancel. */
  onEnd(cancelled: boolean): void;
  /** Released (or turned into a scroll) without ever becoming a drag. */
  onRelease?(): void;
}

function stopClick(event: Event): void {
  event.stopPropagation();
  event.preventDefault();
}

/**
 * Tracks one pointer from `pointerdown` until it becomes a drag or is
 * released. Mouse and pen activate after a small movement; touch activates
 * on a long press (moving earlier is a scroll, so the gesture is dropped).
 * While active it blocks touch scrolling, cancels on Escape and swallows the
 * click that follows the drop.
 */
export class PointerGesture {
  public x: number;
  public y: number;
  public active = false;
  public readonly startX: number;
  public readonly startY: number;
  public readonly pointerType: string;
  private readonly pointerId: number;
  private touchTimer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;

  public constructor(
    event: PointerEvent,
    private readonly handlers: PointerGestureHandlers
  ) {
    this.x = this.startX = event.clientX;
    this.y = this.startY = event.clientY;
    this.pointerType = event.pointerType;
    this.pointerId = event.pointerId;
    if (event.pointerType === 'touch') {
      this.touchTimer = setTimeout(() => this.activate(), TOUCH_DELAY);
    }
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerCancel);
    window.addEventListener('keydown', this.onKeyDown, true);
    window.addEventListener('touchmove', this.onTouchMove, { passive: false });
    window.addEventListener('contextmenu', this.onContextMenu, true);
  }

  /** Ends the gesture; reports a cancelled drop when it was active. */
  public cancel(): void {
    const wasActive = this.active;
    this.dispose();
    if (wasActive) this.handlers.onEnd(true);
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (!this.active) this.handlers.onRelease?.();
    if (this.touchTimer) clearTimeout(this.touchTimer);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerCancel);
    window.removeEventListener('keydown', this.onKeyDown, true);
    window.removeEventListener('touchmove', this.onTouchMove);
    window.removeEventListener('contextmenu', this.onContextMenu, true);
  }

  private activate(): void {
    if (this.disposed || this.active) return;
    this.active = true;
    window.getSelection?.()?.removeAllRanges();
    this.handlers.onActivate();
  }

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) return;
    this.x = event.clientX;
    this.y = event.clientY;
    if (this.active) {
      this.handlers.onMove?.();
      return;
    }
    const distance = Math.hypot(this.x - this.startX, this.y - this.startY);
    if (this.pointerType === 'touch') {
      // Moving before the long press completes is a scroll, not a drag.
      if (distance > TOUCH_TOLERANCE) this.dispose();
    } else if (distance > MOUSE_THRESHOLD) {
      this.activate();
    }
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) return;
    this.x = event.clientX;
    this.y = event.clientY;
    const wasActive = this.active;
    this.dispose();
    if (!wasActive) return;
    // The click that ends a drag must not also select or open anything.
    window.addEventListener('click', stopClick, { capture: true, once: true });
    setTimeout(() => window.removeEventListener('click', stopClick, true), 0);
    this.handlers.onEnd(false);
  };

  private readonly onPointerCancel = (event: PointerEvent): void => {
    if (event.pointerId === this.pointerId) this.cancel();
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.active) {
      event.preventDefault();
      event.stopPropagation();
      this.cancel();
    }
  };

  private readonly onTouchMove = (event: TouchEvent): void => {
    if (this.active && event.cancelable) event.preventDefault();
  };

  private readonly onContextMenu = (event: Event): void => {
    // Long-press on touch devices would otherwise open the context menu.
    if (this.pointerType === 'touch') event.preventDefault();
  };
}
