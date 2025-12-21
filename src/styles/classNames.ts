/**
 * Tailwind CSS class name constants
 * Centralized management of calendar component style class names for easy maintenance and reuse
 */

// ==================== Container Styles ====================

/**
 * Calendar main container
 * Used for the root container of WeekView and DayView
 */
export const calendarContainer =
  'relative flex flex-col bg-white dark:bg-gray-900 w-full overflow-hidden h-full';

/**
 * MonthView container
 */
export const monthViewContainer = 'h-full flex flex-col bg-white dark:bg-gray-900';

// ==================== Navigation Bar Styles ====================

/**
 * Top navigation bar container
 */
export const headerContainer = 'p-2 flex justify-between';

/**
 * Title text style
 */
export const headerTitle = 'text-2xl font-bold text-gray-900 dark:text-gray-100';

/**
 * Subtitle text style
 */
export const headerSubtitle = 'mt-3 text-gray-600 dark:text-gray-400';

// ==================== Button Styles ====================

/**
 * Navigation button container
 */
export const buttonGroup = 'flex items-center';

/**
 * Navigation button (forward/backward)
 */
export const navButton = 'p-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded';

/**
 * Today button
 */
export const todayButton =
  'px-4 py-1 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded';

/**
 * Icon button size
 */
export const iconSize = 'h-5 w-5';

// ==================== Grid Styles ====================

/**
 * 7-column grid container (weekday titles)
 */
export const weekGrid = 'grid grid-cols-7';

/**
 * Week title row (MonthView)
 */
export const weekHeaderRow =
  'sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700';

/**
 * Weekday labels
 */
export const dayLabel = 'text-right text-gray-500 dark:text-gray-400 text-sm py-2 pr-2';

/**
 * WeekView week title
 */
export const weekDayHeader = 'flex border-b border-gray-200 dark:border-gray-700';

/**
 * WeekView week title cell
 */
export const weekDayCell =
  'flex flex-1 justify-center items-center text-center text-gray-500 dark:text-gray-400 text-sm p-1';

/**
 * Date number style
 */
export const dateNumber =
  'inline-flex items-center justify-center h-6 w-6 rounded-full text-sm mt-1';

// ==================== Scroll Area Styles ====================

/**
 * Virtual scroll container
 */
export const scrollContainer = 'flex-1 overflow-auto will-change-scroll';

/**
 * Month view 6-row grid container - fixed 6-row equal height layout
 */
export const monthGrid6Rows = 'grid grid-rows-6 h-full overflow-hidden';

/**
 * Calendar content area (week/day view)
 */
export const calendarContent = 'relative overflow-y-auto calendar-content';

/**
 * Hide scrollbar
 */
export const scrollbarHide = 'scrollbar-hide';

// ==================== Time-Related Styles ====================

/**
 * Time column container
 */
export const timeColumn = 'w-20 flex-shrink-0 border-gray-200 dark:border-gray-700';

/**
 * Time slot
 */
export const timeSlot = 'relative h-[4.5rem] flex';

/**
 * Time label
 */
export const timeLabel = 'absolute -top-2.5 right-2 text-[12px] text-gray-500 dark:text-gray-400';

/**
 * Time grid row
 */
export const timeGridRow =
  'h-[4.5rem] border-t first:border-none border-gray-200 dark:border-gray-700 flex';

/**
 * Time grid cell
 */
export const timeGridCell = 'flex-1 relative border-r border-gray-200 dark:border-gray-700';

/**
 * Current time line container
 */
export const currentTimeLine = 'absolute left-0 top-0 flex pointer-events-none';

/**
 * Current time label
 */
export const currentTimeLabel =
  'ml-2 text-white text-xs font-bold px-1.5 bg-red-500 rounded-sm';

/**
 * Current time line bar
 */
export const currentTimeLineBar = 'h-0.5 w-full bg-red-600 relative';

// ==================== All-Day Event Area ====================

/**
 * All-day event row container
 */
export const allDayRow = 'flex items-center border-b border-gray-200 dark:border-gray-700 sticky';

/**
 * All-day event label
 */
