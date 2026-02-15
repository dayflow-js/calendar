import { useCallback, useEffect, useState, useRef } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import { CalendarSidebarRenderProps, Event } from '../../types';
import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuLabel,
  ContextMenuColorPicker,
} from '@/components/contextMenu';
import { getCalendarColorsForHex } from '../../core/calendarRegistry';
import { BlossomColorPicker } from '../common/BlossomColorPicker';
import {
  hexToHsl,
  lightnessToSliderValue,
} from '@dayflow/blossom-color-picker';
import { ContentSlot } from '../../renderer/ContentSlot';
import { DefaultColorPicker } from '../common/DefaultColorPicker';
// common component
import { SidebarHeader } from './components/SidebarHeader';
import { CalendarList } from './components/CalendarList';
import { MiniCalendar } from '../common/MiniCalendar';
import { MergeMenuItem } from './components/MergeMenuItem';
import { MergeCalendarDialog } from './components/MergeCalendarDialog';
import { DeleteCalendarDialog } from './components/DeleteCalendarDialog';
import {
  ImportCalendarDialog,
  NEW_CALENDAR_ID,
} from './components/ImportCalendarDialog';
import { useLocale } from '@/locale';
import { sidebarContainer } from '@/styles/classNames';
import { importICSFile, downloadICS } from '@/utils/ics';
import { generateUniKey } from '@/utils/utilityFunctions';

