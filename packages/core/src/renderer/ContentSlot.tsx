import { ComponentChildren } from 'preact';
import { useRef, useEffect, useContext, useState } from 'preact/hooks';

import { CustomRenderingContext } from './CustomRenderingContext';
import { CustomRenderingStore } from './CustomRenderingStore';

interface ContentSlotProps {
  generatorName: string; // e.g. 'eventContent'
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
  const [, setTick] = useState(0);

  if (!idRef.current) {
    idRef.current = generateId();
  }

  // Register/Unregister the container once
  useEffect(() => {
    if (!containerRef.current || !store) return;

    const id = idRef.current!;
    store.register({
      id,
      containerEl: containerRef.current,
      generatorName,
      generatorArgs, // Initial args
    });

    // Subscribe to store updates to re-render when overrides change
    const unsubscribe = store.subscribe(() => {
      setTick(t => t + 1);
    });

    return () => {
      store.unregister(id);
      unsubscribe();
    };
  }, [store]); // Only re-run if store changes

  // Update args when they change, without unregistering
  useEffect(() => {
    if (!store || !idRef.current) return;

    // Check if actually different to avoid redundant notifications
    const id = idRef.current;
    store.register({
      id,
      containerEl: containerRef.current!,
      generatorName,
      generatorArgs,
    });
  }, [generatorName, generatorArgs]);

  const isEventSlot = generatorName.startsWith('eventContent');
  const isSidebarSlot = generatorName === 'sidebar';
  const isOverridden = store?.isOverridden(generatorName);

  return (
    <div
      ref={containerRef}
      className={`df-content-slot ${isEventSlot || isSidebarSlot ? 'flex h-full flex-1 flex-col' : ''}`}
    >
      {!isOverridden && defaultContent}
    </div>
  );
}
