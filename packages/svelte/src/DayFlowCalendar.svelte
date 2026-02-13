<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { 
    CalendarRenderer, 
    type ICalendarApp, 
    type UseCalendarAppReturn, 
    type CustomRendering 
  } from '@dayflow/core';

  export let calendar: ICalendarApp | UseCalendarAppReturn;
  export let className: string = '';
  export let style: string = '';
  
  // Custom renderers passed as props (Svelte components)
  export let eventContent: any = null;
  export let eventDetailContent: any = null;
  export let eventDetailDialog: any = null;
  export let headerContent: any = null;
  export let createCalendarDialog: any = null;
  export let titleBarSlot: any = null;
  export let colorPicker: any = null;
  export let colorPickerWrapper: any = null;

  let container: HTMLElement;
  let renderer: CalendarRenderer;
  let customRenderings: CustomRendering[] = [];
  let unsubscribe: () => void;

  $: app = (calendar as any).app || calendar;
  
  const renderProps: Record<string, any> = {
    eventContent,
    eventDetailContent,
    eventDetailDialog,
    headerContent,
    createCalendarDialog,
    titleBarSlot,
    colorPicker,
    colorPickerWrapper
  };

  onMount(() => {
    renderer = new CalendarRenderer(app);
    renderer.mount(container);

    unsubscribe = renderer.getCustomRenderingStore().subscribe((renderings) => {
      customRenderings = Array.from(renderings.values());
    });
  });

  onDestroy(() => {
    if (unsubscribe) unsubscribe();
    if (renderer) renderer.unmount();
  });

  function portal(node: HTMLElement, target: HTMLElement) {
    target.appendChild(node);
    return {
      destroy() {
        if (node.parentNode === target) {
          target.removeChild(node);
        }
      }
    };
  }
</script>

<div class={className} {style}>
  <div bind:this={container} class="df-core-container" style="height: 100%"></div>
  
  {#each customRenderings as rendering (rendering.id)}
    {@const Component = renderProps[rendering.generatorName]}
    {#if Component}
      <div use:portal={rendering.containerEl}>
        <svelte:component this={Component} {...rendering.generatorArgs} />
      </div>
    {/if}
  {/each}
</div>
