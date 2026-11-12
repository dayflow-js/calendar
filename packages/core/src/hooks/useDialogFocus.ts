import { RefObject } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

export interface UseDialogFocusOptions {
  /** Called when Escape is pressed while this dialog is the topmost one. */
  onClose?: () => void;
  /** Whether the dialog is currently shown. Defaults to `true`. */
  active?: boolean;
  /**
   * Keep Tab / Shift+Tab inside the dialog. Use for modal dialogs
   * (`aria-modal="true"`); leave off for non-modal popups.
   */
  trapFocus?: boolean;
  /** Move focus into the dialog when it opens. Defaults to `true`. */
  autoFocus?: boolean;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

export const getFocusableElements = (container: HTMLElement): HTMLElement[] =>
  Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  ).filter(el => !el.hasAttribute('inert') && !el.closest('[inert]'));

// Open dialogs, innermost last. Only the topmost one reacts to Escape/Tab so
// that nested dialogs (e.g. a confirm inside a detail dialog) close one at a time.
const dialogStack: { container: HTMLElement | null }[] = [];

const pushDialog = (entry: { container: HTMLElement | null }) => {
  // Effects run child-first, so a dialog mounted together with a dialog nested
  // inside it registers after it; keep the nested one on top regardless.
  const nestedIndex = dialogStack.findIndex(
    other =>
      !!entry.container &&
      !!other.container &&
      entry.container.contains(other.container)
  );
  if (nestedIndex === -1) dialogStack.push(entry);
  else dialogStack.splice(nestedIndex, 0, entry);
};

/**
 * Keyboard and focus behaviour for dialogs: closes on Escape, optionally traps
 * Tab inside the dialog, moves focus in on open and returns it to the element
 * that had focus before the dialog opened.
 */
export function useDialogFocus(
  containerRef: RefObject<HTMLElement>,
  {
    onClose,
    active = true,
    trapFocus = true,
    autoFocus = true,
  }: UseDialogFocusOptions = {}
): void {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!active || typeof document === 'undefined') return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const container = containerRef.current;
    const token = { container };
    pushDialog(token);

    if (autoFocus && container && !container.contains(document.activeElement)) {
      const focusable = getFocusableElements(container);
      const preferred =
        focusable.find(el => el.hasAttribute('autofocus')) ?? focusable[0];
      if (preferred) {
        preferred.focus();
      } else {
        if (!container.hasAttribute('tabindex')) {
          container.setAttribute('tabindex', '-1');
        }
        container.focus();
      }
    }

    // Popups a dialog opens (range picker, calendar dropdown, …) are portalled
    // to <body>, so they sit outside the container. Focus there belongs to the
    // popup: leave its keys alone instead of closing the dialog or yanking focus
    // back. Focus still on the opener (autoFocus off) counts as the dialog's.
    const isInOutsidePopup = (node: EventTarget | null) =>
      node instanceof Element &&
      node !== document.body &&
      node !== document.documentElement &&
      node !== previouslyFocused &&
      !!containerRef.current &&
      !containerRef.current.contains(node);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (dialogStack.at(-1) !== token) return;
      if (isInOutsidePopup(e.target)) return;

      if (e.key === 'Escape') {
        if (!onCloseRef.current) return;
        e.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (e.key !== 'Tab' || !trapFocus) return;
      const el = containerRef.current;
      if (!el) return;
      const focusable = getFocusableElements(el);
      if (focusable.length === 0) {
        e.preventDefault();
        el.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable.at(-1)!;
      const current = document.activeElement;
      const inside = !!current && el.contains(current);
      if (e.shiftKey && (current === first || !inside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (current === last || !inside)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      const index = dialogStack.indexOf(token);
      if (index !== -1) dialogStack.splice(index, 1);
      // Only pull focus back if it was inside the dialog (or dropped to body
      // because the dialog unmounted); don't steal it from elsewhere. Uses the
      // container captured on open: on unmount the ref is already cleared.
      const current = document.activeElement;
      const focusWasInside =
        !current ||
        current === document.body ||
        (container?.contains(current) ?? false);
      if (focusWasInside && previouslyFocused?.isConnected) {
        previouslyFocused.focus?.();
      }
    };
  }, [active, trapFocus, autoFocus]);
}
