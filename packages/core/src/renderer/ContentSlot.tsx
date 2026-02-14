import { h } from 'preact';
import { useRef, useEffect, useContext } from 'preact/hooks';
import { CustomRenderingContext } from './CustomRenderingContext';

interface ContentSlotProps {
  generatorName: string;   // e.g. 'eventContent'
  generatorArgs?: any;      // e.g. { event, view }
  defaultContent?: any;     // Preact vnode as fallback
  store?: any;
}

let guid = 0;
function generateId() {
  return 'df-slot-' + (guid++);
}

/**
 * Preact component: Creates a placeholder <div> and registers it with CustomRenderingStore.
 * If a framework adapter (React/Vue) is present, it will portal its content into this <div>.
 * Otherwise, it displays defaultContent.
 */
export function ContentSlot({ generatorName, generatorArgs, defaultContent, store: propStore }: ContentSlotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contextStore = useContext(CustomRenderingContext);
  const store = propStore || contextStore;
  const idRef = useRef<string | null>(null);

  if (!idRef.current) {
    idRef.current = generateId();
  }

  useEffect(() => {
    if (!containerRef.current || !store) return;

    const id = idRef.current!;
    store.register({
      id,
      containerEl: containerRef.current,
      generatorName,
      generatorArgs,
    });

    return () => store.unregister(id);
  }, [store, generatorName, JSON.stringify(generatorArgs)]); // Use JSON.stringify for deep comparison of args if needed

  const isEventSlot = generatorName === 'eventContent';
  const isOverridden = store?.isOverridden(generatorName);

  return (
    <div
      ref={containerRef}
      className={`df-content-slot ${isEventSlot ? 'flex-1 flex flex-col h-full' : ''}`}
    >
      {!isOverridden && defaultContent}
    </div>
  );
}