export const allDayLabel =
  'w-20 flex-shrink-0 p-1 text-xs font-medium text-gray-500 dark:text-gray-400 flex justify-end';

/**
 * All-day event content area
 */
export const allDayContent = 'flex flex-1 relative';

/**
 * All-day event cell
 */
export const allDayCell = 'flex-1 border-r border-gray-200 dark:border-gray-700 relative';

// ==================== Event Styles ====================

/**
 * Base event style
 */
export const baseEvent =
  'calendar-event select-none pointer-events-auto px-0.5';

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
  'text-xs px-1 mb-0.5 rounded truncate cursor-pointer flex items-center';

/**
 * MonthView regular event content
 */
export const monthRegularContent =
  'text-xs mb-0.5 cursor-pointer flex items-center justify-between';

/**
 * Event title (small)
 */
export const eventTitleSmall = 'font-medium text-xs truncate pr-1';

/**
 * Event time text
 */
export const eventTime = 'text-xs opacity-80 truncate';

/**
 * Event color bar
 */
export const eventColorBar =
  'absolute left-1 top-1 bottom-1 w-[3px] rounded-full';

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
export const miniCalendarContainer = 'px-2 border-b border-gray-200 dark:border-gray-700';

/**
 * Mini calendar grid
 */
export const miniCalendarGrid =
  'grid grid-cols-7 gap-1 text-xs justify-items-center';

/**
 * Mini calendar weekday title
 */
export const miniCalendarDayHeader =
  'text-center text-gray-500 dark:text-gray-400 font-medium py-1 h-6 w-6';

/**
 * Mini calendar date cell base style
 */
export const miniCalendarDay = 'text-center py-1 rounded text-xs h-6 w-6';

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
export const miniCalendarToday = 'bg-blue-500 rounded-full text-white';

/**
 * Mini calendar selected date
 */
export const miniCalendarSelected =
  'bg-red-100 text-red-600 rounded-full font-medium';

// ==================== Utility Styles ====================

/**
 * Border styles
 */
export const borderGray = 'border-gray-200 dark:border-gray-700';
export const borderBottom = 'border-b border-gray-200 dark:border-gray-700';
export const borderTop = 'border-t border-gray-200 dark:border-gray-700';
export const borderRight = 'border-r border-gray-200 dark:border-gray-700';

/**
 * Text colors
 */
export const textGray500 = 'text-gray-500 dark:text-gray-400';
export const textGray600 = 'text-gray-600 dark:text-gray-300';
export const textGray700 = 'text-gray-700 dark:text-gray-200';
export const textGray800 = 'text-gray-800 dark:text-gray-100';
export const textGray900 = 'text-gray-900 dark:text-white';

/**
 * Text sizes
 */
export const textXs = 'text-xs';
export const textSm = 'text-sm';
export const textBase = 'text-base';
export const textLg = 'text-lg';
export const textXl = 'text-xl';
export const text2xl = 'text-2xl';

/**
 * Background colors
 */
export const bgWhite = 'bg-white dark:bg-gray-900';
export const bgGray50 = 'bg-gray-50 dark:bg-gray-800';
export const bgGray100 = 'bg-gray-100 dark:bg-gray-800';

/**
 * Flex layouts
 */
export const flexRow = 'flex';
export const flexCol = 'flex flex-col';
export const flexCenter = 'flex items-center justify-center';
export const flexBetween = 'flex justify-between items-center';

/**
 * Spacing
 */
export const p1 = 'p-1';
export const p2 = 'p-2';
export const p4 = 'p-4';
export const px1 = 'px-1';
export const px2 = 'px-2';
export const py1 = 'py-1';
export const py2 = 'py-2';
export const m1 = 'm-1';
export const mr1 = 'mr-1';
export const mt3 = 'mt-3';
export const mb2 = 'mb-2';
export const mb3 = 'mb-3';

// ==================== Combined Style Utility Functions ====================

/**
 * Combine multiple class names
 * @param classNames - Array of class name strings
 * @returns Combined class name string
 */
export const cn = (
  ...classNames: (string | undefined | null | false)[]
): string => {
  return classNames.filter(Boolean).join(' ');
};

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
): string => {
  return cn(base, condition ? whenTrue : whenFalse);
};