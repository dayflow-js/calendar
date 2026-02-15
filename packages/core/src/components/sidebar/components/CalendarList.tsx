import { useState, useCallback, useRef, useEffect } from 'preact/hooks';
import { CalendarType } from '../../../types';

interface CalendarListProps {
  calendars: CalendarType[];
  onToggleVisibility: (id: string, visible: boolean) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRename: (id: string, newName: string) => void;
  onContextMenu: (e: any, id: string) => void;
  onColorClick?: (e: any, id: string) => void;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  activeContextMenuCalendarId?: string | null;
  isDraggable?: boolean;
  isEditable?: boolean;
}

const getCalendarInitials = (calendar: CalendarType): string => {
  if (calendar.icon) {
    return calendar.icon;
  }
  const name = calendar.name || calendar.id;
  return name.charAt(0).toUpperCase();
};

export const CalendarList = ({
  calendars,
  onToggleVisibility,
  onReorder,
  onRename,
  onContextMenu,
  onColorClick,
  editingId,
  setEditingId,
  activeContextMenuCalendarId,
  isDraggable = true,
  isEditable = true,
}: CalendarListProps) => {
  const [editingName, setEditingName] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  const isProcessedRef = useRef(false);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [draggedCalendarId, setDraggedCalendarId] = useState<string | null>(
    null
  );
  const [dropTarget, setDropTarget] = useState<{
    id: string;
    position: 'top' | 'bottom';
  } | null>(null);

  const handleDragStart = useCallback(
    (calendar: CalendarType, e: any) => {
      // Prevent dragging when editing or not draggable
      if (editingId || !isDraggable) {
        e.preventDefault();
        return;
      }
      setIsDragging(true);
      setDraggedCalendarId(calendar.id);

      // Store calendar data for drop handling
      const dragData = {
        calendarId: calendar.id,
        calendarName: calendar.name,
        calendarColors: calendar.colors,
        calendarIcon: calendar.icon,
      };
      e.dataTransfer.setData(
        'application/x-dayflow-calendar',
        JSON.stringify(dragData)
      );
      e.dataTransfer.effectAllowed = 'copy';
    },
    [editingId]
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setDraggedCalendarId(null);
    setDropTarget(null);
  }, []);

  const handleDragOver = useCallback(
    (e: any, targetId: string) => {
      e.preventDefault();
      if (draggedCalendarId === targetId) {
        setDropTarget(null);
        return;
      }

      const targetIndex = calendars.findIndex(c => c.id === targetId);
      const isLast = targetIndex === calendars.length - 1;

      const rect = e.currentTarget.getBoundingClientRect();
      const isTopHalf = e.clientY < rect.top + rect.height / 2;

      if (isLast) {
        setDropTarget({
          id: targetId,
          position: isTopHalf ? 'top' : 'bottom',
        });
      } else {
        setDropTarget({
          id: targetId,
          position: 'top',
        });
      }
    },
    [draggedCalendarId, calendars]
  );

  const handleDragLeave = useCallback(() => {
    setDropTarget(null);
  }, []);

  const handleDrop = useCallback(
    (targetCalendar: CalendarType) => {
      if (!draggedCalendarId || !dropTarget) return;
      if (draggedCalendarId === targetCalendar.id) return;

      const fromIndex = calendars.findIndex(c => c.id === draggedCalendarId);
      let toIndex = calendars.findIndex(c => c.id === targetCalendar.id);

      // Adjust target index based on position
      if (dropTarget.position === 'bottom') {
        toIndex += 1;
      }

      // Adjust for removal of the item
      if (toIndex > fromIndex) {
        toIndex -= 1;
      }

      if (fromIndex !== -1 && toIndex !== -1) {
        onReorder(fromIndex, toIndex);
      }
      setDropTarget(null);
    },
    [draggedCalendarId, dropTarget, calendars, onReorder]
  );

  const handleRenameStart = useCallback(
    (calendar: CalendarType) => {
      if (!isEditable) return;
      isProcessedRef.current = false;
      setEditingId(calendar.id);
      setEditingName(calendar.name);
    },
    [setEditingId, isEditable]
  );

  const handleRenameChange = useCallback((e: any) => {
    setEditingName(e.target.value);
  }, []);

  const handleRenameSave = useCallback(() => {
    if (isProcessedRef.current) return;
    isProcessedRef.current = true;

    if (editingId && editingName.trim()) {
      const calendar = calendars.find(c => c.id === editingId);
      if (calendar && calendar.name !== editingName.trim()) {
        onRename(editingId, editingName.trim());
      }
    }
    setEditingId(null);
    setEditingName('');
  }, [editingId, editingName, calendars, onRename, setEditingId]);

  const handleRenameCancel = useCallback(() => {
    if (isProcessedRef.current) return;
    isProcessedRef.current = true;

    setEditingId(null);
    setEditingName('');
  }, [setEditingId]);

  const handleRenameKeyDown = useCallback(
    (e: any) => {
      if (e.key === 'Enter') {
        handleRenameSave();
      } else if (e.key === 'Escape') {
        handleRenameCancel();
      }
    },
    [handleRenameSave, handleRenameCancel]
  );

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  useEffect(() => {
    if (editingId) {
      const calendar = calendars.find(c => c.id === editingId);
      if (calendar) {
        setEditingName(calendar.name);
      }
    }
  }, [editingId, calendars]);

  return (
    <div className="df-calendar-list flex-1 overflow-y-auto px-2 pb-3">
      <ul className="space-y-1 relative">
        {calendars.map(calendar => {
          const isVisible = calendar.isVisible !== false;
          const calendarColor = calendar.colors?.lineColor || '#3b82f6';
          const showIcon = Boolean(calendar.icon);
          const isDropTarget = dropTarget?.id === calendar.id;
          const isActive =
            activeContextMenuCalendarId === calendar.id ||
            editingId === calendar.id;

          return (
            <li
              key={calendar.id}
              className="df-calendar-list-item relative"
              onDragOver={e => handleDragOver(e, calendar.id)}
              onDragLeave={handleDragLeave}
              onDrop={() => handleDrop(calendar)}
              onContextMenu={e => onContextMenu(e, calendar.id)}
            >
              {isDropTarget && dropTarget.position === 'top' && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary z-10 pointer-events-none" />
              )}
              <div
                draggable={isDraggable && !editingId}
                onDragStart={e => handleDragStart(calendar, e)}
                onDragEnd={handleDragEnd}
                className={`rounded transition ${
                  draggedCalendarId === calendar.id ? 'opacity-50' : ''
                } ${isDraggable ? 'cursor-grab' : 'cursor-default'}`}
              >
                <div
                  className={`group flex items-center rounded px-2 py-2 transition hover:bg-gray-100 dark:hover:bg-slate-800 ${isActive ? 'bg-gray-100 dark:bg-slate-800' : ''}`}
                  title={calendar.name}
                >
                  <input
                    type="checkbox"
                    className="calendar-checkbox cursor-pointer shrink-0"
                    style={
                      {
                        '--checkbox-color': calendarColor,
                      } as any
                    }
                    checked={isVisible}
                    onChange={event =>
                      onToggleVisibility(
                        calendar.id,
                        (event.target as HTMLInputElement).checked
                      )
                    }
                    onClick={e => {
                      if (onColorClick && isVisible) {
                        e.preventDefault();
                        onColorClick(e, calendar.id);
                      }
                    }}
                  />
                  {showIcon && (
                    <span
                      className="ml-2 flex h-5 w-5 shrink-0 items-center justify-center text-xs font-semibold text-white"
                      aria-hidden="true"
                    >
                      {getCalendarInitials(calendar)}
                    </span>
                  )}
                  {editingId === calendar.id ? (
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editingName}
                      onChange={e =>
                        setEditingName((e.target as HTMLInputElement).value)
                      }
                      onBlur={handleRenameSave}
                      onKeyDown={handleRenameKeyDown}
                      className="ml-2 flex-1 min-w-0 h-5 rounded bg-white px-0 py-0 text-sm text-gray-900 focus:outline-none dark:bg-slate-700 dark:text-gray-100"
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <span
                      className="flex-1 pl-1 truncate text-sm text-gray-700 group-hover:text-gray-900 dark:text-gray-200 dark:group-hover:text-white ml-2"
                      onDblClick={() => handleRenameStart(calendar)}
                    >
                      {calendar.name || calendar.id}
                    </span>
                  )}
                </div>
              </div>
              {isDropTarget && dropTarget.position === 'bottom' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary z-10 pointer-events-none" />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
