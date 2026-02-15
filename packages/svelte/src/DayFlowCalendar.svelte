<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import {
    CalendarRenderer,
    type ICalendarApp,
    type UseCalendarAppReturn,
    type CustomRendering,
  } from '@dayflow/core';

  let {
    calendar,
    eventContent = null,
    eventDetailContent = null,
    eventDetailDialog = null,
    headerContent = null,
    createCalendarDialog = null,
    titleBarSlot = null,
    colorPicker = null,
    colorPickerWrapper = null,
  } = $props<{
    calendar: ICalendarApp | UseCalendarAppReturn;
    eventContent?: any;
    eventDetailContent?: any;
    eventDetailDialog?: any;
    headerContent?: any;
    createCalendarDialog?: any;
    titleBarSlot?: any;
    colorPicker?: any;
    colorPickerWrapper?: any;
  }>();

  let container: HTMLElement | undefined = $state();
  let renderer: CalendarRenderer | undefined;
  let customRenderings: CustomRendering[] = $state([]);
  let unsubscribe: (() => void) | undefined;
  let mounted = $state(false);

  // Guard for browser environment
  const isBrowser = typeof window !== 'undefined';

  const app = $derived((calendar as any).app || calendar);

  const renderProps = $derived({
    eventContent,
    eventDetailContent,
    eventDetailDialog,
    headerContent,
    createCalendarDialog,
    titleBarSlot,
    colorPicker,
    colorPickerWrapper,
  } as Record<string, any>);

  onMount(async () => {
    if (!container) return;

    await tick();

    const { CalendarRenderer } = await import('@dayflow/core');

    renderer = new CalendarRenderer(app);
    renderer.mount(container);

    unsubscribe = renderer.getCustomRenderingStore().subscribe(renderings => {
      customRenderings = Array.from(renderings.values());
    });

    const activeOverrides = Object.keys(renderProps).filter(
      key => renderProps[key] !== null
    );
    renderer.getCustomRenderingStore().setOverrides(activeOverrides);

    mounted = true;
  });

  onDestroy(() => {
    if (unsubscribe) unsubscribe();
    if (renderer) renderer.unmount();
  });

  function portal(node: HTMLElement, target: HTMLElement) {
    if (!target || !node || !isBrowser) return;
    target.appendChild(node);
    return {
      destroy() {
        if (node.parentNode === target) {
          target.removeChild(node);
        }
      },
    };
  }
</script>

{#if isBrowser}
  <div bind:this={container} class="df-calendar-wrapper"></div>

  {#if mounted}
    {#each customRenderings as rendering (rendering.id)}
      {@const Component = renderProps[rendering.generatorName]}
      {#if Component && rendering.containerEl}
        <div use:portal={rendering.containerEl}>
          <Component {...rendering.generatorArgs} />
        </div>
      {/if}
    {/each}
  {/if}
{:else}
  <!-- SSR Placeholder -->
  <div class="df-calendar-wrapper df-calendar-ssr-placeholder"></div>
{/if}
