import { ComponentChildren } from 'preact';
import {
  useRef,
  useEffect,
  useLayoutEffect,
  useContext,
  useState,
} from 'preact/hooks';

import { CustomRenderingContext } from './CustomRenderingContext';
import { CustomRenderingStore } from './CustomRenderingStore';

interface ContentSlotProps {
  generatorName: string | null; // e.g. 'eventContent'
  generatorArgs?: unknown; // e.g. { event, view }
  defaultContent?: ComponentChildren; // Preact vnode as fallback
  store?: CustomRenderingStore | null;
}

let guid = 0;
function generateId() {
  return 'df-slot-' + guid++;
}

/**
 * Preact component: Creates a placeholder <div> and registers it with CustomRenderingStore.
 * If a framework adapter (React/Vue) is present, it will portal its content into this <div>.
 * Otherwise, it displays defaultContent.
 */
export function ContentSlot({
  generatorName,
  generatorArgs,
  defaultContent,
  store: propStore,
}: ContentSlotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contextStore = useContext(CustomRenderingContext);
  const store = propStore || contextStore;
  const idRef = useRef<string | null>(null);
  const [isOverridden, setIsOverridden] = useState(() =>
    generatorName ? (store?.isOverridden(generatorName) ?? false) : false
  );

  if (!idRef.current) {
    idRef.current = generateId();
  }

  // Register/Unregister the container once, and subscribe only to override changes.
  // useLayoutEffect so registration happens synchronously before
  // the browser paints — eliminating the one-frame gap where the React portal
  // has no container and the slot appears blank.
  useLayoutEffect(() => {
    if (!containerRef.current || !store || !generatorName) return;

    const id = idRef.current!;
    store.register({
      id,
      containerEl: containerRef.current,
      generatorName,
      generatorArgs, // Initial args
    });

    // Subscribe only to override changes — not to every register/unregister.
    // This avoids the O(N²) cascade where each slot registration forces all
    // N ContentSlots to re-render.
    const unsubscribe = store.subscribeToOverrides(() => {
      setIsOverridden(store.isOverridden(generatorName));
    });

    return () => {
      store.unregister(id);
      unsubscribe();
    };
  }, [store, generatorName]); // Re-run if store or generatorName changes

  // Update args when they change, without unregistering
  useEffect(() => {
    if (!store || !idRef.current || !generatorName) return;

    const id = idRef.current;
    store.register({
      id,
      containerEl: containerRef.current!,
      generatorName,
      generatorArgs,
    });
  }, [generatorName, generatorArgs]);

  const isEventSlot = generatorName?.startsWith('eventContent');
  const isSidebarSlot = generatorName === 'sidebar';

  return (
    <div
      ref={containerRef}
      className={`df-content-slot ${isEventSlot || isSidebarSlot ? 'df-content-slot-stacked' : ''}`}
    >
      {!isOverridden && defaultContent}
    </div>
  );
}
