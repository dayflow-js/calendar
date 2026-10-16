/** Keep the surrounding detail surface still and scroll only long notes. */
export function fitNotesToViewport(
  container: HTMLElement | null,
  content: HTMLTextAreaElement | HTMLDivElement | null,
  preferredHeight?: number
): void {
  if (!container || !content) return;

  content.style.maxHeight = 'none';
  content.style.height = 'auto';
  const naturalHeight = content.scrollHeight;
  content.style.height = `${naturalHeight}px`;

  const borders = container.offsetHeight - container.clientHeight;
  const otherHeight = container.scrollHeight - content.offsetHeight + borders;
  const availableHeight = Math.max(48, window.innerHeight - 16 - otherHeight);
  content.style.maxHeight = `${availableHeight}px`;
  content.style.height = `${Math.min(preferredHeight ?? naturalHeight, availableHeight)}px`;
}
