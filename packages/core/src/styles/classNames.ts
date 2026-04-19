/**
 * Shared DayFlow semantic class constants used across core components.
 * All exports use df-* semantic classes; atomic utility classes are prohibited.
 */

// ==================== Container Styles ====================

/**
 * Calendar main container
 * Used for the root container of WeekView and DayView
 */
export const calendarContainer = 'df-calendar';

/**
 * MonthView container
 */
export const monthViewContainer = 'df-month-view';

// ==================== Navigation Bar Styles ====================

/**
 * Top navigation bar container
 */
export const headerContainer = 'df-view-header-container';

/**
 * Title text style
 */
export const headerTitle = 'df-view-header-title';

/**
 * Subtitle text style
 */
export const headerSubtitle = 'df-view-header-subtitle';

// ==================== Button Styles ====================

/**
 * Cancel button
 */
export const cancelButton = 'df-btn-sm df-btn-sm-ghost';

// ==================== Grid Styles ====================

/**
 * 7-column grid container (weekday titles)
 */
export const weekGrid = 'df-week-grid';

/**
 * Week title row (MonthView)
 */
export const weekHeaderRow = 'df-week-header-row';

/**
 * Weekday labels
 */
export const dayLabel = 'df-day-label';

/**
 * WeekView week title
 */
export const weekDayHeader = 'df-week-header';

/**
 * WeekView week title cell
 */
export const weekDayCell = 'df-week-day-cell';

/**
 * Date number style
 */
export const dateNumber = 'df-date-number';

// ==================== Scroll Area Styles ====================

/**
 * Virtual scroll container
 */
export const scrollContainer = 'df-scroll-container';

/**
 * Month day cell
 */
export const monthDayCell = 'df-month-day-cell';

/**
 * Month date number container
 */
export const monthDateNumberContainer = 'df-month-date-number-container';

/**
 * Month date number
 */
export const monthDateNumber = 'df-month-date-number';

/**
 * Month more events indicator
 */
export const monthMoreEvents = 'df-month-more-events';

/**
 * Month title (sticky)
 */
export const monthTitle = 'df-month-title';

/**
 * Calendar content area (week/day view)
 */
export const calendarContent = 'df-calendar-content';

/**
 * Hide scrollbar
 */
export const scrollbarHide = 'df-scrollbar-hide';

// ==================== Time-Related Styles ====================

/**
 * Time column container
 */
export const timeColumn = 'df-time-column';

/**
 * Time slot
 */
export const timeSlot = 'df-time-slot';

/**
 * Time label
 */
export const timeLabel = 'df-time-label';

/**
 * Time grid row
 */
export const timeGridRow = 'df-time-grid-row';

/**
 * Time grid cell
 */
export const timeGridCell = 'df-time-grid-cell';

/**
 * Current time line container
 */
export const currentTimeLine = 'df-current-time-line';

/**
 * Current time label
 */
export const currentTimeLabel = 'df-current-time-label';

/**
 * Current time line bar
 */
export const currentTimeLineBar = 'df-current-time-bar';

// ==================== All-Day Event Area ====================

/**
 * All-day event row container
 */
export const allDayRow = 'df-all-day-row';

/**
 * All-day event label
 */
export const allDayLabel = 'df-all-day-label';

/**
 * All-day event content area
 */
export const allDayContent = 'df-all-day-content';

/**
 * All-day event cell
 */
export const allDayCell = 'df-all-day-cell';

// ==================== Event Styles ====================

/**
 * Base event style
 */
export const baseEvent = 'df-event';

/**
 * MonthView all-day event content
 */
export const monthAllDayContent = 'df-event-month-all-day';

/**
 * MonthView regular event content
 */
export const monthRegularContent = 'df-event-month-regular';

/**
 * Event title (small)
 */
export const eventTitleSmall = 'df-event-title';

/**
 * Event time text
 */
export const eventTime = 'df-event-time';

/**
 * Event color bar (Day/Week view timed events)
 */
export const eventColorBar = 'df-event-color-bar';

