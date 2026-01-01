import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose, children, className }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // Use mousedown to capture clicks outside immediately
    document.addEventListener('mousedown', handleClickOutside);

    // Also close on scroll or window resize
    const handleScrollOrResize = () => onClose();
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [onClose]);

  // Ensure menu stays within viewport
  const style: React.CSSProperties = {
    top: y,
    left: x,
  };

  // Simple viewport adjustment logic could be added here if needed
  // For now rely on user providing reasonable x,y or allow CSS to handle basic constraints if possible,
  // but usually absolute positioning requires manual calculation for edge cases.

  return createPortal(
    <div
      ref={menuRef}
      className={`fixed z-50 min-w-32 overflow-hidden rounded-md border border-slate-200 bg-white p-1 text-slate-950 shadow-md dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 animate-in fade-in-0 zoom-in-95 duration-100 ease-out ${className || ''}`}
      style={style}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </div>,
    document.body
  );
};

export const ContextMenuItem: React.FC<{
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
  danger?: boolean;
}> = ({ onClick, children, icon, danger }) => {
  return (
    <div
      className={`relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-slate-100 focus:text-slate-900 data-disabled:pointer-events-none data-disabled:opacity-50 dark:focus:bg-slate-800 dark:focus:text-slate-50 hover:bg-slate-100 dark:hover:bg-slate-800 ${danger
        ? 'text-destructive focus:text-destructive-foreground focus:bg-destructive hover:bg-destructive hover:text-destructive-foreground'
        : 'text-slate-900 dark:text-slate-50'
        }`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
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
  <div className="px-2 py-1.5 text-sm font-semibold text-slate-950 dark:text-slate-50">
    {children}
  </div>
);

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
          className="mt-1 flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          onClick={(e) => {
            e.stopPropagation();
            onCustomColor();
          }}
        >
          Custom Color...
        </div>
      )}
    </div>
  );
};

export default ContextMenu;
