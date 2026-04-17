/**
 * Tailwind CSS class name constants
 * Centralized management of calendar component style class names for easy maintenance and reuse
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
export const monthViewContainer =
  'df-month-view h-full flex flex-col select-none';

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
 * Navigation button container
 */
export const buttonGroup = 'df-navigation';

/**
 * Navigation button (forward/backward)
 */
export const navButton = 'df-calendar-nav-button';

/**
 * Today button
 */
export const todayButton = 'df-today-button df-calendar-today-button';

/**
 * Icon button size
 */
export const iconSize = 'h-5 w-5';

/**
 * Cancel button
 */
export const cancelButton = 'df-btn-sm df-btn-sm--ghost';

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
 * Month view 6-row grid container - fixed 6-row equal height layout
 */
export const monthGrid6Rows = 'df-month-grid';

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
export const monthMoreEvents =
  'df-month-more-events text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer hover:underline relative z-20';

/**
 * Month title (sticky)
 */
export const monthTitle =
  'df-month-title absolute top-10 left-0 z-30 bg-white/50 dark:bg-gray-900/50 py-2 px-2 duration-300';

/**
 * Calendar content area (week/day view)
 */
export const calendarContent = 'relative overflow-y-auto df-calendar-content';

/**
 * Hide scrollbar
 */
export const scrollbarHide = 'df-scrollbar-hide';

// ==================== Time-Related Styles ====================

/**
 * Time column container
 */
export const timeColumn = 'df-time-column flex-shrink-0';

/**
 * Time slot
 */
export const timeSlot = 'df-time-slot relative h-[4.5rem] flex';

/**
 * Time label
 */
export const timeLabel =
  'df-time-label absolute top-0 -translate-y-1/2 right-2 text-[12px] text-gray-500 dark:text-gray-400 select-none';

/**
 * Time grid row
 */
export const timeGridRow = 'df-time-grid-row h-[4.5rem] border-t flex';

/**
 * Time grid cell
 */
export const timeGridCell =
  'df-time-grid-cell flex-1 relative border-r select-none';

/**
 * Current time line container
 */
export const currentTimeLine =
  'df-current-time-line absolute left-0 top-0 w-full flex pointer-events-none';

/**
 * Current time label
 */
export const currentTimeLabel =
  'df-current-time-label ml-2 df-fill-primary text-xs font-bold px-1.5 rounded-sm';

/**
 * Current time line bar
 */
export const currentTimeLineBar =
  'df-current-time-bar h-0.5 w-full df-fill-primary relative';

// ==================== All-Day Event Area ====================

/**
 * All-day event row container
 */
export const allDayRow = 'df-all-day-row flex items-center border-b';

/**
 * All-day event label
 */
export const allDayLabel =
  'df-all-day-label flex-shrink-0 p-1 text-xs font-medium text-gray-500 dark:text-gray-400 flex justify-end select-none';

/**
 * All-day event content area
 */
export const allDayContent = 'df-all-day-content flex flex-1 relative';

/**
 * All-day event cell
 */
export const allDayCell = 'df-all-day-cell flex-1 border-r relative';

// ==================== Event Styles ====================

/**
 * Base event style
 */
export const baseEvent =
  'df-event calendar-event select-none pointer-events-auto';

/**
 * Event shadow
 */
export const eventShadow = 'shadow-sm';

/**
 * All-day event rounded corners (full)
 */
export const allDayRounded = 'rounded-xl my-0.5';

/**
 * All-day event rounded corners (left)
 */
export const allDayRoundedLeft = 'rounded-l-xl rounded-r-none my-0.5';

/**
 * All-day event rounded corners (right)
 */
export const allDayRoundedRight = 'rounded-r-xl rounded-l-none my-0.5';

/**
 * All-day event no rounded corners (middle segment)
 */
export const allDayRoundedNone = 'rounded-none my-0.5';

/**
 * Regular event rounded corners
 */
export const regularEventRounded = 'rounded-sm';

/**
 * MonthView all-day event content
 */
export const monthAllDayContent =
  'text-xs px-1 rounded truncate cursor-pointer flex items-center';

/**
 * MonthView regular event content
 */
export const monthRegularContent =
  'text-xs cursor-pointer flex items-center justify-between px-0.5';

