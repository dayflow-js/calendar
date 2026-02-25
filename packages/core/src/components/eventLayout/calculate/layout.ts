import { LAYOUT_CONFIG } from '@/components/eventLayout/constants';
import {
  LayoutNode,
  LayoutCalculationParams,
  LayoutWeekEvent,
} from '@/components/eventLayout/types';
import {
  getStartHour,
  getEndHour,
  shouldBeParallel,
} from '@/components/eventLayout/utils';
import { EventLayout } from '@/types';

function getIndentStepPercent(viewType?: 'week' | 'day'): number {
  return viewType === 'day' ? 0.5 : 2.5;
}

function calculateEventImportance(event: LayoutWeekEvent): number {
  const duration = getEndHour(event) - getStartHour(event);
  return Math.max(0.1, Math.min(1.0, duration / 4));
}

function findBranchRootIndent(
  node: LayoutNode,
  viewType?: 'week' | 'day'
): number | null {
  let current = node;
  while (current.parent && current.parent.depth > 0) current = current.parent;
  return current.depth === 1
    ? current.depth * getIndentStepPercent(viewType)
    : null;
}

function shouldChildrenBeParallel(childEvents: LayoutWeekEvent[]): boolean {
  if (childEvents.length < 2) return false;
  for (let i = 0; i < childEvents.length; i++) {
    for (let j = i + 1; j < childEvents.length; j++) {
      if (shouldBeParallel(childEvents[i], childEvents[j], LAYOUT_CONFIG))
        return true;
    }
  }
  return false;
}

function calculateNodeLayoutWithVirtualParallel(
  node: LayoutNode,
  baseLeft: number,
  availableWidth: number,
  layoutMap: Map<string, EventLayout>,
  params: LayoutCalculationParams = {}
): void {
  const indentStep = getIndentStepPercent(params.viewType);
  let finalIndentOffset = node.depth * indentStep;

  if (node.isProcessed) {
    const branchRootIndent = findBranchRootIndent(node, params.viewType);
    if (branchRootIndent !== null) finalIndentOffset = branchRootIndent;
  }

  const isDayView = params.viewType === 'day';
  let leftAdjustment = 0;
  if (node.depth === 1) leftAdjustment = isDayView ? 0.5 : 1.5;
  else if (node.depth === 2) leftAdjustment = isDayView ? -0.01 : -1.0;
  else if (node.depth >= 3) leftAdjustment = isDayView ? 0.55 : -3.5;

  const nodeLeft = baseLeft + finalIndentOffset + leftAdjustment;
  const usedLeftSpace = finalIndentOffset + leftAdjustment;
  let nodeWidth = availableWidth - usedLeftSpace;

  if (nodeLeft + nodeWidth > baseLeft + availableWidth) {
    nodeWidth = baseLeft + availableWidth - nodeLeft;
  }

  layoutMap.set(node.event.id, {
    id: node.event.id,
    left: nodeLeft,
    width: nodeWidth,
    zIndex: node.depth,
    level: node.depth,
    isPrimary: node.depth === 0,
    indentOffset: (finalIndentOffset * (params.containerWidth || 320)) / 100,
    importance: calculateEventImportance(node.event),
  });

  if (node.children.length === 0) return;

  const sortedChildren = [...node.children].toSorted(
    (a, b) =>
      getEndHour(b.event) -
      getStartHour(b.event) -
      (getEndHour(a.event) - getStartHour(a.event))
  );

  if (sortedChildren.length === 1) {
    calculateNodeLayoutWithVirtualParallel(
      sortedChildren[0],
      nodeLeft,
      nodeWidth,
      layoutMap,
      params
    );
  } else if (shouldChildrenBeParallel(sortedChildren.map(c => c.event))) {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    calculateParallelChildrenLayout(
      sortedChildren,
      nodeLeft,
      nodeWidth,
      layoutMap,
      params
    );
  } else {
    sortedChildren.forEach(child =>
      calculateNodeLayoutWithVirtualParallel(
        child,
        nodeLeft,
        nodeWidth,
        layoutMap,
        params
      )
    );
  }
}

