import type {
  ICalendarApp,
  CustomRendering,
  UseCalendarAppReturn,
  CalendarSearchProps,
  EventContentSlotArgs,
  EventContextMenuSlotArgs,
  GridContextMenuSlotArgs,
  GridPopupContentSlotArgs,
  MonthDateNumberSlotArgs,
  EventDetailContentProps,
  EventDetailDialogProps,
  CreateCalendarDialogProps,
  TitleBarSlotProps,
  ColorPickerProps,
  CreateCalendarDialogColorPickerProps,
  CalendarHeaderProps,
  MobileEventProps,
  CalendarSidebarRenderProps,
  SidebarHeaderSlotArgs,
  CalendarContextMenuSlotArgs,
} from '@dayflow/core';
import { CalendarRenderer } from '@dayflow/core';
import type { PropType, Slot, SlotsType } from 'vue';
import {
  defineComponent,
  h,
  ref,
  onBeforeUpdate,
  onMounted,
  onUnmounted,
  shallowRef,
  Teleport,
  computed,
  watch,
} from 'vue';

/** Slots of `DayFlowCalendar` and the args each one receives. */
export interface DayFlowCalendarSlots {
  eventContentDay?: EventContentSlotArgs;
  eventContentWeek?: EventContentSlotArgs;
  eventContentMonth?: EventContentSlotArgs;
  eventContentYear?: EventContentSlotArgs;
  eventContentAllDayDay?: EventContentSlotArgs;
  eventContentAllDayWeek?: EventContentSlotArgs;
  eventContentAllDayMonth?: EventContentSlotArgs;
  eventContentAllDayYear?: EventContentSlotArgs;
  eventDetailContent?: EventDetailContentProps;
  eventDetailDialog?: EventDetailDialogProps;
  createCalendarDialog?: CreateCalendarDialogProps;
  titleBarSlot?: TitleBarSlotProps;
  colorPicker?: ColorPickerProps;
  createCalendarDialogColorPicker?: CreateCalendarDialogColorPickerProps;
  calendarHeader?: CalendarHeaderProps;
  eventContextMenu?: EventContextMenuSlotArgs;
  gridContextMenu?: GridContextMenuSlotArgs;
  gridPopupContent?: GridPopupContentSlotArgs;
  monthDateNumberContent?: MonthDateNumberSlotArgs;
  mobileEventDetail?: MobileEventProps;
  sidebar?: CalendarSidebarRenderProps;
  sidebarHeader?: SidebarHeaderSlotArgs;
  calendarContextMenu?: CalendarContextMenuSlotArgs;
}

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
    search: {
      type: Object as PropType<CalendarSearchProps>,
      default: undefined,
    },
  },
  slots: Object as SlotsType<DayFlowCalendarSlots>,
  setup(props, { slots }) {
    const container = ref<HTMLElement | null>(null);
    const renderer = shallowRef<CalendarRenderer | null>(null);
    const customRenderings = ref<CustomRendering[]>([]);

    // Store subscription cleanup so it can be replaced when the app changes.
    let storeUnsubscribe: (() => void) | null = null;
    // Slot names the renderer currently treats as overridden.
    let activeOverrides: string[] = [];

    // Extract underlying app instance
    const app = computed<ICalendarApp>(
      () =>
        (props.calendar as UseCalendarAppReturn).app ||
        (props.calendar as ICalendarApp)
    );

    // All renderer-level props in one object so a single watcher handles them all.
    const extraProps = computed(() => ({
      collapsedSafeAreaLeft: props.collapsedSafeAreaLeft,
      search: props.search,
    }));

    function initRenderer(appInstance: ICalendarApp) {
      if (!container.value) {
        return;
      }

      // Tear down the previous renderer if the app instance was replaced.
      storeUnsubscribe?.();
      renderer.value?.unmount();

      activeOverrides = Object.keys(slots);
      const r = new CalendarRenderer(appInstance, activeOverrides);
      renderer.value = r;
      r.setProps(extraProps.value);

      // Subscribe BEFORE mount. mount() renders synchronously and registers
      // every placeholder in one burst; subscribing afterwards means those
      // registrations arrive via the initial sync on a later tick, leaving the
      // slots empty for a frame. Same ordering the React adapter relies on.
      storeUnsubscribe = r.getCustomRenderingStore().subscribe(renderings => {
        customRenderings.value = [...renderings.values()];
      });

      r.mount(container.value);
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

    // Slots behind a v-if come and go after mount. A parent re-render with a
    // different slot set updates this component, so resync the overrides here.
    onBeforeUpdate(() => {
      if (!renderer.value) {
        return;
      }
      const next = Object.keys(slots);
      if (
        next.length === activeOverrides.length &&
        next.every((name, i) => name === activeOverrides[i])
      ) {
        return;
      }
      activeOverrides = next;
      renderer.value.getCustomRenderingStore().setOverrides(next);
      app.value.setOverrides(next);
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
          // Keyed like the other adapters: without it Vue patches by position
          // and a removed placeholder hands its content to the next one.
          { key: rendering.id, to: rendering.containerEl },
          {
            default: () =>
              (slots as Record<string, Slot | undefined>)[
                rendering.generatorName
              ]?.(rendering.generatorArgs),
          }
        )
      ),
    ];
  },
});

export default DayFlowCalendar;
