import { RefObject } from 'preact';
import { useLayoutEffect, useRef } from 'preact/hooks';

import { EventDetailPosition } from '@/types';

const STASH_TTL_MS = 10000;
const TRANSITION_MS = 220;
const TRANSITION_EASING = 'cubic-bezier(0.2, 0, 0, 1)';
// Position values below this threshold are the off-screen placeholder used by
// openDetailPanel while it measures the panel's final rect.
const PLACEHOLDER_POSITION_THRESHOLD = -1000;

interface PanelStash {
  rect: DOMRect;
  eventId: string;
  ts: number;
}

// Keyed by the calendar root element so multiple calendar instances on the same
// page don't blend their handoffs. Falls back to a shared sentinel when the
// calendar root isn't mounted yet (first render).
const stashByCalendar = new WeakMap<object, PanelStash>();
const cloneByCalendar = new WeakMap<object, HTMLElement>();
const cloneTimerByCalendar = new WeakMap<
  object,
  ReturnType<typeof setTimeout>
>();
const suppressNextCloneByCalendar = new WeakSet<object>();
const fallbackKey: object = Object.freeze({});

const getStashKey = (calendarRef: RefObject<HTMLElement | HTMLDivElement>) =>
  (calendarRef.current as object | null) ?? fallbackKey;

const isFreshHandoff = (stash: PanelStash, eventId: string) =>
  stash.eventId !== eventId && Date.now() - stash.ts < STASH_TTL_MS;

const isSamePanelPoint = (a: DOMRect, b: DOMRect) =>
  Math.abs(a.left - b.left) <= 1 && Math.abs(a.top - b.top) <= 1;

const makePositionFromRect = (rect: DOMRect): EventDetailPosition => ({
  top: rect.top,
  left: rect.left,
  eventHeight: 0,
  eventMiddleY: 0,
  isSunday: false,
});

const removePanelClone = (stashKey: object) => {
  const clone = cloneByCalendar.get(stashKey);
  clone?.remove();
  cloneByCalendar.delete(stashKey);

  const timer = cloneTimerByCalendar.get(stashKey);
  if (timer) {
    clearTimeout(timer);
    cloneTimerByCalendar.delete(stashKey);
  }
};

const createPanelClone = (
  stashKey: object,
  node: HTMLElement,
  rect: DOMRect
) => {
  if (typeof document === 'undefined') return;

  removePanelClone(stashKey);

  const clone = node.cloneNode(true) as HTMLElement;
  clone.setAttribute('aria-hidden', 'true');
  clone.dataset.eventDetailPanelHandoff = 'true';

  Object.assign(clone.style, {
    position: 'fixed',
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    minWidth: `${rect.width}px`,
    maxWidth: `${rect.width}px`,
    height: `${rect.height}px`,
    margin: '0',
    pointerEvents: 'none',
    transition: 'none',
    transform: getComputedStyle(node).transform,
    zIndex: '9999',
  });

  document.body.append(clone);
  cloneByCalendar.set(stashKey, clone);
  cloneTimerByCalendar.set(
    stashKey,
    setTimeout(() => {
      removePanelClone(stashKey);
    }, TRANSITION_MS + 120)
  );
};

export function getPanelHandoffStartPosition(
  calendarRef: RefObject<HTMLElement | HTMLDivElement>,
  eventId: string
): EventDetailPosition | null {
  const prev = stashByCalendar.get(getStashKey(calendarRef));
  if (!prev || !isFreshHandoff(prev, eventId)) return null;

  return makePositionFromRect(prev.rect);
}

export function clearPanelHandoffStartPosition(
  calendarRef: RefObject<HTMLElement | HTMLDivElement>
): void {
  const stashKey = getStashKey(calendarRef);
  suppressNextCloneByCalendar.add(stashKey);
  removePanelClone(stashKey);
  stashByCalendar.delete(stashKey);
}

interface UsePanelHandoffAnimationArgs {
  panelRef: RefObject<HTMLDivElement>;
  calendarRef: RefObject<HTMLElement | HTMLDivElement>;
  eventId: string;
  position: EventDetailPosition;
}

/**
 * Smoothly translates the event-detail panel from a previously-open panel's
 * position to its own when the user switches events without closing first.
 * Uses the FLIP technique: stash the outgoing panel's rect, then on the new
 * panel's mount apply an inverted transform and animate it back to zero.
 *
 * - Only animates when a stash from a *different* event exists within
 *   STASH_TTL_MS — close-then-reopen of the same event, or opening after a
 *   long pause, skips the animation.
 * - Skips the placeholder position the opener uses while measuring, so the
 *   animation runs against the real settled rect.
 */
export function usePanelHandoffAnimation({
  panelRef,
  calendarRef,
  eventId,
  position,
}: UsePanelHandoffAnimationArgs): void {
  const lastAnimatedEventRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    const node = panelRef.current;
    if (!node) return;

    // Wait until the opener has committed the real position.
    if (position.top < PLACEHOLDER_POSITION_THRESHOLD) return;

    const stashKey = getStashKey(calendarRef);
    const prev = stashByCalendar.get(stashKey);
    const isFirstSettleForEvent = lastAnimatedEventRef.current !== eventId;
    const toRect = node.getBoundingClientRect();
    removePanelClone(stashKey);
    setTimeout(() => {
      removePanelClone(stashKey);
    }, 0);

    // When a handoff starts from the previous panel's rect, leave the previous
    // stash intact until the real measured position arrives. Otherwise the
    // second render would think the current event is already settled and skip
    // the move animation.
    if (
      isFirstSettleForEvent &&
      prev &&
      isFreshHandoff(prev, eventId) &&
      isSamePanelPoint(prev.rect, toRect)
    ) {
      return;
    }

    if (isFirstSettleForEvent && prev && isFreshHandoff(prev, eventId)) {
      const dx = prev.rect.left - toRect.left;
      const dy = prev.rect.top - toRect.top;

      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        node.style.transformOrigin = 'top left';
        node.style.transition = 'none';
        node.style.willChange = 'transform';
        node.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
        // Force a synchronous reflow so the initial transform commits before
        // the next frame re-enables the transition.
        node.getBoundingClientRect();

        requestAnimationFrame(() => {
          const current = panelRef.current;
          if (!current) return;
          current.style.transition = `transform ${TRANSITION_MS}ms ${TRANSITION_EASING}`;
          current.style.transform = '';

          const onEnd = (e: TransitionEvent) => {
            if (e.propertyName !== 'transform') return;
            current.style.transition = '';
            current.style.transformOrigin = '';
            current.style.willChange = '';
            current.removeEventListener('transitionend', onEnd);
          };
          current.addEventListener('transitionend', onEnd);
        });
      }

      lastAnimatedEventRef.current = eventId;
    } else {
      lastAnimatedEventRef.current = eventId;
    }

    stashByCalendar.set(stashKey, {
      rect: toRect,
      eventId,
      ts: Date.now(),
    });
  }, [eventId, position.top, position.left, calendarRef, panelRef]);

  useLayoutEffect(
    () => () => {
      const current = panelRef.current;
      if (!current) return;

      const stashKey = getStashKey(calendarRef);
      const rect = current.getBoundingClientRect();
      if (rect.top < PLACEHOLDER_POSITION_THRESHOLD) return;

      if (suppressNextCloneByCalendar.has(stashKey)) {
        suppressNextCloneByCalendar.delete(stashKey);
        return;
      }

      stashByCalendar.set(stashKey, {
        rect,
        eventId,
        ts: Date.now(),
      });
      createPanelClone(stashKey, current, rect);
    },
    [eventId, calendarRef, panelRef]
  );
}
