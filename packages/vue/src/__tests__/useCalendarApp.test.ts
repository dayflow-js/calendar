import { calendarAppInstances, resetCalendarAppFake } from '@test-kit';
/**
 * `useCalendarApp` creates the app, so it is the one that has to destroy it:
 * plugins hold global listeners that outlive the component otherwise.
 */
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';

import { useCalendarApp } from '../composables/useCalendarApp';

beforeEach(() => {
  resetCalendarAppFake();
});

const Host = defineComponent({
  setup() {
    // oxlint-disable-next-line react-hooks/rules-of-hooks -- a Vue composable
    useCalendarApp({ views: [] } as never);
    return () => h('div');
  },
});

describe('useCalendarApp (Vue)', () => {
  it('destroys the app when the owning component unmounts', () => {
    const wrapper = mount(Host);
    const [app] = calendarAppInstances;

    expect(app.destroyed).toBe(false);

    wrapper.unmount();

    expect(app.destroyed).toBe(true);
    expect(app.listeners.size).toBe(0);
  });
});
