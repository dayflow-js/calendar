<script lang="ts">
  import { onMount, onDestroy, tick, untrack } from "svelte";
  import { CalendarRenderer } from "@dayflow/core";
  import type { ICalendarApp, CustomRendering } from "@dayflow/core";
  // The published typings are the single source of truth for the props.
  // oxlint-disable-next-line import/no-relative-parent-imports
  import type { DayFlowCalendarProps } from "../index";

  const {
    calendar,
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
    gridPopupContent,
    monthDateNumberContent,
    mobileEventDetail,
    collapsedSafeAreaLeft,
    search,
    sidebar,
    sidebarHeader,
    calendarContextMenu,
  }: DayFlowCalendarProps = $props();

  let container: HTMLElement | undefined = $state();
  let renderer: CalendarRenderer | undefined;
  let customRenderings: CustomRendering[] = $state([]);
  let unsubscribe: (() => void) | undefined;
  let mounted = $state(false);
  let destroyed = false;
  // The app the current renderer was built for.
  let renderedApp: ICalendarApp | undefined;

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
    gridPopupContent,
    monthDateNumberContent,
    mobileEventDetail,
    collapsedSafeAreaLeft,
    search,
    sidebar,
    sidebarHeader,
    calendarContextMenu,
  } as Record<string, unknown>);

  const getActiveOverrides = () =>
    Object.keys(renderProps).filter(
      (key) => renderProps[key] !== null && renderProps[key] !== undefined,
    );

  function createRenderer(target: HTMLElement) {
    renderedApp = app;
    renderer = new CalendarRenderer(app, getActiveOverrides());
    renderer.setProps(renderProps);

    // Subscribe BEFORE mount. mount() renders synchronously and registers every
    // placeholder in one burst; subscribing afterwards means those registrations
    // only arrive via the initial sync on a later tick, leaving the slots empty
    // for a frame. Same ordering the React adapter relies on.
    unsubscribe = renderer.getCustomRenderingStore().subscribe((renderings) => {
      customRenderings = [...renderings.values()];
    });

    renderer.mount(target);
  }

  function destroyRenderer() {
    unsubscribe?.();
    renderer?.unmount();
    unsubscribe = undefined;
    renderer = undefined;
  }

  onMount(async () => {
    await tick();

    // The component can be destroyed while the tick is pending.
    if (!container || destroyed) {
      return;
    }

    createRenderer(container);
    mounted = true;
  });

  onDestroy(() => {
    destroyed = true;
    destroyRenderer();
  });

  // Rebuild the renderer when the calendar prop is replaced with another app.
  // Declared before the prop-forwarding effect so that one sees the new renderer.
  $effect(() => {
    const nextApp = app;
    if (!mounted || !container || nextApp === renderedApp) {
      return;
    }
    const target = container;
    untrack(() => {
      destroyRenderer();
      createRenderer(target);
    });
  });

  // Reactively forward prop changes to the renderer after mount.
  // `mounted` is $state so this effect re-runs when it becomes true, and
  // again whenever unknown renderProp value changes.
  $effect(() => {
    if (!mounted || !renderer) {
      return;
    }
    renderer.setProps(renderProps);
    const activeOverrides = getActiveOverrides();
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
