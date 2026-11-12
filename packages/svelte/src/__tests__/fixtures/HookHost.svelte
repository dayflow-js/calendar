<script lang="ts">
  import { useCalendarApp } from "../../useCalendarApp.svelte";

  const { locale = "en" }: { locale?: string } = $props();

  const calendar = useCalendarApp(() => ({ views: [], locale }) as never);
</script>

<span data-testid="view">{calendar.currentView}</span>
