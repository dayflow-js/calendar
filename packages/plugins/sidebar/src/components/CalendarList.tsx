import {
  CalendarType,
  AudioLines,
  ChevronDown,
  AlertCircle,
} from '@dayflow/core';
import { JSX } from 'preact';
import { useState, useCallback, useRef, useEffect } from 'preact/hooks';

interface CalendarListProps {
  calendars: CalendarType[];
  onToggleVisibility: (id: string, visible: boolean) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRename: (id: string, newName: string) => void;
  onContextMenu: (e: JSX.TargetedMouseEvent<HTMLElement>, id: string) => void;
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

interface CalendarItemProps {
  calendar: CalendarType;
  isDraggable: boolean;
  isEditable: boolean;
  editingId: string | null;
  editingName: string;
  setEditingName: (name: string) => void;
  editInputRef: preact.RefObject<HTMLInputElement>;
  isProcessedRef: preact.RefObject<boolean>;
  draggedCalendarId: string | null;
  dropTarget: { id: string; position: 'top' | 'bottom' } | null;
  activeContextMenuCalendarId?: string | null;
  onDragStart: (
    calendar: CalendarType,
    e: JSX.TargetedDragEvent<HTMLElement>
  ) => void;
  onDragEnd: () => void;
  onDragOver: (e: JSX.TargetedDragEvent<HTMLElement>, targetId: string) => void;
  onDragLeave: () => void;
  onDrop: (targetCalendar: CalendarType) => void;
  onContextMenu: (e: JSX.TargetedMouseEvent<HTMLElement>, id: string) => void;
  onToggleVisibility: (id: string, visible: boolean) => void;
  onRenameStart: (calendar: CalendarType) => void;
  onRenameSave: () => void;
  onRenameKeyDown: (e: JSX.TargetedKeyboardEvent<HTMLInputElement>) => void;
  setEditingId: (id: string | null) => void;
}

const CalendarItem = ({
  calendar,
  isDraggable,
  isEditable: _isEditable,
  editingId,
  editingName,
  setEditingName,
  editInputRef,
  draggedCalendarId,
  dropTarget,
  activeContextMenuCalendarId,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onContextMenu,
  onToggleVisibility,
  onRenameStart,
  onRenameSave,
  onRenameKeyDown,
}: CalendarItemProps) => {
  const isVisible = calendar.isVisible !== false;
  const calendarColor = calendar.colors?.lineColor || '#3b82f6';
  const showIcon = Boolean(calendar.icon);
  const isDropTarget = dropTarget?.id === calendar.id;
  const isActive =
    activeContextMenuCalendarId === calendar.id || editingId === calendar.id;

  return (
    <li
      key={calendar.id}
      className='df-sidebar__list-item'
      onDragOver={e => onDragOver(e, calendar.id)}
      onDragLeave={onDragLeave}
      onDrop={() => onDrop(calendar)}
      onContextMenu={e => onContextMenu(e, calendar.id)}
    >
      {isDropTarget && dropTarget.position === 'top' && (
        <div className='df-sidebar__drop-indicator' data-position='top' />
      )}
      <div
        draggable={
          isDraggable &&
          !editingId &&
          !calendar.readOnly &&
          !calendar.subscription
        }
        onDragStart={e => onDragStart(calendar, e)}
        onDragEnd={onDragEnd}
        className='df-sidebar__drag-shell'
        data-dragging={draggedCalendarId === calendar.id ? 'true' : undefined}
        data-draggable={isDraggable ? 'true' : 'false'}
      >
        <div
          className='df-sidebar__row'
          data-active={isActive ? 'true' : undefined}
          title={calendar.name}
        >
          <input
            type='checkbox'
            className='df-calendar-checkbox df-sidebar__checkbox'
            style={
              {
                '--checkbox-color': calendarColor,
              } as Record<string, string | number>
            }
            checked={isVisible}
            onChange={event =>
              onToggleVisibility(
                calendar.id,
                (event.target as HTMLInputElement).checked
              )
            }
          />
          {showIcon && (
            <span
              className='df-sidebar__icon-badge'
              style={{ backgroundColor: calendarColor }}
              aria-hidden='true'
            >
              {getCalendarInitials(calendar)}
            </span>
          )}
          {editingId === calendar.id ? (
            <input
              ref={editInputRef}
              type='text'
              value={editingName}
              onChange={e =>
                setEditingName((e.target as HTMLInputElement).value)
              }
              onBlur={onRenameSave}
              onKeyDown={onRenameKeyDown}
              className='df-sidebar__rename-input'
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <>
              <span
                className='df-sidebar__name'
                onDblClick={() => onRenameStart(calendar)}
              >
                {calendar.name || calendar.id}
              </span>
              {calendar.subscription?.status === 'error' && (
                <AlertCircle
                  width={13}
                  height={13}
                  className='df-sidebar__status-icon df-sidebar__status-icon--error'
                  title='Failed to load subscription'
                />
              )}
              {calendar.subscription &&
                calendar.subscription.status === 'ready' && (
                  <AudioLines
                    width={13}
                    height={13}
                    className='df-sidebar__status-icon df-sidebar__status-icon--subscription'
                  />
                )}
            </>
          )}
        </div>
      </div>
      {isDropTarget && dropTarget.position === 'bottom' && (
        <div className='df-sidebar__drop-indicator' data-position='bottom' />
      )}
    </li>
  );
};

export const CalendarList = ({
  calendars,
  onToggleVisibility,
  onReorder,
  onRename,
  onContextMenu,
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
  const [draggedCalendarId, setDraggedCalendarId] = useState<string | null>(
    null
  );
  const [dropTarget, setDropTarget] = useState<{
    id: string;
    position: 'top' | 'bottom';
  } | null>(null);

  // Collapsed sources state
  const [collapsedSources, setCollapsedSources] = useState<
    Record<string, boolean>
  >({});

  const handleDragStart = useCallback(
    (calendar: CalendarType, e: JSX.TargetedDragEvent<HTMLElement>) => {
      if (editingId || !isDraggable) {
        e.preventDefault();
        return;
      }
      setDraggedCalendarId(calendar.id);

      const dragData = {
        calendarId: calendar.id,
        calendarName: calendar.name,
        calendarColors: calendar.colors,
        calendarIcon: calendar.icon,
      };
      if (e.dataTransfer) {
        e.dataTransfer.setData(
          'application/x-dayflow-calendar',
          JSON.stringify(dragData)
        );
        e.dataTransfer.effectAllowed = 'copy';
      }
    },
    [editingId, isDraggable]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedCalendarId(null);
    setDropTarget(null);
  }, []);

  const handleDragOver = useCallback(
    (e: JSX.TargetedDragEvent<HTMLElement>, targetId: string) => {
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

      if (dropTarget.position === 'bottom') {
        toIndex += 1;
      }

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
    (e: JSX.TargetedKeyboardEvent<HTMLInputElement>) => {
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

  const toggleSource = useCallback((source: string) => {
    setCollapsedSources(prev => ({ ...prev, [source]: !prev[source] }));
  }, []);

  // Shared item props (excludes per-item fields)
  const sharedItemProps = {
    isDraggable,
    isEditable,
    editingId,
    editingName,
    setEditingName,
    editInputRef,
    isProcessedRef,
    draggedCalendarId,
    dropTarget,
    activeContextMenuCalendarId,
    onDragStart: handleDragStart,
    onDragEnd: handleDragEnd,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
    onContextMenu,
    onToggleVisibility,
    onRenameStart: handleRenameStart,
    onRenameSave: handleRenameSave,
    onRenameKeyDown: handleRenameKeyDown,
    setEditingId,
  };

  // Check if any calendar has a source
  const hasSources = calendars.some(c => c.source);

  if (!hasSources) {
    // Flat list (original behaviour)
    return (
      <div className='df-sidebar__list-shell'>
        <ul className='df-sidebar__list'>
          {calendars.map(calendar => (
            <CalendarItem
              key={calendar.id}
              calendar={calendar}
              {...sharedItemProps}
            />
          ))}
        </ul>
      </div>
    );
  }

  // Group calendars by source; calendars without a source go into a null group
  const groups = new Map<string | null, CalendarType[]>();
  for (const calendar of calendars) {
    const key = calendar.source ?? null;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(calendar);
  }

  return (
    <div className='df-sidebar__list-shell'>
      {/* Unsourced calendars first, no header */}
      {groups.has(null) && (
        <ul className='df-sidebar__list'>
          {groups.get(null)!.map(calendar => (
            <CalendarItem
              key={calendar.id}
              calendar={calendar}
              {...sharedItemProps}
            />
          ))}
        </ul>
      )}

      {/* Sourced calendar groups */}
      {Array.from(groups.entries())
        .filter(([source]) => source !== null)
        .map(([source, groupCalendars]) => {
          const isCollapsed = collapsedSources[source!];
          return (
            <div key={source} className='df-sidebar__source-group'>
              <button
                type='button'
                className='df-sidebar__source-toggle'
                onClick={() => toggleSource(source!)}
              >
                <span className='df-sidebar__source-label'>{source}</span>
                <ChevronDown
                  width={13}
                  height={13}
                  className='df-sidebar__source-chevron'
                  data-collapsed={isCollapsed ? 'true' : 'false'}
                />
              </button>
              <div
                className='df-sidebar__source-panel'
                data-collapsed={isCollapsed ? 'true' : 'false'}
              >
                <div className='df-sidebar__source-panel-inner'>
                  <ul className='df-sidebar__list'>
                    {groupCalendars.map(calendar => (
                      <CalendarItem
                        key={calendar.id}
                        calendar={calendar}
                        {...sharedItemProps}
                      />
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
    </div>
  );
};
