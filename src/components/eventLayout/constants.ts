export const LAYOUT_CONFIG = {
  PARALLEL_THRESHOLD: 0.25, // 15 minutes, parallel layout threshold
  NESTED_THRESHOLD: 0.5, // 30 minutes, nested layout threshold
  INDENT_STEP_PERCENT: 2.5, // Indent step percentage (replaces pixel values)
  MIN_WIDTH: 25, // Minimum width percentage
  MARGIN_BETWEEN: 1, // Margin between parallel events percentage
  EDGE_MARGIN_PERCENT: 0.9, // Edge margin percentage (replaces pixel value calculation)
} as const;
