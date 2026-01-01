import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarSidebarRenderProps, CalendarType } from '../../types';
import ContextMenu, {
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuLabel,
  ContextMenuColorPicker,
} from '../common/ContextMenu';
import { getCalendarColorsForHex } from '../../core/calendarRegistry';
import { CreateCalendarDialog } from '../common/CreateCalendarDialog';
import { SketchPicker } from 'react-color';
import { generateUniKey } from '../../utils/helpers';
// common component
import { SidebarHeader } from './components/SidebarHeader';
import { CalendarList } from './components/CalendarList';
import { MiniCalendar } from '../common/MiniCalendar';
import { MergeMenuItem } from './components/MergeMenuItem';
import { MergeCalendarDialog } from './components/MergeCalendarDialog';
import { DeleteCalendarDialog } from './components/DeleteCalendarDialog';

const COLORS = [
  '#ea426b',
  '#f19a38',
  '#f7cf46',
  '#83d754',
  '#51aaf2',
  '#b672d0',
  '#957e5e',
];

const DefaultCalendarSidebar: React.FC<CalendarSidebarRenderProps> = ({
  app,
  calendars,
  toggleCalendarVisibility,
  isCollapsed,
  setCollapsed,
  renderCalendarContextMenu,
  createCalendarMode = 'inline',
  renderCreateCalendarDialog,
}) => {
  const currentDate = app.getCurrentDate();
  const visibleMonthDate = app.getVisibleMonth();
  const visibleYear = visibleMonthDate.getFullYear();
  const visibleMonthIndex = visibleMonthDate.getMonth();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCalendarId, setEditingCalendarId] = useState<string | null>(null);

  // Visible Month State
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => {
    return new Date(visibleYear, visibleMonthIndex, 1);
  });

  useEffect(() => {
    setVisibleMonth(prev => {
      if (
        prev.getFullYear() === visibleYear &&
        prev.getMonth() === visibleMonthIndex
      ) {
        return prev;
      }
      return new Date(visibleYear, visibleMonthIndex, 1);
    });
  }, [visibleYear, visibleMonthIndex]);

  const handleMonthChange = useCallback(
    (offset: number) => {
      setVisibleMonth(prev => {
        const next = new Date(prev.getFullYear(), prev.getMonth() + offset, 1);
        app.setVisibleMonth(next);
        return next;
      });
    },
    [app]
  );

  const handleDateSelect = useCallback(
    (date: Date) => {
      const nextDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      );
      app.setCurrentDate(nextDate);
      setVisibleMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
    },
    [app]
  );

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    calendarId: string;
  } | null>(null);

  const [customColorPicker, setCustomColorPicker] = useState<{
    x: number;
    y: number;
    calendarId: string;
    initialColor: string;
    currentColor: string;
  } | null>(null);

  // Merge Calendar State
  const [mergeState, setMergeState] = useState<{ sourceId: string; targetId: string } | null>(null);

  // Delete Calendar State
  const [deleteState, setDeleteState] = useState<{
    calendarId: string;
    step: 'initial' | 'confirm_delete';
  } | null>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent, calendarId: string) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      calendarId,
    });
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleDeleteCalendar = useCallback(() => {
    if (contextMenu) {
      setDeleteState({ calendarId: contextMenu.calendarId, step: 'initial' });
      handleCloseContextMenu();
    }
  }, [contextMenu, handleCloseContextMenu]);

  const handleColorSelect = useCallback((color: string) => {
    if (contextMenu) {
      const { colors, darkColors } = getCalendarColorsForHex(color);
      app.updateCalendar(contextMenu.calendarId, {
        colors,
        darkColors
      });
      handleCloseContextMenu();
    }
  }, [app, contextMenu, handleCloseContextMenu]);

  const handleCustomColor = useCallback(() => {
    if (contextMenu) {
      const calendar = calendars.find(c => c.id === contextMenu.calendarId);
      if (calendar) {
        setCustomColorPicker({
          x: contextMenu.x,
          y: contextMenu.y,
          calendarId: contextMenu.calendarId,
          initialColor: calendar.colors.lineColor,
          currentColor: calendar.colors.lineColor,
        });
      }
      handleCloseContextMenu();
    }
  }, [contextMenu, calendars, handleCloseContextMenu]);

  const handleMergeSelect = useCallback((targetId: string) => {
    if (contextMenu) {
      setMergeState({
        sourceId: contextMenu.calendarId,
        targetId
      });
      handleCloseContextMenu();
    }
  }, [contextMenu, handleCloseContextMenu]);

  const handleMergeConfirm = useCallback(() => {
    if (mergeState) {
      const { sourceId, targetId } = mergeState;
      app.mergeCalendars(sourceId, targetId);
      setMergeState(null);
    }
  }, [app, mergeState]);

  const handleConfirmDelete = useCallback(() => {
    if (deleteState) {
      app.deleteCalendar(deleteState.calendarId);
      setDeleteState(null);
    }
  }, [app, deleteState]);

  const handleDeleteMergeSelect = useCallback((targetId: string) => {
    if (deleteState) {
      setMergeState({
        sourceId: deleteState.calendarId,
        targetId
      });
      setDeleteState(null);
    }
  }, [deleteState]);

  const handleCreateCalendar = useCallback(() => {
    if (createCalendarMode === 'modal') {
      setShowCreateDialog(true);
      return;
    }

    // Inline mode
    const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    const { colors, darkColors } = getCalendarColorsForHex(randomColor);
    const newId = generateUniKey();

    const newCalendar: CalendarType = {
      id: newId,
      name: 'Untitled',
      colors,
      darkColors,
      isVisible: true,
      isDefault: false,
    };

    app.createCalendar(newCalendar);
    setEditingCalendarId(newId);

  }, [app, createCalendarMode]);

  const sourceCalendarName = mergeState ? calendars.find(c => c.id === mergeState.sourceId)?.name || 'Unknown' : '';
  const targetCalendarName = mergeState ? calendars.find(c => c.id === mergeState.targetId)?.name || 'Unknown' : '';
  const deleteCalendarName = deleteState ? calendars.find(c => c.id === deleteState.calendarId)?.name || 'Unknown' : '';

  return (
    <div className="flex h-full flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900">
      <SidebarHeader
        isCollapsed={isCollapsed}
        onCollapseToggle={() => setCollapsed(!isCollapsed)}
        onAddCalendar={handleCreateCalendar}
      />

      {!isCollapsed ? (
        <>
          <CalendarList
            calendars={calendars}
            onToggleVisibility={toggleCalendarVisibility}
            onReorder={app.reorderCalendars}
            onRename={(id, newName) => app.updateCalendar(id, { name: newName })}
            onContextMenu={handleContextMenu}
            editingId={editingCalendarId}
            setEditingId={setEditingCalendarId}
            activeContextMenuCalendarId={contextMenu?.calendarId}
          />

          <div className='border-t border-gray-200'>
            <MiniCalendar
              visibleMonth={visibleMonth}
              currentDate={currentDate}
              showHeader
              onMonthChange={handleMonthChange}
              onDateSelect={handleDateSelect}
            />
          </div>
        </>
      ) : (
        <CalendarList
          calendars={calendars}
          onToggleVisibility={toggleCalendarVisibility}
          onReorder={app.reorderCalendars}
          onRename={(id, newName) => app.updateCalendar(id, { name: newName })}
          onContextMenu={handleContextMenu}
          editingId={editingCalendarId}
          setEditingId={setEditingCalendarId}
          activeContextMenuCalendarId={contextMenu?.calendarId}
        />
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={handleCloseContextMenu}
          className="w-64 p-2"
        >
          {renderCalendarContextMenu ? (
            renderCalendarContextMenu(
              calendars.find(c => c.id === contextMenu.calendarId)!,
              handleCloseContextMenu
            )
          ) : (
            <>
              <ContextMenuLabel>
                Calendar Options
              </ContextMenuLabel>
              <MergeMenuItem
                calendars={calendars}
                currentCalendarId={contextMenu.calendarId}
                onMergeSelect={handleMergeSelect}
              />
              <ContextMenuItem
                onClick={handleDeleteCalendar}
              >
                Delete
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuColorPicker
                selectedColor={
                  calendars.find(c => c.id === contextMenu.calendarId)?.colors.lineColor
                }
                onSelect={handleColorSelect}
                onCustomColor={handleCustomColor}
              />
            </>
          )}
        </ContextMenu>
      )}

      {showCreateDialog && (
        renderCreateCalendarDialog ? (
          renderCreateCalendarDialog({
            onClose: () => setShowCreateDialog(false),
            onCreate: (calendar) => {
              app.createCalendar(calendar);
              setShowCreateDialog(false);
            },
          })
        ) : (
          <CreateCalendarDialog
            onClose={() => setShowCreateDialog(false)}
            onCreate={(calendar) => {
              app.createCalendar(calendar);
              setShowCreateDialog(false);
            }}
          />
        )
      )}

      {mergeState && (
        <MergeCalendarDialog
          sourceName={sourceCalendarName}
          targetName={targetCalendarName}
          onConfirm={handleMergeConfirm}
          onCancel={() => setMergeState(null)}
        />
      )}

      {deleteState && (
        <DeleteCalendarDialog
          calendarId={deleteState.calendarId}
          calendarName={deleteCalendarName}
          calendars={calendars}
          step={deleteState.step}
          onStepChange={(step) => setDeleteState(prev => prev ? { ...prev, step } : null)}
          onConfirmDelete={handleConfirmDelete}
          onCancel={() => setDeleteState(null)}
          onMergeSelect={handleDeleteMergeSelect}
        />
      )}

      {customColorPicker && createPortal(
        <div
          className="fixed inset-0 z-50"
          onMouseDown={() => setCustomColorPicker(null)}
        >
          <div
            className="absolute rounded-md bg-white shadow-xl border border-gray-200 dark:bg-slate-800 dark:border-gray-700"
            style={{
              top: customColorPicker.y,
              left: customColorPicker.x
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <SketchPicker
              width='220px'
              color={customColorPicker.currentColor}
              onChange={(color) => {
                setCustomColorPicker(prev => prev ? { ...prev, currentColor: color.hex } : null);
              }}
              onChangeComplete={(color) => {
                const { colors, darkColors } = getCalendarColorsForHex(color.hex);
                app.updateCalendar(customColorPicker.calendarId, {
                  colors,
                  darkColors
                });
              }}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default DefaultCalendarSidebar;