function calculateParallelChildrenLayout(
  children: LayoutNode[],
  parentLeft: number,
  parentWidth: number,
  layoutMap: Map<string, EventLayout>,
  params: LayoutCalculationParams = {}
): void {
  const childCount = children.length;
  const firstChildDepth = children[0].depth;
  const indentStep = getIndentStepPercent(params.viewType);
  const childIndentOffset = firstChildDepth * indentStep;

  const isDayView = params.viewType === 'day';
  let baseIndentAdjustment =
    firstChildDepth === 1
      ? isDayView
        ? 0.5
        : 1.5
      : firstChildDepth === 2
        ? isDayView
          ? -0.01
          : -1.0
        : isDayView
          ? 0.55
          : -3.5;

  const childrenStartLeft =
    parentLeft + childIndentOffset + baseIndentAdjustment;
  const usedLeftSpace = childIndentOffset + baseIndentAdjustment;
  const childrenAvailableWidth = parentWidth - usedLeftSpace;

  if (childrenAvailableWidth <= 0) {
    children.forEach(child =>
      calculateNodeLayoutWithVirtualParallel(
        child,
        parentLeft,
        parentWidth,
        layoutMap,
        params
      )
    );
    return;
  }

  let adjustedMargin =
    LAYOUT_CONFIG.MARGIN_BETWEEN *
    (firstChildDepth === 1 ? (isDayView ? 0.15 : 0.3) : isDayView ? 0.1 : 0.2);
  const childWidth =
    (childrenAvailableWidth - adjustedMargin * (childCount - 1)) / childCount;

  children.forEach((child, index) => {
    const childLeft = childrenStartLeft + index * (childWidth + adjustedMargin);
    layoutMap.set(child.event.id, {
      id: child.event.id,
      left: childLeft,
      width: childWidth,
      zIndex: child.depth,
      level: child.depth,
      isPrimary: child.depth === 0,
      indentOffset: (childIndentOffset * (params.containerWidth || 320)) / 100,
      importance: calculateEventImportance(child.event),
    });

    if (child.children.length > 0) {
      const sorted = [...child.children].toSorted(
        (a, b) =>
          getEndHour(b.event) -
          getStartHour(b.event) -
          (getEndHour(a.event) - getStartHour(a.event))
      );
      if (sorted.length === 1) {
        calculateNodeLayoutWithVirtualParallel(
          sorted[0],
          childLeft,
          childWidth,
          layoutMap,
          params
        );
      } else if (shouldChildrenBeParallel(sorted.map(c => c.event))) {
        calculateParallelChildrenLayout(
          sorted,
          childLeft,
          childWidth,
          layoutMap,
          params
        );
      } else {
        sorted.forEach(gc =>
          calculateNodeLayoutWithVirtualParallel(
            gc,
            childLeft,
            childWidth,
            layoutMap,
            params
          )
        );
      }
    }
  });
}

/**
 * Calculate layout from nested structure
 */
export function calculateLayoutFromStructure(
  rootNodes: LayoutNode[],
  layoutMap: Map<string, EventLayout>,
  params: LayoutCalculationParams = {}
): void {
  const edgeMargin =
    params.viewType === 'day' ? 0 : LAYOUT_CONFIG.EDGE_MARGIN_PERCENT;
  const totalWidth = 100 - edgeMargin;

  if (rootNodes.length === 1) {
    calculateNodeLayoutWithVirtualParallel(
      rootNodes[0],
      0,
      totalWidth,
      layoutMap,
      params
    );
  } else if (rootNodes.length > 1) {
    const nodeCount = rootNodes.length;
    const totalMargin = LAYOUT_CONFIG.MARGIN_BETWEEN * (nodeCount - 1);
    const nodeWidth = (totalWidth - totalMargin) / nodeCount;

    rootNodes.forEach((node, index) => {
      const left = index * (nodeWidth + LAYOUT_CONFIG.MARGIN_BETWEEN);
      calculateNodeLayoutWithVirtualParallel(
        node,
        left,
        Math.max(nodeWidth, LAYOUT_CONFIG.MIN_WIDTH),
        layoutMap,
        params
      );
    });
  }
}
