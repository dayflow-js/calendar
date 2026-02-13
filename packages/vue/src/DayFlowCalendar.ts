import { defineComponent, h, ref, onMounted, onUnmounted, shallowRef, PropType, Teleport, computed } from 'vue';
import { CalendarRenderer, ICalendarApp, CustomRendering, UseCalendarAppReturn } from '@dayflow/core';

export const DayFlowCalendar = defineComponent({
  name: 'DayFlowCalendar',
  props: {
    calendar: {
      type: Object as PropType<ICalendarApp | UseCalendarAppReturn>,
      required: true,
    },
    className: {
      type: String,
      default: '',
    },
    style: {
      type: Object as PropType<any>,
      default: () => ({}),
    },
  },
  setup(props, { slots }) {
    const container = ref<HTMLElement | null>(null);
    const renderer = shallowRef<CalendarRenderer | null>(null);
    const customRenderings = ref<CustomRendering[]>([]);

    // Extract underlying app instance
    const app = computed(() => {
      return (props.calendar as any).app || props.calendar;
    });

    onMounted(() => {
      if (!container.value) return;

      const r = new CalendarRenderer(app.value);
      renderer.value = r;
      r.mount(container.value);

      const unsubscribe = r.getCustomRenderingStore().subscribe((renderings) => {
        customRenderings.value = Array.from(renderings.values());
      });

      onUnmounted(() => {
        unsubscribe();
        r.unmount();
        renderer.value = null;
      });
    });

    return () => h('div', { class: props.className, style: props.style }, [
      h('div', { ref: container, class: 'df-core-container', style: { height: '100%' } }),
      ...customRenderings.value.map(rendering => 
        h(Teleport, { to: rendering.containerEl }, {
          default: () => slots[rendering.generatorName]?.(rendering.generatorArgs)
        })
      )
    ]);
  },
});

export default DayFlowCalendar;
