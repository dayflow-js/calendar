import { cloneElement, isValidElement, ComponentChildren } from 'preact';
import { createPortal, forwardRef } from 'preact/compat';
import { useEffect, useRef, useState } from 'preact/hooks';

// Inline icon
interface IconProps {
  className?: string;
  width?: number;
  height?: number;
}

const ChevronRight = ({ className, width = 24, height = 24 }: IconProps) => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width={width}
    height={height}
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    stroke-width='2'
    stroke-linecap='round'
    stroke-linejoin='round'
    className={className}
  >
    <path d='m9 18 6-6-6-6' />
  </svg>
);

// ContextMenu
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
          const target = event.target as HTMLElement;
          if (target.closest('[data-submenu-content]')) return;
          onClose();
        }
      };

      window.dispatchEvent(new CustomEvent('dayflow-close-all-menus'));
      window.addEventListener('dayflow-close-all-menus', handleCloseAll);
      document.body.addEventListener('mousedown', handleClickOutside, {
        capture: true,
      });
      document.body.addEventListener('contextmenu', handleClickOutside, {
        capture: true,
      });

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);

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

    const style: Record<string, number | string> = { top: y, left: x };

    return createPortal(
      <div
        ref={setRefs}
        className={`df-portal df-context-menu df-context-menu-content${className ? ` ${className}` : ''}`}
        style={style}
        onContextMenu={e => e.preventDefault()}
        data-context-menu-root='true'
        role='menu'
      >
        {children}
      </div>,
      document.body
    );
  }
);

ContextMenu.displayName = 'ContextMenu';

// ContextMenuItem
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
    className='df-context-menu-item'
    onClick={e => {
      e.stopPropagation();
      if (!disabled) onClick();
    }}
    data-disabled={disabled}
    data-danger={danger}
    role='menuitem'
    tabIndex={disabled ? -1 : 0}
  >
    {icon && <span className='df-context-menu-item-icon'>{icon}</span>}
    {children}
  </div>
);

// ContextMenuSeparator
export const ContextMenuSeparator = () => (
  <div className='df-context-menu-separator' role='separator' />
);

// ContextMenuLabel
export const ContextMenuLabel = ({
  children,
}: {
  children: ComponentChildren;
}) => <div className='df-context-menu-label'>{children}</div>;

// ContextMenuSub
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
    timeoutRef.current = setTimeout(() => setIsOpen(false), 100);
  };

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    []
  );

  return (
    <div
      className='df-context-menu-sub'
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {(Array.isArray(children) ? children : [children]).map(child => {
        if (isValidElement(child)) return cloneElement(child, { isOpen });
        return child;
      })}
    </div>
  );
};

// ContextMenuSubTrigger

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
    className='df-context-menu-sub-trigger'
    data-open={isOpen}
    role='menuitem'
    tabIndex={0}
  >
    {icon && <span className='df-context-menu-sub-icon'>{icon}</span>}
    <span className='df-context-menu-sub-label'>{children}</span>
    <ChevronRight className='df-context-menu-sub-chevron' />
  </div>
);

// ContextMenuSubContent

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
        setPosition(
          parentRect.right + rect.width > window.innerWidth ? 'left' : 'right'
        );
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={ref}
      className='df-portal df-context-menu df-context-menu-sub-content'
      data-position={position}
      data-submenu-content='true'
      role='menu'
    >
      {children}
    </div>
  );
};

// ContextMenuColorPicker

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
  customColorLabel = 'Custom Color',
}: {
  selectedColor?: string;
  onSelect: (color: string) => void;
  onCustomColor?: () => void;
  customColorLabel?: string;
}) => (
  <div className='df-context-menu-color-picker'>
    <div className='df-context-menu-color-grid'>
      {COLORS.map(color => (
        <button
          key={color}
          type='button'
          className='df-context-menu-color-swatch'
          data-selected={
            selectedColor?.toLowerCase() === color.toLowerCase()
              ? 'true'
              : undefined
          }
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
      <button
        type='button'
        className='df-context-menu-custom-color'
        onClick={e => {
          e.stopPropagation();
          onCustomColor();
        }}
      >
        {customColorLabel}
      </button>
    )}
  </div>
);
