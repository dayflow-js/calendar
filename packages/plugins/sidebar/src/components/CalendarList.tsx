import {
  CalendarType,
  AudioLines,
  ChevronRight,
  AlertCircle,
  Loader2,
  useLocale,
} from '@dayflow/core';
import { JSX } from 'preact';
import {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from 'preact/hooks';

interface CalendarListProps {
  calendars: CalendarType[];
  onToggleVisibility: (id: string, visible: boolean) => void;
  onReorder: (fromIndex: number, toIndex: number) => void | Promise<void>;
  onRename: (id: string, newName: string) => void;
  onContextMenu: (e: JSX.TargetedMouseEvent<HTMLElement>, id: string) => void;
  onGroupContextMenu: (
    e: JSX.TargetedMouseEvent<HTMLElement>,
    source: string
  ) => void;
  onGroupReorder: (groups: string[]) => void;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  activeContextMenuCalendarId?: string | null;
  activeContextMenuGroup?: string | null;
  isDraggable?: boolean;
  isEditable?: boolean;
  groupStatus?: Record<string, { isLoading: boolean }>;
  additionalGroups?: string[];
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
  const { t } = useLocale();
  const isVisible = calendar.isVisible !== false;
  const calendarColor = calendar.colors?.lineColor || '#3b82f6';
  const showIcon = Boolean(calendar.icon);
  const isDropTarget = dropTarget?.id === calendar.id;
  const isActive =
    activeContextMenuCalendarId === calendar.id || editingId === calendar.id;

  return (
    <li
      key={calendar.id}
      className='df-sidebar-list-item'
      onDragOver={e => onDragOver(e, calendar.id)}
      onDragLeave={onDragLeave}
      onDrop={() => onDrop(calendar)}
      onContextMenu={e => onContextMenu(e, calendar.id)}
    >
      {isDropTarget && dropTarget.position === 'top' && (
        <div className='df-sidebar-drop-indicator' data-position='top' />
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
        className='df-sidebar-drag-shell'
        data-dragging={draggedCalendarId === calendar.id ? 'true' : undefined}
        data-draggable={isDraggable ? 'true' : 'false'}
      >
        <div
          className='df-sidebar-row'
          data-active={isActive ? 'true' : undefined}
          title={calendar.name}
        >
          <input
            type='checkbox'
            className='df-calendar-checkbox df-sidebar-checkbox'
            style={
              {
                '--checkbox-color': calendarColor,
              } as Record<string, string | number>
            }
            checked={isVisible}
            aria-label={calendar.name || calendar.id}
            onChange={event =>
              onToggleVisibility(
                calendar.id,
                (event.target as HTMLInputElement).checked
              )
            }
          />
          {showIcon && (
            <span
              className='df-sidebar-icon-badge'
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
              className='df-sidebar-rename-input'
              aria-label={t('calendar')}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <>
              <span
                className='df-sidebar-name'
                onDblClick={() => onRenameStart(calendar)}
              >
                {calendar.name || calendar.id}
              </span>
              {calendar.subscription?.status === 'error' && (
                <AlertCircle
                  width={13}
                  height={13}
                  className='df-sidebar-status-icon df-sidebar-status-icon-error'
                  title={t('subscriptionLoadFailed')}
                  role='img'
                  aria-hidden={false}
                  aria-label={t('subscriptionLoadFailed')}
                />
              )}
              {calendar.subscription &&
                calendar.subscription.status === 'ready' && (
                  <AudioLines
                    width={13}
                    height={13}
                    className='df-sidebar-status-icon df-sidebar-status-icon-subscription'
                  />
                )}
            </>
          )}
        </div>
      </div>
      {isDropTarget && dropTarget.position === 'bottom' && (
        <div className='df-sidebar-drop-indicator' data-position='bottom' />
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
  onGroupContextMenu,
  onGroupReorder,
  editingId,
  setEditingId,
  activeContextMenuCalendarId,
  activeContextMenuGroup,
  isDraggable = true,
  isEditable = true,
  groupStatus = {},
  additionalGroups = [],
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
  const [draggedGroupSource, setDraggedGroupSource] = useState<string | null>(
    null
  );
  const [groupDropTarget, setGroupDropTarget] = useState<{
    source: string;
    position: 'top' | 'bottom';
  } | null>(null);
  const draggedGroupSourceRef = useRef<string | null>(null);
  const groupDropTargetRef = useRef<{
    source: string;
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
      if (!draggedCalendarId) return;
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

  // Group calendars by source; calendars without a source go into a null group
  const groups = useMemo(() => {
    const next = new Map<string | null, CalendarType[]>();

    // Persisted groups also define the preferred display order.
    additionalGroups.forEach(source => {
      if (!next.has(source)) next.set(source, []);
    });

    // Initialize with expected groups from status
    Object.keys(groupStatus).forEach(source => {
      if (!next.has(source)) next.set(source, []);
    });

    for (const calendar of calendars) {
      const key = calendar.source ?? null;
      if (!next.has(key)) next.set(key, []);
      next.get(key)!.push(calendar);
    }

    return next;
  }, [additionalGroups, calendars, groupStatus]);

  const groupEntries = useMemo(
    () =>
      Array.from(groups.entries()).filter(
        (entry): entry is [string, CalendarType[]] => entry[0] !== null
      ),
    [groups]
  );

  const handleGroupDragStart = useCallback(
    (source: string, e: JSX.TargetedDragEvent<HTMLButtonElement>) => {
      if (editingId || !isDraggable) {
        e.preventDefault();
        return;
      }

      e.stopPropagation();
      draggedGroupSourceRef.current = source;
      groupDropTargetRef.current = null;
      setDraggedGroupSource(source);
      setGroupDropTarget(null);
      if (e.dataTransfer) {
        e.dataTransfer.setData('application/x-dayflow-calendar-group', source);
        e.dataTransfer.effectAllowed = 'move';
      }
    },
    [editingId, isDraggable]
  );

  const handleGroupDragEnd = useCallback(() => {
    draggedGroupSourceRef.current = null;
    groupDropTargetRef.current = null;
    setDraggedGroupSource(null);
    setGroupDropTarget(null);
  }, []);

  const handleGroupDragOver = useCallback(
    (e: JSX.TargetedDragEvent<HTMLButtonElement>, targetSource: string) => {
      const draggedSource = draggedGroupSourceRef.current;
      if (!draggedSource) return;

      e.preventDefault();
      e.stopPropagation();
      if (draggedSource === targetSource) {
        groupDropTargetRef.current = null;
        setGroupDropTarget(null);
        return;
      }

      const rect = e.currentTarget.getBoundingClientRect();
      const nextDropTarget: {
        source: string;
        position: 'top' | 'bottom';
      } = {
        source: targetSource,
        position: e.clientY < rect.top + rect.height / 2 ? 'top' : 'bottom',
      };
      groupDropTargetRef.current = nextDropTarget;
      setGroupDropTarget(nextDropTarget);
    },
    []
  );

  const handleGroupDragLeave = useCallback(
    (e: JSX.TargetedDragEvent<HTMLButtonElement>) => {
      const relatedTarget = e.relatedTarget as Node | null;
      if (relatedTarget && e.currentTarget.contains(relatedTarget)) return;
      groupDropTargetRef.current = null;
      setGroupDropTarget(null);
    },
    []
  );

  const handleGroupDrop = useCallback(
    (e: JSX.TargetedDragEvent<HTMLButtonElement>, targetSource: string) => {
      const draggedSource = draggedGroupSourceRef.current;
      const currentDropTarget = groupDropTargetRef.current;
      if (!draggedSource || !currentDropTarget) return;

      e.preventDefault();
      e.stopPropagation();
      const nextGroups = groupEntries.map(([source]) => source);
      const fromIndex = nextGroups.indexOf(draggedSource);
      let toIndex = nextGroups.indexOf(targetSource);

      if (fromIndex === -1 || toIndex === -1) return;
      if (currentDropTarget.position === 'bottom') toIndex += 1;
      if (toIndex > fromIndex) toIndex -= 1;

      if (fromIndex !== toIndex) {
        const [movedGroup] = nextGroups.splice(fromIndex, 1);
        nextGroups.splice(toIndex, 0, movedGroup);
        onGroupReorder(nextGroups);
      }

      draggedGroupSourceRef.current = null;
      groupDropTargetRef.current = null;
      setDraggedGroupSource(null);
      setGroupDropTarget(null);
    },
    [groupEntries, onGroupReorder]
  );

  // Check if any calendar has a source or if we have expected groups
  const hasGroups = groups.size > (groups.has(null) ? 1 : 0);

  if (!hasGroups && !groups.has(null)) {
    return <div className='df-sidebar-list-shell' />;
  }

  if (!hasGroups) {
    // Flat list
    return (
      <div className='df-sidebar-list-shell'>
        <ul className='df-sidebar-list'>
          {groups.get(null)!.map(calendar => (
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

  return (
    <div className='df-sidebar-list-shell'>
      {/* Unsourced calendars first, no header */}
      {groups.has(null) && (
        <ul className='df-sidebar-list'>
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
      {groupEntries.map(([source, groupCalendars]) => {
        const isCollapsed = collapsedSources[source];
        const isLoading = groupStatus[source]?.isLoading;
        const isGroupDropTarget = groupDropTarget?.source === source;

        return (
          <div
            key={source}
            className='df-sidebar-source-group'
            data-dragging={draggedGroupSource === source ? 'true' : undefined}
          >
            {isGroupDropTarget && groupDropTarget.position === 'top' && (
              <div
                className='df-sidebar-group-drop-indicator'
                data-position='top'
              />
            )}
            <button
              type='button'
              className='df-sidebar-source-toggle'
              draggable={isDraggable && !editingId}
              data-draggable={isDraggable && !editingId ? 'true' : 'false'}
              data-active={
                activeContextMenuGroup === source ? 'true' : undefined
              }
              onClick={() => toggleSource(source)}
              onContextMenu={event => onGroupContextMenu(event, source)}
              onDragStart={event => handleGroupDragStart(source, event)}
              onDragEnd={handleGroupDragEnd}
              onDragOver={event => handleGroupDragOver(event, source)}
              onDragLeave={handleGroupDragLeave}
              onDrop={event => handleGroupDrop(event, source)}
            >
              <span className='df-sidebar-source-label'>{source}</span>
              {isLoading ? (
                <Loader2
                  width={13}
                  height={13}
                  className='df-sidebar-source-loading'
                />
              ) : (
                <ChevronRight
                  width={13}
                  height={13}
                  className='df-sidebar-source-chevron'
                  data-collapsed={isCollapsed ? 'true' : 'false'}
                />
              )}
            </button>
            <div
              className='df-sidebar-source-panel'
              data-collapsed={isCollapsed ? 'true' : 'false'}
            >
              <div className='df-sidebar-source-panel-inner'>
                <ul className='df-sidebar-list'>
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
            {isGroupDropTarget && groupDropTarget.position === 'bottom' && (
              <div
                className='df-sidebar-group-drop-indicator'
                data-position='bottom'
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
