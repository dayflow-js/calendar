import type {
  ICalendarApp,
  CustomRendering,
  UseCalendarAppReturn,
  CalendarSearchProps,
} from '@dayflow/core';
import { CalendarRenderer } from '@dayflow/core';
import type { PropType } from 'vue';
import {
  defineComponent,
  h,
  ref,
  onMounted,
  onUnmounted,
  shallowRef,
  Teleport,
  computed,
  watch,
} from 'vue';

export const DayFlowCalendar = defineComponent({
  name: 'DayFlowCalendar',
  props: {
    calendar: {
      type: Object as PropType<ICalendarApp | UseCalendarAppReturn>,
      required: true,
    },
    collapsedSafeAreaLeft: {
      type: Number as PropType<number>,
      default: undefined,
    },
    useEventDetailPanel: {
      // Avoid Vue's Boolean-casting: absent prop stays undefined (panel enabled),
      // explicit false disables the panel.
      type: null as unknown as PropType<boolean>,
      default: undefined,
    },
    search: {
      type: Object as PropType<CalendarSearchProps>,
      default: undefined,
    },
  },
  setup(props, { slots }) {
    const container = ref<HTMLElement | null>(null);
    const renderer = shallowRef<CalendarRenderer | null>(null);
    const customRenderings = ref<CustomRendering[]>([]);

    // Store subscription cleanup so it can be replaced when the app changes.
    let storeUnsubscribe: (() => void) | null = null;

    // Extract underlying app instance
    const app = computed<ICalendarApp>(
      () =>
        (props.calendar as UseCalendarAppReturn).app ||
        (props.calendar as ICalendarApp)
    );

    // All renderer-level props in one object so a single watcher handles them all.
    const extraProps = computed(() => ({
      collapsedSafeAreaLeft: props.collapsedSafeAreaLeft,
      useEventDetailPanel: props.useEventDetailPanel,
      search: props.search,
    }));

    function initRenderer(appInstance: ICalendarApp) {
      if (!container.value) {
        return;
      }

      // Tear down the previous renderer if the app instance was replaced.
      storeUnsubscribe?.();
      renderer.value?.unmount();

      const r = new CalendarRenderer(appInstance, Object.keys(slots));
      renderer.value = r;
      r.setProps(extraProps.value);
      r.mount(container.value);

      storeUnsubscribe = r.getCustomRenderingStore().subscribe(renderings => {
        customRenderings.value = [...renderings.values()];
      });
    }

    watch(
      extraProps,
      val => {
        renderer.value?.setProps(val);
      },
      { deep: true }
    );

    // Recreate the renderer when the calendar prop is replaced (e.g. after
    // client-side navigation to a different calendar instance).
    watch(app, newApp => {
      if (container.value) {
        initRenderer(newApp);
      }
    });

    onMounted(() => {
      initRenderer(app.value);

      onUnmounted(() => {
        storeUnsubscribe?.();
        renderer.value?.unmount();
        renderer.value = null;
      });
    });

    return () => [
      h('div', { ref: container, class: 'df-calendar-wrapper' }),
      ...customRenderings.value.map(rendering =>
        h(
          Teleport,
          { to: rendering.containerEl },
          {
            default: () =>
              slots[rendering.generatorName]?.(rendering.generatorArgs),
          }
        )
      ),
    ];
  },
});

export default DayFlowCalendar;
