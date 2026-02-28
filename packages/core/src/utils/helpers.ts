/**
 * Helpers Module - Backward Compatibility Exports
 *
 * This file has been refactored into multiple specialized modules for better organization.
 * All functions are re-exported here for backward compatibility with existing code.
 *
 * New code should import directly from the specific utility modules:
 * - dateTimeUtils.ts - Date/time conversion and comparison functions
 * - colorUtils.ts - Color resolution functions
 * - timeUtils.ts - Time formatting and calculations
 * - dateConstants.ts - Day and month name constants
 * - dateRangeUtils.ts - Week range calculations
 * - calendarDataUtils.ts - Calendar data generation
 * - eventUtils.ts - Event filtering and manipulation
 * - testDataUtils.ts - Test/demo data generation
 * - utilityFunctions.ts - General utility functions
 */

// Re-export Date/Time utilities
export {
  extractHourFromDate,
  createDateWithHour,
  getStartOfDay,
  getEndOfDay,
  isSameDay,
  isMultiDayEvent,
} from './dateTimeUtils';

// Re-export Color utilities
export {
  getEventBgColor,
  getEventTextColor,
  getSelectedBgColor,
  getLineColor,
} from './colorUtils';

// Re-export Time utilities
export {
  TIME_STEP,
  formatTime,
  formatEventTimeRange,
  roundToTimeStep,
  getEventEndHour,
  generateSecondaryTimeSlots,
  getTimezoneDisplayLabel,
} from './timeUtils';

// Re-export Date constants
export {
  weekDays,
  weekDaysFullName,
  monthNames,
  shortMonthNames,
} from './dateConstants';

// Re-export Date range utilities
export { getWeekRange, getCurrentWeekDates } from './dateRangeUtils';

// Re-export Calendar data generation utilities
export {
  generateDayData,
  generateWeekData,
  getMonthYearOfWeek,
  generateWeeksData,
  generateWeekRange,
} from './calendarDataUtils';

// Re-export Event utilities
export {
  getEventsForDay,
  getAllDayEventsForDay,
  getDateByDayIndex,
  updateEventDateAndDay,
  createEventWithDate,
  calculateDayIndex,
  isEventInWeek,
  recalculateEventDays,
  getDayIndexByDate,
  getEventsForWeek,
  createEventWithRealDate,
  updateEventWithRealDate,
  isEventDeepEqual,
} from './eventUtils';

// Re-export Test data utilities
export { getTestEvents } from './testDataUtils';

// Re-export General utilities
export { generateUniKey } from './utilityFunctions';
export { isDeepEqual } from './compareUtils';
