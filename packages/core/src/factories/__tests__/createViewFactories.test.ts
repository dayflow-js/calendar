import { createDayView } from '@/factories/createDayView';
import { createWeekView } from '@/factories/createWeekView';

describe('view factories config mapping', () => {
  it('maps day top-level config to viewConfig and prioritizes top-level values', () => {
    const dayView = createDayView({
      showAllDay: false,
      viewConfig: {
        showAllDay: true,
        showMiniCalendar: false,
      },
    });

    expect(dayView.config?.viewConfig).toEqual({
      showMiniCalendar: false,
      showAllDay: false,
      scrollToCurrentTime: true,
    });
  });

  it('maps week top-level config to viewConfig and prioritizes top-level values', () => {
    const weekView = createWeekView({
      startOfWeek: 0,
      viewConfig: {
        startOfWeek: 2,
        showWeekends: false,
      },
    });

    expect(weekView.config?.viewConfig).toEqual({
      showWeekends: false,
      showAllDay: true,
      startOfWeek: 0,
      scrollToCurrentTime: true,
    });
  });
});
