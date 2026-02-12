import { defineComponent, h, ref, onMounted, onUnmounted, shallowRef, PropType, Teleport } from 'vue';
import { CalendarRenderer, ICalendarApp, CustomRendering } from '@dayflow/core';

export const DayFlowCalendar = defineComponent({
  name: 'DayFlowCalendar',
  props: {
    app: {
      type: Object as PropType<ICalendarApp>,
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

    onMounted(() => {
      if (!container.value) return;

      const r = new CalendarRenderer(props.app);
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
