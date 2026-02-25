<script lang="ts">
  import { onMount, onDestroy, tick } from "svelte";
  import { CalendarRenderer } from "@dayflow/core";
  import type {
    ICalendarApp,
    UseCalendarAppReturn,
    CustomRendering,
  } from "@dayflow/core";

  const {
    calendar,
    eventContent = null,
    eventDetailContent = null,
    eventDetailDialog = null,
    headerContent = null,
    createCalendarDialog = null,
    titleBarSlot = null,
    colorPicker = null,
    colorPickerWrapper = null,
    collapsedSafeAreaLeft = null,
  } = $props<{
    calendar: ICalendarApp | UseCalendarAppReturn;
    eventContent?: unknown;
    eventDetailContent?: unknown;
    eventDetailDialog?: unknown;
    headerContent?: unknown;
    createCalendarDialog?: unknown;
    titleBarSlot?: unknown;
    colorPicker?: unknown;
    colorPickerWrapper?: unknown;
    collapsedSafeAreaLeft?: number | null;
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
    eventContent,
    eventDetailContent,
    eventDetailDialog,
    headerContent,
    createCalendarDialog,
    titleBarSlot,
    colorPicker,
    colorPickerWrapper,
    collapsedSafeAreaLeft,
  } as Record<string, unknown>);

  onMount(async () => {
    if (!container) {
      return;
    }

    await tick();

    renderer = new CalendarRenderer(app);
    renderer.setProps(renderProps);
    renderer.mount(container);

    unsubscribe = renderer.getCustomRenderingStore().subscribe((renderings) => {
      customRenderings = [...renderings.values()];
    });

    const activeOverrides = Object.keys(renderProps).filter(
      (key) => renderProps[key] !== null,
    );
    renderer.getCustomRenderingStore().setOverrides(activeOverrides);

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
      {@const Component = renderProps[rendering.generatorName] as any}
      {#if Component && rendering.containerEl}
        <div use:portal={rendering.containerEl}>
          <Component {...rendering.generatorArgs as any} />
        </div>
      {/if}
    {/each}
  {/if}
{:else}
  <!-- SSR Placeholder -->
  <div class="df-calendar-wrapper df-calendar-ssr-placeholder"></div>
{/if}