/**
 * Event title (small)
 */
export const eventTitleSmall =
  'df-event-title font-medium text-xs truncate pr-1';

/**
 * Event time text
 */
export const eventTime = 'df-event-time text-xs opacity-80 truncate';

/**
 * Event color bar (Day/Week view timed events)
 */
export const eventColorBar =
  'df-event-color-bar absolute left-1 top-1 bottom-1 w-[3px] rounded-full';

/**
 * Event color bar (Month view regular events)
 */
export const monthEventColorBar =
  'df-month-event-color-bar inline-block w-0.75 h-3 mr-1 shrink-0 rounded-full';

/**
 * Event icon
 */
export const eventIcon = 'h-3 w-3 mr-1';

// ==================== Resize Handles ====================

/**
 * Resize handle (top)
 */
export const resizeHandleTop =
  'absolute top-0 left-0 w-full h-1.5 cursor-ns-resize z-10 rounded-t-sm';

/**
 * Resize handle (bottom)
 */
export const resizeHandleBottom =
  'absolute bottom-0 left-0 w-full h-1.5 cursor-ns-resize z-10 rounded-b-sm';

/**
 * Resize handle (left)
 */
export const resizeHandleLeft =
  'resize-handle absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity z-20';

/**
 * Resize handle (right)
 */
export const resizeHandleRight =
  'resize-handle absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity z-20';

// ==================== Mini Calendar Styles (DayView) ====================

/**
 * Mini calendar container
 */
export const miniCalendarContainer =
  'df-mini-calendar px-2 border-b border-gray-200 dark:border-gray-700';

/**
 * Mini calendar grid
 */
export const miniCalendarGrid =
  'df-mini-calendar-grid grid grid-cols-7 gap-1 text-xs justify-items-center';

/**
 * Mini calendar weekday title
 */
export const miniCalendarDayHeader =
  'df-mini-calendar-header text-center text-gray-500 dark:text-gray-400 font-medium py-1 h-6 w-6';

/**
 * Mini calendar date cell base style
 */
export const miniCalendarDay =
  'df-mini-calendar-day text-center py-1 rounded text-xs h-6 w-6';

/**
 * Mini calendar current month date
 */
export const miniCalendarCurrentMonth = 'text-gray-900 dark:text-gray-100';

/**
 * Mini calendar other month date
 */
export const miniCalendarOtherMonth = 'text-gray-400 dark:text-gray-600';

/**
 * Mini calendar today
 */
export const miniCalendarToday = 'df-fill-primary rounded-full';

/**
 * Mini calendar selected date
 */
export const miniCalendarSelected =
  'df-fill-secondary rounded-full font-medium';

// ==================== Navigation Button Styles ====================

/**
 * Calendar navigation button (prev/next arrows)
 * Used in TodayBox component for navigation
 */
export const calendarNavButton =
  'df-nav-button df-calendar-nav-button group relative inline-flex items-center justify-center w-7 h-7 rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500 active:bg-gray-100 dark:active:bg-gray-600 transition-all duration-150 shadow-sm hover:shadow focus:outline-none';

/**
 * Calendar today button
 * Used in TodayBox component for "Today" button
 */
export const calendarTodayButton =
  'df-today-button df-calendar-today-button inline-flex items-center justify-center px-4 h-7 text-sm font-medium rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500 active:bg-gray-100 dark:active:bg-gray-600 transition-all duration-150 shadow-sm hover:shadow focus:outline-none';

/**
 * Navigation button icon size
 */
export const navButtonIcon =
  'h-4 w-4 transition-transform group-hover:scale-110';

// ==================== Panel & Dialog Styles ====================

/**
 * Fixed event detail panel
 * Used in DefaultEventDetailPanel, EventDetailPanelWithContent
 */
export const eventDetailPanel =
  'df-event-detail-panel df-portal fixed shadow-lg border rounded-lg';

/**
 * Event detail dialog overlay
 * Used in DefaultEventDetailDialog
 */
export const dialogOverlay =
  'df-dialog-overlay fixed inset-0 bg-black/50 flex items-center justify-center z-50';

/**
 * Event detail dialog container
 */
