import { ViewType } from '@dayflow/react';

export const DEFAULT_THEME_COLOR = '#6786e6';

export type YearMode = 'fixed-week' | 'canvas' | 'grid';
export type SwitcherMode = 'buttons' | 'select';

export interface CalendarFeatures {
  showSidebar: boolean;
  showHeader: boolean;
  enableDrag: boolean;
  enableShortcuts: boolean;
  showEventDots: boolean;
  showCalendarGroups: boolean;
  showMultiCalendar: boolean;
  readOnly: boolean;
  collapsedSafeAreaLeft: boolean;
  sidebarOrder?: ('calendarList' | 'miniCalendar')[];
}

export interface CalendarSelections {
  locale: string;
  timeZone?: string;
  secondaryTimeZone?: string;
  selectedViews: string[];
  activeView: ViewType;
  yearMode: YearMode;
  switcherMode: SwitcherMode;
  themeColor?: string;
}
