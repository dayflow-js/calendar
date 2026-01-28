import { EventLayout, Event } from '@/types';

export interface LayoutWeekEvent extends Event {
  parentId?: string;
  children: string[];
  // Cached hour values to avoid repeated calculations
  _startHour?: number;
  _endHour?: number;
}

export interface LayoutNode {
  event: LayoutWeekEvent;
  children: LayoutNode[];
  parent: LayoutNode | null;
  depth: number;
  isProcessed: boolean; // Mark cross-branch parallel nodes
}

export interface ParallelGroup {
  events: LayoutWeekEvent[];
  startHour: number;
  endHour: number;
}

export interface LayoutCalculationParams {
  containerWidth?: number; // Optional container width for scenarios requiring pixel-precise calculations
  viewType?: 'week' | 'day'; // View type for adjusting indent step size
}
