// oxlint-disable react-hooks/rules-of-hooks -- a Svelte hook, not a React one
/**
 * Compiled against the published typings (../index.d.ts), never run. It is
 * what a consumer writes, so a regression in the typings fails `typecheck`.
 */
import DefaultExport, {
  DayFlowCalendar,
  ViewType,
  createMonthView,
  useCalendarApp,
} from '@dayflow/svelte';
import type {
  CalendarAppConfig,
  DayFlowCalendarProps,
  Event,
  EventContentSlotArgs,
} from '@dayflow/svelte';
import { mount } from 'svelte';
import type { Component, ComponentProps } from 'svelte';

const config: CalendarAppConfig = {
  views: [createMonthView()],
  defaultView: ViewType.MONTH,
};

// Both a plain config and a getter are accepted.
const calendar = useCalendarApp(config);
useCalendarApp(() => config);

declare const EventContent: Component<EventContentSlotArgs>;
declare const events: Event[];

mount(DayFlowCalendar, {
  target: document.body,
  props: { calendar, eventContentDay: EventContent },
});
mount(DefaultExport, {
  target: document.body,
  props: { calendar: calendar.app },
});

const props: ComponentProps<typeof DayFlowCalendar> = { calendar };
const sameProps: DayFlowCalendarProps = props;

// @ts-expect-error `calendar` is required
mount(DayFlowCalendar, { target: document.body, props: {} });

// @ts-expect-error slot props take components, not render functions
const wrongSlot: DayFlowCalendarProps = { calendar, titleBarSlot: 'nope' };

export { events, sameProps, wrongSlot };
