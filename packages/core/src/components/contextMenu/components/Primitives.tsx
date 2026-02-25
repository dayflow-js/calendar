import { cloneElement, isValidElement, ComponentChildren } from 'preact';
import { createPortal, forwardRef } from 'preact/compat';
import { useEffect, useRef, useState } from 'preact/hooks';

import { ChevronRight } from '@/components/common/Icons';
import { useLocale } from '@/locale';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  children: ComponentChildren;
  className?: string;
}

export const ContextMenu = forwardRef<HTMLDivElement, ContextMenuProps>(
  ({ x, y, onClose, children, className }, ref) => {
    const internalRef = useRef<HTMLDivElement>(null);

    // Sync external ref with internal ref
    const setRefs = (node: HTMLDivElement | null) => {
      internalRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref && 'current' in ref) {
        ref.current = node;
      }
    };

    useEffect(() => {
      const handleCloseAll = () => onClose();
      const handleClickOutside = (event: MouseEvent) => {
        if (
          internalRef.current &&
          !internalRef.current.contains(event.target as Node)
        ) {
          // Check if the click is within a submenu
          const target = event.target as HTMLElement;
          if (target.closest('[data-submenu-content]')) {
            return;
          }
          onClose();
        }
      };

      // Close other menus when this one mounts
      window.dispatchEvent(new CustomEvent('dayflow-close-all-menus'));

      // Listen for close-all event from other menus
      window.addEventListener('dayflow-close-all-menus', handleCloseAll);
      // Use mousedown to capture clicks outside immediately
      document.body.addEventListener('mousedown', handleClickOutside, {
        capture: true,
      });
      // Also capture right-clicks outside
      document.body.addEventListener('contextmenu', handleClickOutside, {
        capture: true,
      });

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      // Also close on scroll or window resize
      const handleScrollOrResize = () => onClose();
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);

      return () => {
        window.removeEventListener('dayflow-close-all-menus', handleCloseAll);
        document.body.removeEventListener('mousedown', handleClickOutside, {
          capture: true,
        });
        document.body.removeEventListener('contextmenu', handleClickOutside, {
          capture: true,
        });
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('scroll', handleScrollOrResize, true);
        window.removeEventListener('resize', handleScrollOrResize);
      };
    }, [onClose]);

    // Ensure menu stays within viewport
    const style: Record<string, number | string> = {
      top: y,
      left: x,
    };

    return createPortal(
      <div
        ref={setRefs}
        className={`fixed z-50 min-w-32 overflow-visible rounded-md border border-slate-200 bg-white p-1 text-slate-950 shadow-md dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 animate-in fade-in-0 zoom-in-95 duration-100 ease-out ${className || ''}`}
        style={style}
        onContextMenu={e => e.preventDefault()}
        data-context-menu-root='true'
      >
        {children}
      </div>,
      document.body
    );
  }
);

ContextMenu.displayName = 'ContextMenu';

export const ContextMenuItem = ({
  onClick,
  children,
  icon,
  danger,
  disabled,
}: {
  onClick: () => void;
  children: ComponentChildren;
  icon?: ComponentChildren;
  danger?: boolean;
  disabled?: boolean;
}) => (
  <div
    className={`relative flex cursor-default select-none items-center rounded-sm px-3 py-0.5 text-[12px] outline-none transition-colors group
        ${
          disabled
            ? 'pointer-events-none opacity-50'
            : 'focus:bg-primary focus:text-white hover:bg-primary hover:text-white dark:focus:bg-primary dark:focus:text-white dark:hover:bg-primary dark:hover:text-white'
        }
        ${
          danger
            ? 'text-destructive focus:text-destructive-foreground focus:bg-destructive hover:bg-destructive hover:text-destructive-foreground'
            : 'text-slate-900 dark:text-slate-50'
        }`}
    onClick={e => {
      e.stopPropagation();
      if (!disabled) onClick();
    }}
    data-disabled={disabled}
  >
    {icon && <span className='mr-2 h-4 w-4'>{icon}</span>}
    {children}
  </div>
);

export const ContextMenuSeparator = () => (
  <div className='-mx-1 my-1 h-px bg-slate-200 dark:bg-slate-800' />
);

