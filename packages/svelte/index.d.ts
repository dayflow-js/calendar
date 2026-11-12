import type {
  CalendarAppConfig,
  CalendarContextMenuSlotArgs,
  CalendarHeaderProps,
  CalendarSearchProps,
  CalendarSidebarRenderProps,
  ColorPickerProps,
  CreateCalendarDialogColorPickerProps,
  CreateCalendarDialogProps,
  EventContentSlotArgs,
  EventContextMenuSlotArgs,
  EventDetailContentProps,
  EventDetailDialogProps,
  GridContextMenuSlotArgs,
  GridPopupContentSlotArgs,
  ICalendarApp,
  MobileEventProps,
  MonthDateNumberSlotArgs,
  SidebarHeaderSlotArgs,
  TitleBarSlotProps,
  UseCalendarAppReturn,
} from '@dayflow/core';
import type { Component } from 'svelte';

/**
 * Props of `DayFlowCalendar`. The component itself is typed from this
 * interface, so the two cannot drift apart.
 */
export interface DayFlowCalendarProps {
  calendar: ICalendarApp | UseCalendarAppReturn;
  eventContentDay?: Component<EventContentSlotArgs>;
  eventContentWeek?: Component<EventContentSlotArgs>;
  eventContentMonth?: Component<EventContentSlotArgs>;
  eventContentYear?: Component<EventContentSlotArgs>;
  eventContentAllDayDay?: Component<EventContentSlotArgs>;
  eventContentAllDayWeek?: Component<EventContentSlotArgs>;
  eventContentAllDayMonth?: Component<EventContentSlotArgs>;
  eventContentAllDayYear?: Component<EventContentSlotArgs>;
  eventDetailContent?: Component<EventDetailContentProps>;
  eventDetailDialog?: Component<EventDetailDialogProps>;
  createCalendarDialog?: Component<CreateCalendarDialogProps>;
  titleBarSlot?: Component<TitleBarSlotProps>;
  colorPicker?: Component<ColorPickerProps>;
  createCalendarDialogColorPicker?: Component<CreateCalendarDialogColorPickerProps>;
  calendarHeader?: Component<CalendarHeaderProps>;
  eventContextMenu?: Component<EventContextMenuSlotArgs>;
  gridContextMenu?: Component<GridContextMenuSlotArgs>;
  gridPopupContent?: Component<GridPopupContentSlotArgs>;
  monthDateNumberContent?: Component<MonthDateNumberSlotArgs>;
  mobileEventDetail?: Component<MobileEventProps>;
  collapsedSafeAreaLeft?: number | null;
  search?: CalendarSearchProps | null;
  sidebar?: Component<CalendarSidebarRenderProps>;
  sidebarHeader?: Component<SidebarHeaderSlotArgs>;
  calendarContextMenu?: Component<CalendarContextMenuSlotArgs>;
}

export declare const DayFlowCalendar: Component<DayFlowCalendarProps>;
export default DayFlowCalendar;

/**
 * Creates the calendar app for the calling component and destroys it with it.
 *
 * Pass a getter (`() => ({ ... })`) or a `$state` object to have later config
 * changes synced onto the app. A plain object is read once.
 */
export declare function useCalendarApp(
  config: CalendarAppConfig | (() => CalendarAppConfig)
): UseCalendarAppReturn;

export * from '@dayflow/core';
