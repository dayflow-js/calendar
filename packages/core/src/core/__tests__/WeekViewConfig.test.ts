import { createWeekView } from '../../factories/createWeekView';

describe('WeekView Configuration', () => {
  it('should have default mobileColumns set to 2', () => {
    const view = createWeekView();
    expect(view.config.mobileColumns).toBe(2);
  });

  it('should allow overriding mobileColumns to 4', () => {
    const view = createWeekView({ mobileColumns: 4 });
    expect(view.config.mobileColumns).toBe(4);
  });
});
