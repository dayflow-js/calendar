import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight } from 'lucide-react';
import { useLocale } from '@/locale';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export const ContextMenu = React.forwardRef<HTMLDivElement, ContextMenuProps>(
  ({ x, y, onClose, children, className }, ref) => {
    const internalRef = useRef<HTMLDivElement>(null);

    // Sync external ref with internal ref
    const setRefs = (node: HTMLDivElement | null) => {
      (internalRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }
    };

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (internalRef.current && !internalRef.current.contains(event.target as Node)) {
          // Check if the click is within a submenu
          const target = event.target as HTMLElement;
          if (target.closest('[data-submenu-content]')) {
            return;
          }
          onClose();
        }
      };

      // Use mousedown to capture clicks outside immediately
      document.body.addEventListener('mousedown', handleClickOutside);

      // Also close on scroll or window resize
      const handleScrollOrResize = () => onClose();
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);

      return () => {
        document.body.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('scroll', handleScrollOrResize, true);
        window.removeEventListener('resize', handleScrollOrResize);
      };
    }, [onClose]);

    // Ensure menu stays within viewport
    const style: React.CSSProperties = {
      top: y,
      left: x,
    };

    return createPortal(
      <div
        ref={setRefs}
        className={`fixed z-50 min-w-32 overflow-visible rounded-md border border-slate-200 bg-white p-1 text-slate-950 shadow-md dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 animate-in fade-in-0 zoom-in-95 duration-100 ease-out ${className || ''}`}
        style={style}
        onContextMenu={(e) => e.preventDefault()}
        data-context-menu-root="true"
      >
        {children}
      </div>,
      document.body
    );
  }
);

ContextMenu.displayName = 'ContextMenu';

export const ContextMenuItem: React.FC<{
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
}> = ({ onClick, children, icon, danger, disabled }) => {
  return (
    <div
      className={`relative flex cursor-default select-none items-center rounded-sm px-3 py-0.5 text-[11px] outline-none transition-colors group
        ${disabled
          ? 'pointer-events-none opacity-50'
          : 'focus:bg-primary focus:text-white hover:bg-primary hover:text-white dark:focus:bg-primary dark:focus:text-white dark:hover:bg-primary dark:hover:text-white'}
        ${danger
          ? 'text-destructive focus:text-destructive-foreground focus:bg-destructive hover:bg-destructive hover:text-destructive-foreground'
          : 'text-slate-900 dark:text-slate-50'
        }`}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onClick();
      }}
      data-disabled={disabled}
    >
      {icon && <span className="mr-2 h-4 w-4">{icon}</span>}
      {children}
    </div>
  );
};

export const ContextMenuSeparator: React.FC = () => (
  <div className="-mx-1 my-1 h-px bg-slate-200 dark:bg-slate-800" />
);

export const ContextMenuLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="px-3 py-0.5 text-[11px] font-semibold text-slate-950 dark:text-slate-50">
    {children}
  </div>
);

// --- Submenu Components ---

interface ContextMenuSubProps {
  children: React.ReactNode;
}

export const ContextMenuSub: React.FC<ContextMenuSubProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          // @ts-ignore
          return React.cloneElement(child, { isOpen });
        }
        return child;
      })}
    </div>
  );
};

interface ContextMenuSubTriggerProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  isOpen?: boolean; // Injected by ContextMenuSub
}

export const ContextMenuSubTrigger: React.FC<ContextMenuSubTriggerProps> = ({ children, icon, isOpen }) => {
  return (
    <div
      className={`relative flex cursor-default select-none items-center rounded-sm px-3 py-0.5 text-[11px] outline-none transition-colors focus:bg-primary focus:text-white hover:bg-primary hover:text-white dark:focus:bg-primary dark:focus:text-white dark:hover:bg-primary dark:hover:text-white ${isOpen ? 'bg-primary text-white' : ''}`}
    >
      {icon && <span className="mr-2 h-4 w-4">{icon}</span>}
      <span className="grow text-left">{children}</span>
      <ChevronRight className={`ml-auto h-4 w-4 ${isOpen ? 'text-white opacity-100' : 'opacity-60'}`} />
    </div>
  );
};

interface ContextMenuSubContentProps {
  children: React.ReactNode;
  isOpen?: boolean; // Injected by ContextMenuSub
}

export const ContextMenuSubContent: React.FC<ContextMenuSubContentProps> = ({ children, isOpen }) => {
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
      data-submenu-content="true"
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

export const ContextMenuColorPicker: React.FC<{
  selectedColor?: string;
  onSelect: (color: string) => void;
  onCustomColor?: () => void;
}> = ({ selectedColor, onSelect, onCustomColor }) => {
  const { t } = useLocale();
  return (
    <div className="p-2">
      <div className="grid grid-cols-7 gap-2 p-1">
        {COLORS.map((color) => (
          <button
            key={color}
            type="button"
            className={`h-5 w-5 rounded-full border border-gray-200 dark:border-gray-600 hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary dark:focus:ring-offset-slate-800 ${selectedColor?.toLowerCase() === color.toLowerCase() ? 'ring-2 ring-offset-1 ring-primary dark:ring-offset-slate-800' : ''
              }`}
            style={{ backgroundColor: color }}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(color);
            }}
            title={color}
          />
        ))}
      </div>
      {onCustomColor && (
        <div
          className="mt-1 flex cursor-pointer items-center rounded-sm px-3 py-1.5 text-[11px] text-slate-700 hover:bg-primary hover:text-white dark:text-slate-200 dark:hover:bg-primary dark:hover:text-white transition-colors"
          onClick={(e) => {
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
