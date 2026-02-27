import { createWeekView } from '@/factories/createWeekView';

describe('WeekView Configuration', () => {
  it('should create week view', () => {
    const view = createWeekView();
    expect(view.type).toBe('week');
  });
});
