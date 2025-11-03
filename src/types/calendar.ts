// Calendar and date data type definitions

/**
 * Date data interface
 * Represents detailed information for a single date
 */
export interface DayData {
  date: Date;
  day: number;
  month: number;
  year: number;
  monthName: string;
  shortMonthName: string;
  isToday: boolean;
}

/**
 * Week data interface
 * Represents a week's data, containing date information for 7 days
 */
export interface WeeksData {
  days: DayData[];
  startDate: Date;
  monthYear: {
    month: string;
    monthIndex: number;
    year: number;
  };
}
