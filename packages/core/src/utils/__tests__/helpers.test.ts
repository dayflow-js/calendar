import { Temporal } from 'temporal-polyfill';

import {
  isMultiDayEvent,
  extractHourFromDate,
  formatTime,
  roundToTimeStep,
  generateUniKey,
  isSameDay,
} from '@/utils/helpers';

describe('helpers', () => {
  describe('isMultiDayEvent', () => {
    it('should return false for same-day events', () => {
      const start = Temporal.PlainDate.from('2025-01-15');
      const end = Temporal.PlainDate.from('2025-01-15');

      expect(isMultiDayEvent(start, end)).toBe(false);
    });

    it('should return true for multi-day events', () => {
      const start = Temporal.PlainDate.from('2025-01-15');
      const end = Temporal.PlainDate.from('2025-01-17');

      expect(isMultiDayEvent(start, end)).toBe(true);
    });

    it('should handle ZonedDateTime', () => {
      const start = Temporal.ZonedDateTime.from('2025-01-15T09:00:00[UTC]');
      const end = Temporal.ZonedDateTime.from('2025-01-17T10:00:00[UTC]');

      expect(isMultiDayEvent(start, end)).toBe(true);
    });
  });

  describe('extractHourFromDate', () => {
    it('should extract hour from Date', () => {
      const date = new Date('2025-01-15T14:30:00');
      const hour = extractHourFromDate(date);

      expect(hour).toBe(14.5);
    });

    it('should extract hour from ZonedDateTime', () => {
      const zdt = Temporal.ZonedDateTime.from('2025-01-15T09:15:00[UTC]');
      const hour = extractHourFromDate(zdt);

      expect(hour).toBe(9.25);
    });
  });

  describe('formatTime', () => {
    it('should format time correctly', () => {
      expect(formatTime(9, 0)).toBe('09:00');
      expect(formatTime(14, 30)).toBe('14:30');
      expect(formatTime(23, 45)).toBe('23:45');
    });
  });

  describe('roundToTimeStep', () => {
    it('should round to nearest 15 minutes', () => {
      expect(roundToTimeStep(9.1)).toBe(9);
      expect(roundToTimeStep(9.3)).toBe(9.25);
      expect(roundToTimeStep(9.6)).toBe(9.5);
      expect(roundToTimeStep(9.9)).toBe(10);
    });
  });

  describe('generateUniKey', () => {
    it('should generate unique keys', () => {
      const key1 = generateUniKey();
      const key2 = generateUniKey();

      expect(key1).not.toBe(key2);
      expect(typeof key1).toBe('string');
      expect(key1.length).toBeGreaterThan(0);
    });
  });

  describe('isSameDay', () => {
    it('should return true for same day dates', () => {
      const date1 = new Date('2025-01-15T09:00:00');
      const date2 = new Date('2025-01-15T14:00:00');

      expect(isSameDay(date1, date2)).toBe(true);
    });

    it('should return false for different days', () => {
      const date1 = new Date('2025-01-15T09:00:00');
      const date2 = new Date('2025-01-16T09:00:00');

      expect(isSameDay(date1, date2)).toBe(false);
    });
  });
});
