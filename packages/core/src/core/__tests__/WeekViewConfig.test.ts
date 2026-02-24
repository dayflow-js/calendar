import { createWeekView } from '../../factories/createWeekView';

describe('WeekView Configuration', () => {
  it('should have undefined mode by default', () => {
    const view = createWeekView();
    expect(view.config.mode).toBeUndefined();
  });

  it('should allow overriding mode to standard', () => {
    const view = createWeekView({ mode: 'standard' });
    expect(view.config.mode).toBe('standard');
  });

  it('should allow overriding mode to compact', () => {
    const view = createWeekView({ mode: 'compact' });
    expect(view.config.mode).toBe('compact');
  });
});