export const ContextMenuLabel = ({
  children,
}: {
  children: ComponentChildren;
}) => (
  <div className='px-3 py-0.5 text-[12px] font-semibold text-slate-950 dark:text-slate-50'>
    {children}
  </div>
);

// --- Submenu Components ---
export const ContextMenuSub = ({
  children,
}: {
  children: ComponentChildren;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 100);
  };

  useEffect(
    () => () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    },
    []
  );

  return (
    <div
      className='relative'
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {(Array.isArray(children) ? children : [children]).map(child => {
        if (isValidElement(child)) {
          return cloneElement(child, { isOpen });
        }
        return child;
      })}
    </div>
  );
};

export const ContextMenuSubTrigger = ({
  children,
  icon,
  isOpen,
}: {
  children: ComponentChildren;
  icon?: ComponentChildren;
  isOpen?: boolean;
}) => (
  <div
    className={`relative flex cursor-default select-none items-center rounded-sm px-3 py-0.5 text-[12px] outline-none transition-colors focus:bg-primary focus:text-white hover:bg-primary hover:text-white dark:focus:bg-primary dark:focus:text-white dark:hover:bg-primary dark:hover:text-white ${isOpen ? 'bg-primary text-white' : ''}`}
  >
    {icon && <span className='mr-2 h-4 w-4'>{icon}</span>}
    <span className='grow text-left'>{children}</span>
    <ChevronRight
      className={`ml-auto h-4 w-4 ${isOpen ? 'text-white opacity-100' : 'opacity-60'}`}
    />
  </div>
);

export const ContextMenuSubContent = ({
  children,
  isOpen,
}: {
  children: ComponentChildren;
  isOpen?: boolean;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<'right' | 'left'>('right');

  useEffect(() => {
    if (isOpen && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const parentRect = ref.current.parentElement?.getBoundingClientRect();

      if (parentRect) {
        // Check if there is space on the right
        if (parentRect.right + rect.width > window.innerWidth) {
          setPosition('left');
        } else {
          setPosition('right');
        }
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={ref}
      className={`absolute top-0 z-50 min-w-32 whitespace-nowrap overflow-hidden rounded-md border border-slate-200 bg-white p-1 text-slate-950 shadow-md dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 animate-in fade-in-0 zoom-in-95 duration-100 ease-out`}
      style={{
        left: position === 'right' ? '100%' : 'auto',
        right: position === 'left' ? '100%' : 'auto',
        marginLeft: position === 'right' ? '0.25rem' : 0,
        marginRight: position === 'left' ? '0.25rem' : 0,
      }}
      data-submenu-content='true'
    >
      {children}
    </div>
  );
};

const COLORS = [
  '#ea426b',
  '#f19a38',
  '#f7cf46',
  '#83d754',
  '#51aaf2',
  '#b672d0',
  '#957e5e',
];

export const ContextMenuColorPicker = ({
  selectedColor,
  onSelect,
  onCustomColor,
}: {
  selectedColor?: string;
  onSelect: (color: string) => void;
  onCustomColor?: () => void;
}) => {
  const { t } = useLocale();
  return (
    <div>
      <div className='grid grid-cols-7 gap-2 p-1 px-3'>
        {COLORS.map(color => (
          <button
            key={color}
            type='button'
            className={`h-5 w-5 rounded-full border border-gray-200 dark:border-gray-600 hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary dark:focus:ring-offset-slate-800 ${
              selectedColor?.toLowerCase() === color.toLowerCase()
                ? 'ring-2 ring-offset-1 ring-primary dark:ring-offset-slate-800'
                : ''
            }`}
            style={{ backgroundColor: color }}
            onClick={e => {
              e.stopPropagation();
              onSelect(color);
            }}
            title={color}
          />
        ))}
      </div>
      {onCustomColor && (
        <div
          className='mt-1 flex cursor-pointer items-center rounded-sm px-3 py-0.5 text-[12px] text-slate-700 hover:bg-primary hover:text-white dark:text-slate-200 dark:hover:bg-primary dark:hover:text-white transition-colors'
          onClick={e => {
            e.stopPropagation();
            onCustomColor();
          }}
        >
          {t('customColor')}
        </div>
      )}
    </div>
  );
};
