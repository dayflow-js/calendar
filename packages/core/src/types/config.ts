// Configuration-related type definitions

import { ViewType } from './core';

/**
 * Drag configuration type
 * Defines configuration parameters for drag functionality
 */
export interface DragConfig {
  viewType: ViewType;

  // Color utility function
  getLineColor: (color: string) => string;

  // Dynamic padding utility function
  getDynamicPadding: (drag: { endHour: number; startHour: number }) => string;

  // Layout constants
  HOUR_HEIGHT: number;
  FIRST_HOUR: number;
  LAST_HOUR: number;
  MIN_DURATION: number;
  TIME_COLUMN_WIDTH: number;
  ALL_DAY_HEIGHT: number;
}
