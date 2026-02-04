import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarSidebarRenderProps } from '../../types';
import ContextMenu, {
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuLabel,
  ContextMenuColorPicker,
} from '../common/ContextMenu';
import { getCalendarColorsForHex } from '../../core/calendarRegistry';
import { SketchPicker } from 'react-color';
// common component
import { SidebarHeader } from './components/SidebarHeader';
import { CalendarList } from './components/CalendarList';
import { MiniCalendar } from '../common/MiniCalendar';
import { MergeMenuItem } from './components/MergeMenuItem';
import { MergeCalendarDialog } from './components/MergeCalendarDialog';
import { DeleteCalendarDialog } from './components/DeleteCalendarDialog';
import { useLocale } from '@/locale';
import { sidebarContainer } from '@/styles/classNames';

const DefaultCalendarSidebar: React.FC<CalendarSidebarRenderProps> = ({
  app,
  calendars,
  toggleCalendarVisibility,
  isCollapsed,
  setCollapsed,
  renderCalendarContextMenu,
  editingCalendarId: propEditingCalendarId,
  setEditingCalendarId: propSetEditingCalendarId,
  onCreateCalendar,
}) => {
  const { t } = useLocale();
  const visibleMonthDate = app.getVisibleMonth();
  const visibleYear = visibleMonthDate.getFullYear();
  const visibleMonthIndex = visibleMonthDate.getMonth();

  const [localEditingCalendarId, setLocalEditingCalendarId] = useState<string | null>(null);
  const editingCalendarId = propEditingCalendarId !== undefined ? propEditingCalendarId : localEditingCalendarId;
  const setEditingCalendarId = propSetEditingCalendarId || setLocalEditingCalendarId;

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

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    calendarId: string;
  } | null>(null);

  // Sidebar Context Menu State (Background)
  const [sidebarContextMenu, setSidebarContextMenu] = useState<{
    x: number;
    y: number;
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
    e.stopPropagation(); // Stop propagation to prevent sidebar context menu
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      calendarId,
    });
    setSidebarContextMenu(null);
  }, []);

  const handleSidebarContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setSidebarContextMenu({
      x: e.clientX,
      y: e.clientY,
    });
    setContextMenu(null);
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleCloseSidebarContextMenu = useCallback(() => {
    setSidebarContextMenu(null);
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


  const sourceCalendarName = mergeState ? calendars.find(c => c.id === mergeState.sourceId)?.name || 'Unknown' : '';
  const targetCalendarName = mergeState ? calendars.find(c => c.id === mergeState.targetId)?.name || 'Unknown' : '';
  const deleteCalendarName = deleteState ? calendars.find(c => c.id === deleteState.calendarId)?.name || 'Unknown' : '';

  const readOnlyConfig = app.getReadOnlyConfig();
  const isEditable = !app.state.readOnly;
  const isDraggable = readOnlyConfig.draggable !== false;

  return (
    <div
      className={sidebarContainer}
      onContextMenu={isEditable ? handleSidebarContextMenu : undefined}
    >
      <SidebarHeader
        isCollapsed={isCollapsed}
        onCollapseToggle={() => setCollapsed(!isCollapsed)}
      />

      {!isCollapsed ? (
        <>
          <CalendarList
            calendars={calendars}
            onToggleVisibility={toggleCalendarVisibility}
            onReorder={isDraggable ? app.reorderCalendars : () => {}}
            onRename={isEditable ? (id, newName) => app.updateCalendar(id, { name: newName }) : () => {}}
            onContextMenu={isEditable ? handleContextMenu : () => {}}
            editingId={editingCalendarId}
            setEditingId={setEditingCalendarId}
            activeContextMenuCalendarId={contextMenu?.calendarId}
            isDraggable={isDraggable}
            isEditable={isEditable}
          />

          <div className='border-t border-gray-200 dark:border-slate-800'>
            <MiniCalendar
              visibleMonth={app.getVisibleMonth()}
              currentDate={app.getCurrentDate()}
              showHeader={true}
              onMonthChange={handleMonthChange}
              onDateSelect={(date) => app.setCurrentDate(date)}
            />
          </div>
        </>
      ) : (
        <CalendarList
          calendars={calendars}
          onToggleVisibility={toggleCalendarVisibility}
          onReorder={isDraggable ? app.reorderCalendars : () => {}}
          onRename={isEditable ? (id, newName) => app.updateCalendar(id, { name: newName }) : () => {}}
          onContextMenu={isEditable ? handleContextMenu : () => {}}
          editingId={editingCalendarId}
          setEditingId={setEditingCalendarId}
          activeContextMenuCalendarId={contextMenu?.calendarId}
          isDraggable={isDraggable}
          isEditable={isEditable}
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
                {t('calendarOptions')}
              </ContextMenuLabel>
              <MergeMenuItem
                calendars={calendars}
                currentCalendarId={contextMenu.calendarId}
                onMergeSelect={handleMergeSelect}
              />
              <ContextMenuItem
                onClick={handleDeleteCalendar}
              >
                {t('delete')}
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

      {sidebarContextMenu && createPortal(
        <ContextMenu
          x={sidebarContextMenu.x}
          y={sidebarContextMenu.y}
          onClose={handleCloseSidebarContextMenu}
          className="w-max p-2"
        >
          <ContextMenuItem
            onClick={() => {
              onCreateCalendar?.();
              handleCloseSidebarContextMenu();
            }}
          >
            {t('newCalendar') || 'New Calendar'}
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => {
              app.triggerRender();
              handleCloseSidebarContextMenu();
            }}
          >
            {t('refreshAll') || 'Refresh All'}
          </ContextMenuItem>
        </ContextMenu>,
        document.body
      )}

      {mergeState && createPortal(
        <MergeCalendarDialog
          sourceName={sourceCalendarName}
          targetName={targetCalendarName}
          onConfirm={handleMergeConfirm}
          onCancel={() => setMergeState(null)}
        />,
        document.body
      )}

      {deleteState && createPortal(
        <DeleteCalendarDialog
          calendarId={deleteState.calendarId}
          calendarName={deleteCalendarName}
          calendars={calendars}
          step={deleteState.step}
          onStepChange={(step) => setDeleteState(prev => prev ? { ...prev, step } : null)}
          onConfirmDelete={handleConfirmDelete}
          onCancel={() => setDeleteState(null)}
          onMergeSelect={handleDeleteMergeSelect}
        />,
        document.body
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