/**
 * Event color bar (Month view regular events)
 */
export const monthEventColorBar = 'df-event-month-color-bar';

/**
 * Event icon
 */
export const eventIcon = 'df-event-icon-svg';

// ==================== Resize Handles ====================

/**
 * Resize handle (top)
 */
export const resizeHandleTop =
  'df-event-resize-handle df-event-resize-handle-top';

/**
 * Resize handle (bottom)
 */
export const resizeHandleBottom =
  'df-event-resize-handle df-event-resize-handle-bottom';

/**
 * Resize handle (left)
 */
export const resizeHandleLeft =
  'df-event-resize-handle df-event-resize-handle-left df-resize-handle';

/**
 * Resize handle (right)
 */
export const resizeHandleRight =
  'df-event-resize-handle df-event-resize-handle-right df-resize-handle';

// ==================== Mini Calendar Styles (DayView) ====================

/**
 * Mini calendar container
 */
export const miniCalendarContainer = 'df-mini-calendar';

/**
 * Mini calendar grid
 */
export const miniCalendarGrid = 'df-mini-calendar-grid';

/**
 * Mini calendar weekday title
 */
export const miniCalendarDayHeader = 'df-mini-calendar-header';

/**
 * Mini calendar date cell base style
 */
export const miniCalendarDay = 'df-mini-calendar-day';

// ==================== Navigation Button Styles ====================

/**
 * Calendar navigation button (prev/next arrows)
 * Used in TodayBox component for navigation
 */
export const calendarNavButton = 'df-nav-button df-calendar-nav-button';

/**
 * Calendar today button
 * Used in TodayBox component for "Today" button
 */
export const calendarTodayButton = 'df-today-button df-calendar-today-button';

// ==================== Panel & Dialog Styles ====================

/**
 * Fixed event detail panel
 * Used in DefaultEventDetailPanel, EventDetailPanelWithContent
 */
export const eventDetailPanel = 'df-event-detail-panel df-portal';

/**
 * Event detail dialog container
 */
export const dialogContainer = 'df-dialog-container';

/**
 * Calendar picker dropdown (for selecting calendar for an event)
 */
export const calendarPickerDropdown =
  'df-portal df-calendar-picker-dropdown df-animate-in df-fade-in df-zoom-in-95';

// ==================== Time Grid Boundary Styles ====================

/**
 * Time grid bottom boundary (midnight line)
 * Used in TimeGrid.tsx and DayContent.tsx
 */
export const timeGridBoundary = 'df-time-grid-boundary';

/**
 * Midnight time label
 */
export const midnightLabel = 'df-midnight-label';

// ==================== Sidebar Styles ====================

/**
 * Sidebar container
 */
export const sidebarContainer = 'df-sidebar';

/**
 * Sidebar header
 */
export const sidebarHeader = 'df-sidebar-header';

/**
 * Sidebar header toggle button
 */
export const sidebarHeaderToggle = 'df-sidebar-toggle';

/**
 * Sidebar header title
 */
export const sidebarHeaderTitle = 'df-sidebar-header-title';

/**
 * Mobile fullscreen overlay
 */
export const mobileFullscreen = 'df-mobile-fullscreen';

// ==================== Form Input Styles ====================

/**
 * Icon button (square, no text)
 */
export const iconButton = 'df-icon-btn';

// ==================== Utility Styles ====================

// ==================== Combined Style Utility Functions ====================

/**
 * Combine multiple class names
 * @param classNames - Array of class name strings
 * @returns Combined class name string
 */
export const cn = (
  ...classNames: (string | undefined | null | false)[]
): string => classNames.filter(Boolean).join(' ');

/**
 * Combine class names based on condition
 * @param base - Base class name
 * @param condition - Condition
 * @param whenTrue - Class name when condition is true
 * @param whenFalse - Class name when condition is false
 * @returns Combined class name string
 */
export const conditional = (
  base: string,
  condition: boolean,
  whenTrue: string,
  whenFalse?: string
): string => cn(base, condition ? whenTrue : whenFalse);
