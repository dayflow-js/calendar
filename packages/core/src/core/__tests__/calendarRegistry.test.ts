import { CalendarRegistry } from '@/core/calendarRegistry';
import { CalendarType } from '@/types/calendarTypes';

const mockColors = {
  eventColor: '#eff6ff',
  eventSelectedColor: '#3b82f6',
  lineColor: '#3b82f6',
  textColor: '#1e3a8a',
};

describe('CalendarRegistry', () => {
  let registry: CalendarRegistry;
  const calendars: CalendarType[] = [
    { id: '1', name: 'Cal 1', colors: mockColors, isVisible: true },
    { id: '2', name: 'Cal 2', colors: mockColors, isVisible: true },
    { id: '3', name: 'Cal 3', colors: mockColors, isVisible: false },
  ];

  beforeEach(() => {
    registry = new CalendarRegistry(calendars);
  });

  describe('Visibility Enforcement', () => {
    it('should ensure at least one visible during initialization', () => {
      const allHidden = [
        { id: '1', name: 'Cal 1', colors: mockColors, isVisible: false },
        { id: '2', name: 'Cal 2', colors: mockColors, isVisible: false },
      ];
      const newRegistry = new CalendarRegistry(allHidden);
      expect(newRegistry.getVisible()).toHaveLength(1);
    });

    it('should prevent hiding the last visible calendar', () => {
      // Hide second one, leaving only the first one visible
      registry.setVisibility('2', false);
      expect(registry.getVisible()).toHaveLength(1);
      expect(registry.getVisible()[0].id).toBe('1');

      // Try to hide the last visible one
      registry.setVisibility('1', false);
      expect(registry.getVisible()).toHaveLength(1);
      expect(registry.getVisible()[0].id).toBe('1');
    });

    it('should ensure at least one visible after setAllVisibility(false)', () => {
      registry.setAllVisibility(false);
      const visible = registry.getVisible();
      expect(visible.length).toBeGreaterThanOrEqual(1);
      expect(visible.length).toBe(1);
    });

    it('should ensure at least one visible after unregistering the only visible calendar', () => {
      // Setup: 1 visible, 1 hidden
      registry.setVisibility('2', false);
      expect(registry.getVisible()).toHaveLength(1);
      expect(registry.getVisible()[0].id).toBe('1');

      // Unregister the only visible one
      registry.unregister('1');

      // Now either 2 or 3 should have become visible
      const visible = registry.getVisible();
      expect(visible.length).toBeGreaterThanOrEqual(1);
      expect(registry.has('1')).toBe(false);
    });

    it('should handle setAllVisibility(true)', () => {
      registry.setAllVisibility(true);
      expect(registry.getVisible()).toHaveLength(3);
    });
  });
});