export const dialogContainer =
  'df-dialog-container relative shadow-2xl border rounded-lg p-6 max-w-md w-full mx-4';

/**
 * Dropdown panel (ViewSwitcher, ColorPicker)
 */
export const dropdownPanel =
  'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg dark:shadow-gray-900/50 overflow-hidden';

/**
 * Calendar picker dropdown (for selecting calendar for an event)
 */
export const calendarPickerDropdown =
  'df-portal bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-200 origin-top-right df-animate-in df-fade-in df-zoom-in-95';

// ==================== Time Grid Boundary Styles ====================

/**
 * Time grid bottom boundary (midnight line)
 * Used in TimeGrid.tsx and DayContent.tsx
 */
export const timeGridBoundary = 'df-time-grid-boundary h-3 border-t relative';

/**
 * Midnight time label
 */
export const midnightLabel =
  'absolute top-0 -translate-y-1/2 text-[12px] text-gray-500 dark:text-gray-400';

// ==================== Sidebar Styles ====================

/**
 * Sidebar container
 */
export const sidebarContainer = 'df-sidebar flex h-full flex-col border-r';

/**
 * Sidebar header
 */
export const sidebarHeader = 'df-sidebar-header flex items-center px-2 py-1';

/**
 * Sidebar header toggle button
 */
export const sidebarHeaderToggle =
  'df-sidebar-header-toggle flex h-8 w-8 items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-slate-800';

/**
 * Sidebar header title
 */
export const sidebarHeaderTitle =
  'df-sidebar-header-title text-sm font-semibold text-gray-700 dark:text-gray-200';

/**
 * Mobile fullscreen overlay
 */
export const mobileFullscreen =
  'df-portal fixed inset-0 z-9999 bg-white dark:bg-gray-900 flex flex-col';

// ==================== Form Input Styles ====================

/**
 * Search input
 */
export const searchInput = 'df-search-group__input';

/**
 * Icon button (square, no text)
 */
export const iconButton = 'df-icon-btn';

// ==================== Utility Styles ====================

/**
 * Border styles
 * @deprecated prefer df-* semantic classes; kept for gradual migration
 */
export const borderGray = 'border-gray-200 dark:border-gray-700';
export const borderBottom = 'border-b border-gray-200 dark:border-gray-700';
export const borderTop = 'border-t border-gray-200 dark:border-gray-700';
export const borderRight = 'border-r border-gray-200 dark:border-gray-700';

/**
 * Text colors
 * @deprecated prefer df-* semantic classes; kept for gradual migration
 */
export const textGray500 = 'text-gray-500 dark:text-gray-400';
export const textGray600 = 'text-gray-600 dark:text-gray-300';
export const textGray700 = 'text-gray-700 dark:text-gray-200';
export const textGray800 = 'text-gray-800 dark:text-gray-100';
export const textGray900 = 'text-gray-900 dark:text-white';

/**
 * Text sizes
 * @deprecated prefer semantic component classes
 */
export const textXs = 'text-xs';
export const textSm = 'text-sm';
export const textBase = 'text-base';
export const textLg = 'text-lg';
export const textXl = 'text-xl';
export const text2xl = 'text-2xl';

/**
 * Background colors
 * @deprecated prefer df-* semantic classes; kept for gradual migration
 */
export const bgWhite = 'bg-white dark:bg-gray-900';
export const bgGray50 = 'bg-gray-50 dark:bg-gray-800';
export const bgGray100 = 'bg-gray-100 dark:bg-gray-800';

/**
 * Flex layouts
 * @deprecated prefer semantic component classes
 */
export const flexRow = 'flex';
export const flexCol = 'flex flex-col';
export const flexCenter = 'flex items-center justify-center';
export const flexBetween = 'flex justify-between items-center';

/**
 * Spacing
 * @deprecated prefer semantic component classes
 */
export const m1 = 'm-1';
export const mr1 = 'mr-1';
export const mt3 = 'mt-3';
export const mb2 = 'mb-2';
export const mb3 = 'mb-3';
export const p1 = 'p-1';
export const p2 = 'p-2';
export const p4 = 'p-4';
export const px1 = 'px-1';
export const px2 = 'px-2';
export const py1 = 'py-1';
export const py2 = 'py-2';

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
