<script lang="ts">
  import { onMount, onDestroy, tick } from "svelte";
  import type { Component } from "svelte";
  import { CalendarRenderer } from "@dayflow/core";
  import type {
    ICalendarApp,
    UseCalendarAppReturn,
    CustomRendering,
    EventDetailContentProps,
    EventDetailDialogProps,
    CreateCalendarDialogProps,
    TitleBarSlotProps,
    EventContentSlotArgs,
    ColorPickerProps,
    CreateCalendarDialogColorPickerProps,
    CalendarHeaderProps,
    EventContextMenuSlotArgs,
    GridContextMenuSlotArgs,
    CalendarSearchProps,
  } from "@dayflow/core";

  const {
    calendar,
    eventContentDay = null,
    eventContentWeek = null,
    eventContentMonth = null,
    eventContentYear = null,
    eventContentAllDayDay = null,
    eventContentAllDayWeek = null,
    eventContentAllDayMonth = null,
    eventContentAllDayYear = null,
    eventDetailContent = null,
    eventDetailDialog = null,
    createCalendarDialog = null,
    titleBarSlot = null,
    colorPicker = null,
    createCalendarDialogColorPicker = null,
    calendarHeader = null,
    eventContextMenu = null,
    gridContextMenu = null,
    collapsedSafeAreaLeft = null,
    useEventDetailPanel = null,
    search = null,
  } = $props<{
    calendar: ICalendarApp | UseCalendarAppReturn;
    eventContentDay?: Component<EventContentSlotArgs>;
    eventContentWeek?: Component<EventContentSlotArgs>;
    eventContentMonth?: Component<EventContentSlotArgs>;
    eventContentYear?: Component<EventContentSlotArgs>;
    eventContentAllDayDay?: Component<EventContentSlotArgs>;
    eventContentAllDayWeek?: Component<EventContentSlotArgs>;
    eventContentAllDayMonth?: Component<EventContentSlotArgs>;
    eventContentAllDayYear?: Component<EventContentSlotArgs>;
    eventDetailContent?: Component<EventDetailContentProps>;
    eventDetailDialog?: Component<EventDetailDialogProps>;
    createCalendarDialog?: Component<CreateCalendarDialogProps>;
    titleBarSlot?: Component<TitleBarSlotProps>;
    colorPicker?: Component<ColorPickerProps>;
    createCalendarDialogColorPicker?: Component<CreateCalendarDialogColorPickerProps>;
    calendarHeader?: Component<CalendarHeaderProps>;
    eventContextMenu?: Component<EventContextMenuSlotArgs>;
    gridContextMenu?: Component<GridContextMenuSlotArgs>;
    collapsedSafeAreaLeft?: number | null;
    useEventDetailPanel?: boolean | null;
    search?: CalendarSearchProps | null;
  }>();

  let container: HTMLElement | undefined = $state();
  let renderer: CalendarRenderer | undefined;
  let customRenderings: CustomRendering[] = $state([]);
  let unsubscribe: (() => void) | undefined;
  let mounted = $state(false);

  // Guard for browser environment
  const isBrowser = typeof window !== "undefined";

  const app = $derived(
    ("app" in calendar ? calendar.app : calendar) as ICalendarApp,
  );

  const renderProps = $derived({
    eventContentDay,
    eventContentWeek,
    eventContentMonth,
    eventContentYear,
    eventContentAllDayDay,
    eventContentAllDayWeek,
    eventContentAllDayMonth,
    eventContentAllDayYear,
    eventDetailContent,
    eventDetailDialog,
    createCalendarDialog,
    titleBarSlot,
    colorPicker,
    createCalendarDialogColorPicker,
    calendarHeader,
    eventContextMenu,
    gridContextMenu,
    collapsedSafeAreaLeft,
    useEventDetailPanel,
    search,
  } as Record<string, unknown>);

  onMount(async () => {
    if (!container) {
      return;
    }

    await tick();

    const activeOverrides = Object.keys(renderProps).filter(
      (key) => renderProps[key] !== null,
    );
    renderer = new CalendarRenderer(app, activeOverrides);
    renderer.setProps(renderProps);
    renderer.mount(container);

    unsubscribe = renderer.getCustomRenderingStore().subscribe((renderings) => {
      customRenderings = [...renderings.values()];
    });

    mounted = true;
  });

  onDestroy(() => {
    if (unsubscribe) {
      unsubscribe();
    }
    if (renderer) {
      renderer.unmount();
    }
  });

  // Reactively forward prop changes to the renderer after mount.
  // `mounted` is $state so this effect re-runs when it becomes true, and
  // again whenever unknown renderProp value changes.
  $effect(() => {
    if (!mounted || !renderer) {
      return;
    }
    renderer.setProps(renderProps);
    const activeOverrides = Object.keys(renderProps).filter(
      (key) => renderProps[key] !== null,
    );
    renderer.getCustomRenderingStore().setOverrides(activeOverrides);
    app.setOverrides(activeOverrides);
  });

  function portal(node: HTMLElement, target: HTMLElement) {
    if (!target || !node || !isBrowser) {
      return;
    }
    target.append(node);
    return {
      destroy() {
        if (node.parentNode === target) {
          node.remove();
        }
      },
    };
  }
</script>

{#if isBrowser}
  <div bind:this={container} class="df-calendar-wrapper"></div>

  {#if mounted}
    {#each customRenderings as rendering (rendering.id)}
      {@const DynamicComponent = renderProps[rendering.generatorName] as any}
      {#if DynamicComponent && rendering.containerEl}
        <div use:portal={rendering.containerEl}>
          <DynamicComponent {...(rendering.generatorArgs as any)} />
        </div>
      {/if}
    {/each}
  {/if}
{:else}
  <!-- SSR Placeholder -->
  <div class="df-calendar-wrapper df-calendar-ssr-placeholder"></div>
{/if}