const DefaultCalendarSidebar = ({
  app,
  calendars,
  toggleCalendarVisibility,
  isCollapsed,
  setCollapsed,
  renderCalendarContextMenu,
  editingCalendarId: propEditingCalendarId,
  setEditingCalendarId: propSetEditingCalendarId,
  onCreateCalendar,
  colorPickerMode = 'default',
}: CalendarSidebarRenderProps) => {
  const { t } = useLocale();
  const visibleMonthDate = app.getVisibleMonth();
  const visibleYear = visibleMonthDate.getFullYear();
  const visibleMonthIndex = visibleMonthDate.getMonth();

  const [localEditingCalendarId, setLocalEditingCalendarId] = useState<
    string | null
  >(null);
  const editingCalendarId =
    propEditingCalendarId !== undefined
      ? propEditingCalendarId
      : localEditingCalendarId;
  const setEditingCalendarId =
    propSetEditingCalendarId || setLocalEditingCalendarId;
  // File input ref for import
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

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
    rowRect?: DOMRect;
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
    initialColor: {
      hue: number;
      saturation: number;
      lightness: number;
      alpha: number;
      layer: 'inner' | 'outer';
    };
    currentColor: string; // For react-color mode
  } | null>(null);

  // Merge Calendar State
  const [mergeState, setMergeState] = useState<{
    sourceId: string;
    targetId: string;
  } | null>(null);

  // Delete Calendar State
  const [deleteState, setDeleteState] = useState<{
    calendarId: string;
    step: 'initial' | 'confirm_delete';
  } | null>(null);

  // Import Calendar State
  const [importState, setImportState] = useState<{
    events: Event[];
    filename: string;
  } | null>(null);

  const handleContextMenu = useCallback((e: any, calendarId: string) => {
    e.preventDefault();
    e.stopPropagation(); // Stop propagation to prevent sidebar context menu
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      calendarId,
      rowRect: e.currentTarget.getBoundingClientRect(),
    });
    setSidebarContextMenu(null);
  }, []);

  const handleSidebarContextMenu = useCallback((e: any) => {
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

  const handleColorClick = useCallback(
    (e: any, calendarId: string) => {
      e.preventDefault();
      e.stopPropagation();

      const calendar = calendars.find(c => c.id === calendarId);
      if (calendar) {
        const { l, h } = hexToHsl(calendar.colors.lineColor);
        const sliderValue = lightnessToSliderValue(l);
        const rect = e.currentTarget.getBoundingClientRect();

        setCustomColorPicker({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          calendarId: calendarId,
          initialColor: {
            hue: h,
            saturation: sliderValue,
            lightness: l,
            alpha: 100,
            layer: 'outer',
          },
          currentColor: calendar.colors.lineColor,
        });
      }
    },
    [calendars]
  );

  const handleDeleteCalendar = useCallback(() => {
    if (contextMenu) {
      setDeleteState({ calendarId: contextMenu.calendarId, step: 'initial' });
      handleCloseContextMenu();
    }
  }, [contextMenu, handleCloseContextMenu]);

  const handleColorSelect = useCallback(
    (color: string) => {
      if (contextMenu) {
        const { colors, darkColors } = getCalendarColorsForHex(color);
        app.updateCalendar(contextMenu.calendarId, {
          colors,
          darkColors,
        });
        handleCloseContextMenu();
      }
    },
    [app, contextMenu, handleCloseContextMenu]
  );

  const handleCustomColor = useCallback(() => {
    if (contextMenu) {
      const calendar = calendars.find(c => c.id === contextMenu.calendarId);
      if (calendar) {
        const { l, h } = hexToHsl(calendar.colors.lineColor);
        // Calculate slider position from lightness
        const sliderValue = lightnessToSliderValue(l);

        let x = contextMenu.x;
        let y = contextMenu.y;

        if (contextMenu.rowRect) {
          // Position it on the row (roughly where the checkbox is)
          x = contextMenu.rowRect.left + 24;
          y = contextMenu.rowRect.top + contextMenu.rowRect.height / 2;
        } else if (contextMenuRef.current) {
          const rect = contextMenuRef.current.getBoundingClientRect();
          x = rect.left + rect.width / 2;
          y = rect.top + rect.height / 2;
        }

        setCustomColorPicker({
          x,
          y,
          calendarId: contextMenu.calendarId,
          initialColor: {
            hue: h,
            saturation: sliderValue,
            lightness: l,
            alpha: 100,
            layer: 'outer',
          },
          currentColor: calendar.colors.lineColor,
        });
      }
      handleCloseContextMenu();
    }
  }, [contextMenu, calendars, handleCloseContextMenu]);

  const handleMergeSelect = useCallback(
    (targetId: string) => {
      if (contextMenu) {
        setMergeState({
          sourceId: contextMenu.calendarId,
          targetId,
        });
        handleCloseContextMenu();
      }
    },
    [contextMenu, handleCloseContextMenu]
  );

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

  const handleDeleteMergeSelect = useCallback(
    (targetId: string) => {
      if (deleteState) {
        setMergeState({
          sourceId: deleteState.calendarId,
          targetId,
        });
        setDeleteState(null);
      }
    },
    [deleteState]
  );

  // Import Calendar handler
  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
    handleCloseSidebarContextMenu();
  }, [handleCloseSidebarContextMenu]);

  const handleFileChange = useCallback(async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await importICSFile(file);

    // Show dialog if found at least one valid event, even if there were some parsing errors
    if (result.events.length > 0) {
      setImportState({
        events: result.events,
        filename: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
      });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleImportConfirm = useCallback(
    (targetCalendarId: string) => {
      if (importState) {
        let finalCalendarId = targetCalendarId;

        if (targetCalendarId === NEW_CALENDAR_ID) {
          // Create new calendar
          const colors = [
            '#3b82f6',
            '#10b981',
            '#8b5cf6',
            '#f59e0b',
            '#ef4444',
            '#f97316',
            '#ec4899',
            '#14b8a6',
            '#6366f1',
            '#6b7280',
          ];
          const randomColor = colors[Math.floor(Math.random() * colors.length)];
          const { colors: calendarColors, darkColors } =
            getCalendarColorsForHex(randomColor);

          finalCalendarId = generateUniKey();
          app.createCalendar({
            id: finalCalendarId,
            name: importState.filename,
            isDefault: false,
            colors: calendarColors,
            darkColors: darkColors,
            isVisible: true,
          });
        }

        importState.events.forEach(event => {
          app.addEvent({ ...event, calendarId: finalCalendarId });
        });
        setImportState(null);
      }
    },
    [app, importState]
  );

  // Export Calendar handler
  const handleExportCalendar = useCallback(() => {
    if (contextMenu) {
      const calendar = calendars.find(c => c.id === contextMenu.calendarId);
      if (calendar) {
        const events = app
          .getEvents()
          .filter(e => e.calendarId === calendar.id);
        downloadICS(events, {
          calendarName: calendar.name,
          filename: calendar.name || 'calendar',
        });
      }
      handleCloseContextMenu();
    }
  }, [contextMenu, calendars, app, handleCloseContextMenu]);

  const sourceCalendarName = mergeState
    ? calendars.find(c => c.id === mergeState.sourceId)?.name || 'Unknown'
    : '';
  const targetCalendarName = mergeState
    ? calendars.find(c => c.id === mergeState.targetId)?.name || 'Unknown'
    : '';
  const deleteCalendarName = deleteState
    ? calendars.find(c => c.id === deleteState.calendarId)?.name || 'Unknown'
    : '';

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
            onRename={
              isEditable
                ? (id, newName) => app.updateCalendar(id, { name: newName })
                : () => {}
            }
            onContextMenu={isEditable ? handleContextMenu : () => {}}
            onColorClick={isEditable ? handleColorClick : undefined}
            editingId={editingCalendarId}
            setEditingId={setEditingCalendarId}
            activeContextMenuCalendarId={contextMenu?.calendarId}
            isDraggable={isDraggable}
            isEditable={isEditable}
          />

          <div className="border-t border-gray-200 dark:border-slate-800">
            <MiniCalendar
              visibleMonth={app.getVisibleMonth()}
              currentDate={app.getCurrentDate()}
              showHeader={true}
              onMonthChange={handleMonthChange}
              onDateSelect={date => app.setCurrentDate(date)}
            />
          </div>
        </>
      ) : (
        <CalendarList
          calendars={calendars}
          onToggleVisibility={toggleCalendarVisibility}
          onReorder={isDraggable ? app.reorderCalendars : () => {}}
          onRename={
            isEditable
              ? (id, newName) => app.updateCalendar(id, { name: newName })
              : () => {}
          }
          onContextMenu={isEditable ? handleContextMenu : () => {}}
          onColorClick={isEditable ? handleColorClick : undefined}
          editingId={editingCalendarId}
          setEditingId={setEditingCalendarId}
          activeContextMenuCalendarId={contextMenu?.calendarId}
          isDraggable={isDraggable}
          isEditable={isEditable}
        />
      )}

      {contextMenu && (
        <ContextMenu
          ref={contextMenuRef}
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
              <ContextMenuLabel>{t('calendarOptions')}</ContextMenuLabel>
              <MergeMenuItem
                calendars={calendars}
                currentCalendarId={contextMenu.calendarId}
                onMergeSelect={handleMergeSelect}
              />
              <ContextMenuItem onClick={handleDeleteCalendar}>
                {t('delete')}
              </ContextMenuItem>
              <ContextMenuItem onClick={handleExportCalendar}>
                {t('exportCalendar') || 'Export Calendar'}
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuColorPicker
                selectedColor={
                  calendars.find(c => c.id === contextMenu.calendarId)?.colors
                    .lineColor
                }
                onSelect={handleColorSelect}
                onCustomColor={handleCustomColor}
              />
            </>
          )}
        </ContextMenu>
      )}

      {sidebarContextMenu &&
        createPortal(
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
            <ContextMenuItem onClick={handleImportClick}>
              {t('importCalendar') || 'Import Calendar'}
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

      {/* Hidden file input for ICS import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".ics"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {importState &&
        createPortal(
          <ImportCalendarDialog
            calendars={calendars}
            filename={importState.filename}
            onConfirm={handleImportConfirm}
            onCancel={() => setImportState(null)}
          />,
          document.body
        )}

      {mergeState &&
        createPortal(
          <MergeCalendarDialog
            sourceName={sourceCalendarName}
            targetName={targetCalendarName}
            onConfirm={handleMergeConfirm}
            onCancel={() => setMergeState(null)}
          />,
          document.body
        )}

      {deleteState &&
        createPortal(
          <DeleteCalendarDialog
            calendarId={deleteState.calendarId}
            calendarName={deleteCalendarName}
            calendars={calendars}
            step={deleteState.step}
            onStepChange={step =>
              setDeleteState(prev => (prev ? { ...prev, step } : null))
            }
            onConfirmDelete={handleConfirmDelete}
            onCancel={() => setDeleteState(null)}
            onMergeSelect={handleDeleteMergeSelect}
          />,
          document.body
        )}

      {customColorPicker &&
        createPortal(
          <div
            className="fixed inset-0 z-50"
            onMouseDown={() => {
              app.updateCalendar(customColorPicker.calendarId, {});
              setCustomColorPicker(null);
            }}
          >
            <div
              className="absolute flex items-center justify-center"
              style={{
                top: customColorPicker.y,
                left: customColorPicker.x,
                transform: 'translate(280%, -50%)',
              }}
              onMouseDown={e => e.stopPropagation()}
            >
              {colorPickerMode === 'blossom' ? (
                <BlossomColorPicker
                  defaultValue={customColorPicker.initialColor}
                  coreSize={28}
                  petalSize={28}
                  initialExpanded={true}
                  adaptivePositioning={true}
                  openOnHover={false}
                  onChange={color => {
                    const { colors, darkColors } = getCalendarColorsForHex(
                      color.hex
                    );
                    app.updateCalendar(
                      customColorPicker.calendarId,
                      {
                        colors,
                        darkColors,
                      },
                      true
                    );
                  }}
                  onCollapse={() => {
                    app.updateCalendar(customColorPicker.calendarId, {});
                    setCustomColorPicker(null);
                  }}
                />
              ) : (
                <ContentSlot
                  generatorName="colorPicker"
                  generatorArgs={{
                    variant: 'sketch',
                    color: customColorPicker.currentColor,
                    onChange: (color: { hex: string }) => {
                      setCustomColorPicker(prev =>
                        prev ? { ...prev, currentColor: color.hex } : null
                      );
                      const { colors, darkColors } = getCalendarColorsForHex(
                        color.hex
                      );
                      app.updateCalendar(
                        customColorPicker.calendarId,
                        {
                          colors,
                          darkColors,
                        },
                        true
                      );
                    },
                    onChangeComplete: (color: { hex: string }) => {
                      const { colors, darkColors } = getCalendarColorsForHex(
                        color.hex
                      );
                      app.updateCalendar(customColorPicker.calendarId, {
                        colors,
                        darkColors,
                      });
                    },
                  }}
                  defaultContent={
                    <DefaultColorPicker
                      color={customColorPicker.currentColor}
                      onChange={(color, isPending) => {
                        setCustomColorPicker(prev =>
                          prev ? { ...prev, currentColor: color.hex } : null
                        );
                        const { colors, darkColors } = getCalendarColorsForHex(
                          color.hex
                        );
                        app.updateCalendar(
                          customColorPicker.calendarId,
                          {
                            colors,
                            darkColors,
                          },
                          isPending
                        );
                      }}
                      onClose={() => {
                        app.updateCalendar(customColorPicker.calendarId, {});
                        setCustomColorPicker(null);
                      }}
                    />
                  }
                />
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default DefaultCalendarSidebar;
