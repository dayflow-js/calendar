import {
  createFakeApp,
  createdRenderers,
  initialOverrides,
  lifecycleLog,
  resetCoreFake,
  expectUnsubscribeBeforeUnmount,
  expectNoEmptyEmitAfterMount,
  expectAdapterContract,
} from '@test-kit';
import type { FakeApp } from '@test-kit';
/**
 * Vue adapter: slots in, Teleports out.
 *
 * The lifecycle rules are shared with every other adapter (see
 * `test-kit`); the slot plumbing is Vue-specific.
 */
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';

import { DayFlowCalendar } from '../DayFlowCalendar';

beforeEach(() => {
  resetCoreFake();
});

const titleSlot = () => h('span', 'my toolbar');

describe('DayFlowCalendar (Vue) — mount', () => {
  it('renders the wrapper div and mounts a renderer', () => {
    const app = createFakeApp();
    const wrapper = mount(DayFlowCalendar, {
      props: { calendar: app as never },
    });

    expect(wrapper.find('.df-calendar-wrapper').exists()).toBe(true);
    expect(createdRenderers).toHaveLength(1);
    wrapper.unmount();
  });

  it('derives overrides from the slot names it was given', () => {
    const app = createFakeApp();
    const wrapper = mount(DayFlowCalendar, {
      props: { calendar: app as never },
      slots: { titleBarSlot: titleSlot },
    });

    expect(initialOverrides(lifecycleLog)).toEqual(['titleBarSlot']);
    wrapper.unmount();
  });

  it('teleports slot content into the placeholder the core registered', async () => {
    const app = createFakeApp();
    const wrapper = mount(DayFlowCalendar, {
      props: { calendar: app as never },
      slots: { titleBarSlot: titleSlot },
      attachTo: document.body,
    });
    await nextTick();

    const placeholder = document.querySelector('[data-slot="titleBarSlot"]');
    expect(placeholder).not.toBeNull();
    expect(placeholder).toHaveTextContent('my toolbar');
    wrapper.unmount();
  });

  it('passes the generator args to the slot', async () => {
    const app = createFakeApp();
    const received: unknown[] = [];
    const wrapper = mount(DayFlowCalendar, {
      props: { calendar: app as never },
      slots: {
        titleBarSlot: (args: unknown) => {
          received.push(args);
          return h('span', 'args');
        },
      },
      attachTo: document.body,
    });
    await nextTick();

    expect(received[0]).toMatchObject({ slot: 'titleBarSlot' });
    wrapper.unmount();
  });

  it('forwards renderer-level props on change', async () => {
    const app = createFakeApp();
    const wrapper = mount(DayFlowCalendar, {
      props: { calendar: app as never, collapsedSafeAreaLeft: 10 },
    });

    await wrapper.setProps({ collapsedSafeAreaLeft: 24 });
    await nextTick();

    const propUpdates = lifecycleLog.filter(e => e.type === 'setProps');
    expect(propUpdates.at(-1)).toMatchObject({
      props: { collapsedSafeAreaLeft: 24 },
    });
    wrapper.unmount();
  });

  it('pushes the initial overrides onto the app', () => {
    const app = createFakeApp();
    const wrapper = mount(DayFlowCalendar, {
      props: { calendar: app as never },
      slots: { titleBarSlot: titleSlot },
    });

    expect((app as FakeApp).overrides).toEqual(['titleBarSlot']);
    wrapper.unmount();
  });
});

describe('DayFlowCalendar (Vue) — conditional slots', () => {
  const Host = defineComponent({
    props: {
      calendar: { type: Object, required: true },
      withHeader: { type: Boolean, default: false },
    },
    setup(props) {
      return () =>
        h(
          DayFlowCalendar,
          { calendar: props.calendar as never },
          {
            titleBarSlot: titleSlot,
            ...(props.withHeader
              ? { calendarHeader: () => h('span', 'the header') }
              : {}),
          }
        );
    },
  });

  it('adds an override when a slot appears after mount', async () => {
    const app = createFakeApp();
    const wrapper = mount(Host, { props: { calendar: app } });

    await wrapper.setProps({ withHeader: true });

    expect((app as FakeApp).overrides).toEqual([
      'titleBarSlot',
      'calendarHeader',
    ]);
    wrapper.unmount();
  });

  it('drops an override when its slot goes away', async () => {
    const app = createFakeApp();
    const wrapper = mount(Host, {
      props: { calendar: app, withHeader: true },
    });

    await wrapper.setProps({ withHeader: false });

    expect((app as FakeApp).overrides).toEqual(['titleBarSlot']);
    wrapper.unmount();
  });

  it('leaves the overrides alone when the slot set is unchanged', async () => {
    const app = createFakeApp();
    const wrapper = mount(DayFlowCalendar, {
      props: { calendar: app as never, collapsedSafeAreaLeft: 10 },
      slots: { titleBarSlot: titleSlot },
    });
    const before = lifecycleLog.filter(e => e.type === 'setOverrides').length;

    await wrapper.setProps({ collapsedSafeAreaLeft: 24 });

    expect(lifecycleLog.filter(e => e.type === 'setOverrides')).toHaveLength(
      before
    );
    wrapper.unmount();
  });
});

describe('DayFlowCalendar (Vue) — teardown', () => {
  it('unsubscribes before unmounting the renderer', () => {
    const app = createFakeApp();
    const wrapper = mount(DayFlowCalendar, {
      props: { calendar: app as never },
      slots: { titleBarSlot: titleSlot },
    });

    wrapper.unmount();

    expectUnsubscribeBeforeUnmount(lifecycleLog);
  });

  it('never hands the adapter an empty map after mount', () => {
    const app = createFakeApp();
    const wrapper = mount(DayFlowCalendar, {
      props: { calendar: app as never },
      slots: { titleBarSlot: titleSlot },
    });
    wrapper.unmount();

    expectNoEmptyEmitAfterMount(lifecycleLog);
  });

  it('rebuilds the renderer when the calendar prop is replaced', async () => {
    const first = createFakeApp();
    const second = createFakeApp();
    const wrapper = mount(DayFlowCalendar, {
      props: { calendar: first as never },
      slots: { titleBarSlot: titleSlot },
      attachTo: document.body,
    });

    await wrapper.setProps({ calendar: second as never });
    await nextTick();

    expect(createdRenderers).toHaveLength(2);
    expectUnsubscribeBeforeUnmount(lifecycleLog);
    wrapper.unmount();
  });
});

describe('Vue adapter conformance', () => {
  it('satisfies the shared contract on mount and unmount', () => {
    const app = createFakeApp();
    const wrapper = mount(DayFlowCalendar, {
      props: { calendar: app as never },
      slots: { titleBarSlot: titleSlot },
      attachTo: document.body,
    });
    wrapper.unmount();

    expectAdapterContract(lifecycleLog);
  });

  it('satisfies the shared contract when the calendar is swapped', async () => {
    const first = createFakeApp();
    const second = createFakeApp();
    const wrapper = mount(DayFlowCalendar, {
      props: { calendar: first as never },
      slots: { titleBarSlot: titleSlot },
      attachTo: document.body,
    });

    await wrapper.setProps({ calendar: second as never });
    await nextTick();
    wrapper.unmount();

    expectAdapterContract(lifecycleLog);
  });
});
