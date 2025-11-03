import { EventLayout, Event } from '@/types';
import { extractHourFromDate, getEventEndHour } from '@/utils/helpers';

interface LayoutWeekEvent extends Event {
  parentId?: string;
  children: string[];
  // Cached hour values to avoid repeated calculations
  _startHour?: number;
  _endHour?: number;
}

function toLayoutEvent(event: Event): LayoutWeekEvent {
  return {
    ...event,
    parentId: undefined,
    children: [],
    // Only calculate hour values for non-all-day events
    _startHour: event.allDay ? 0 : extractHourFromDate(event.start),
    _endHour: event.allDay ? 0 : getEventEndHour(event),
  };
}

function getStartHour(event: LayoutWeekEvent): number {
  return event._startHour ?? extractHourFromDate(event.start);
}

function getEndHour(event: LayoutWeekEvent): number {
  return event._endHour ?? getEventEndHour(event);
}

const LAYOUT_CONFIG = {
  PARALLEL_THRESHOLD: 0.25, // 15 minutes, parallel layout threshold
  NESTED_THRESHOLD: 0.5, // 30 minutes, nested layout threshold
  INDENT_STEP_PERCENT: 2.5, // Indent step percentage (replaces pixel values)
  MIN_WIDTH: 25, // Minimum width percentage
  MARGIN_BETWEEN: 1, // Margin between parallel events percentage
  EDGE_MARGIN_PERCENT: 0.9, // Edge margin percentage (replaces pixel value calculation)
} as const;

interface LayoutNode {
  event: LayoutWeekEvent;
  children: LayoutNode[];
  parent: LayoutNode | null;
  depth: number;
  isProcessed: boolean; // Mark cross-branch parallel nodes
}

interface ParallelGroup {
  events: LayoutWeekEvent[];
  startHour: number;
  endHour: number;
}

interface LayoutCalculationParams {
  containerWidth?: number; // Optional container width for scenarios requiring pixel-precise calculations
  viewType?: 'week' | 'day'; // View type for adjusting indent step size
}

export class EventLayoutCalculator {
  /**
   * Get indent step size based on view type
   * @param viewType View type
   */
  private static getIndentStepPercent(viewType?: 'week' | 'day'): number {
    switch (viewType) {
      case 'day':
        return 0.5; // DayView: Level 1: 2%, Level 2: 4%, Level 3: 6%
      case 'week':
      default:
        return 2.5; // WeekView: Level 1: 4%, Level 2: 8%, Level 3: 12%
    }
  }

  /**
   * Calculate layout for all events in a day
   * @param dayEvents Array of events for the day
   * @param params Layout calculation parameters
   */
  static calculateDayEventLayouts(
    dayEvents: Event[],
    params: LayoutCalculationParams = {}
  ): Map<string, EventLayout> {
    // Convert to layout events and clear parent-child relationships
    const layoutEvents = dayEvents.map(toLayoutEvent);
    this.clearAllParentChildRelations(layoutEvents);

    const layoutMap = new Map<string, EventLayout>();
    const regularEvents = layoutEvents.filter(e => !e.allDay);

    if (regularEvents.length === 0) {
      return layoutMap;
    }

    // Group overlapping events
    const overlappingGroups = this.groupOverlappingEvents(regularEvents);

    // Calculate layout for each group
    for (let i = 0; i < overlappingGroups.length; i++) {
      const group = overlappingGroups[i];

      if (group.length === 1) {
        this.setSingleEventLayout(group[0], layoutMap);
      } else {
        this.calculateComplexGroupLayout(group, layoutMap, params);
      }
    }

    return layoutMap;
  }

  /**
   * Clear all parent-child relationships for events
   */
  private static clearAllParentChildRelations(events: LayoutWeekEvent[]): void {
    for (const event of events) {
      event.parentId = undefined;
      event.children = [];
    }
  }

  /**
   * Set parent-child relationship
   */
  private static setParentChildRelation(
    parent: LayoutWeekEvent,
    child: LayoutWeekEvent
  ): void {
    child.parentId = parent.id;
    if (!parent.children.includes(child.id)) {
      parent.children.push(child.id);
    }
  }

  /**
   * Check if two events overlap
   */
  private static eventsOverlap(
    event1: LayoutWeekEvent,
    event2: LayoutWeekEvent
  ): boolean {
    if (event1.day !== event2.day || event1.allDay || event2.allDay)
      return false;
    return (
      getStartHour(event1) < getEndHour(event2) &&
      getStartHour(event2) < getEndHour(event1)
    );
  }

  /**
   * Group overlapping events
   */
  private static groupOverlappingEvents(
    events: LayoutWeekEvent[]
  ): LayoutWeekEvent[][] {
    const groups: LayoutWeekEvent[][] = [];
    const processed = new Set<string>();

    for (const event of events) {
      if (processed.has(event.id)) continue;

      const group = [event];
      const queue = [event];
      processed.add(event.id);

      while (queue.length > 0) {
        const current = queue.shift()!;

        for (const otherEvent of events) {
          if (processed.has(otherEvent.id)) continue;

          if (this.eventsOverlap(current, otherEvent)) {
            group.push(otherEvent);
            queue.push(otherEvent);
            processed.add(otherEvent.id);
          }
        }
      }

      groups.push(group);
    }

    return groups;
  }

  /**
   * Set layout for a single event
   */
  private static setSingleEventLayout(
    event: LayoutWeekEvent,
    layoutMap: Map<string, EventLayout>
  ): void {
    layoutMap.set(event.id, {
      id: event.id,
      left: 0,
      width: 100 - LAYOUT_CONFIG.EDGE_MARGIN_PERCENT,
      zIndex: 0,
      level: 0,
      isPrimary: true,
      indentOffset: 0,
      importance: 1.0,
    });
  }

  /**
   * Calculate layout for complex overlapping groups
   */
  private static calculateComplexGroupLayout(
    group: LayoutWeekEvent[],
    layoutMap: Map<string, EventLayout>,
    params: LayoutCalculationParams = {}
  ): void {
    // 1. Sort by start time, then by duration descending for same time
    const sortedEvents = [...group].sort((a, b) => {
      const aStart = getStartHour(a);
      const bStart = getStartHour(b);
      if (aStart !== bStart) return aStart - bStart;
      const aDuration = getEndHour(b) - getStartHour(b);
      const bDuration = getEndHour(a) - getStartHour(a);
      return aDuration - bDuration;
    });

    // 2. Analyze parallel groups
    const parallelGroups = this.analyzeParallelGroups(sortedEvents);

    // 3. Build nested structure
    const rootNodes = this.buildNestedStructure(parallelGroups, group);

    // 4. Calculate layout
    this.calculateLayoutFromStructure(rootNodes, layoutMap, params);
  }

  /**
   * Analyze parallel groups - group by start time
   */
  private static analyzeParallelGroups(
    sortedEvents: LayoutWeekEvent[]
  ): ParallelGroup[] {
    const groups: ParallelGroup[] = [];
    const processed = new Set<string>();

    for (const event of sortedEvents) {
      if (processed.has(event.id)) continue;

      // Create new parallel group
      const groupEvents: LayoutWeekEvent[] = [event];
      processed.add(event.id);

      // Find events with similar start times (within 15 minutes)
      for (const otherEvent of sortedEvents) {
        if (processed.has(otherEvent.id)) continue;

        const timeDiff = Math.abs(
          getStartHour(event) - getStartHour(otherEvent)
        );
        if (timeDiff <= LAYOUT_CONFIG.PARALLEL_THRESHOLD) {
          groupEvents.push(otherEvent);
          processed.add(otherEvent.id);
        }
      }

      groupEvents.sort((a, b) => {
        return getStartHour(a) - getStartHour(b);
      });

      const group: ParallelGroup = {
        events: groupEvents,
        startHour: Math.min(...groupEvents.map(e => getStartHour(e))),
        endHour: Math.max(...groupEvents.map(e => getEndHour(e))),
      };

      groups.push(group);
    }
    groups.sort((a, b) => a.startHour - b.startHour);

    return groups;
  }

  /**
   * Determine if two events should be displayed in parallel, supporting load balancing and extended event parallelism
   */
  private static shouldBeParallel(
    event1: LayoutWeekEvent,
    event2: LayoutWeekEvent
  ): boolean {
    if (!this.eventsOverlap(event1, event2)) return false;

    const startTimeDiff = Math.abs(getStartHour(event1) - getStartHour(event2));

    // Strictly within 15 minutes, directly parallel
    if (startTimeDiff <= LAYOUT_CONFIG.PARALLEL_THRESHOLD) {
      return true;
    }

    // Between 15-30 minutes, consider load balancing
    if (
      startTimeDiff > LAYOUT_CONFIG.PARALLEL_THRESHOLD &&
      startTimeDiff < LAYOUT_CONFIG.NESTED_THRESHOLD
    ) {
      return true; // For load balancing, also consider as parallel
    }

    // Check if one is an extended event
    const shouldParallelWithExtended = this.checkExtendedEventParallel(
      event1,
      event2
    );
    if (shouldParallelWithExtended) {
      return true;
    }

    return false;
  }

  /**
   * Check parallel relationship of extended events
   */
  private static checkExtendedEventParallel(
    event1: LayoutWeekEvent,
    event2: LayoutWeekEvent
  ): boolean {
    // Ensure events overlap
    if (!this.eventsOverlap(event1, event2)) return false;

    // Check if event1 is an extended event, event2 starts in its latter half
    if (this.isExtendedEventParallel(event1, event2)) {
      return true;
    }

    // Check if event2 is an extended event, event1 starts in its latter half
    if (this.isExtendedEventParallel(event2, event1)) {
      return true;
    }

    return false;
  }

  /**
   * Check one-way parallel relationship of extended events
   * @param extendedEvent Potential extended event
   * @param otherEvent Other event
   */
  private static isExtendedEventParallel(
    extendedEvent: LayoutWeekEvent,
    otherEvent: LayoutWeekEvent
  ): boolean {
    const duration = getEndHour(extendedEvent) - getStartHour(extendedEvent);

    // Only consider as extended event if duration exceeds 1.25 hours
    if (duration < 1.25) return false;

    // Calculate the start time of extended event's "latter half" (latter half starts at 40% position)
    const lateStartThreshold = getStartHour(extendedEvent) + duration * 0.4;

    // Other event must start in the latter half and overlap with extended event
    const isInLateStart = getStartHour(otherEvent) >= lateStartThreshold;
    const hasOverlap = this.eventsOverlap(extendedEvent, otherEvent);

    return isInLateStart && hasOverlap;
  }

  /**
   * Build nested structure, fix cross-branch detection range, prioritize detecting nearest parent group
   */
  private static buildNestedStructure(
    parallelGroups: ParallelGroup[],
    allEvents: LayoutWeekEvent[]
  ): LayoutNode[] {
    const allNodes: LayoutNode[] = [];
    const nodeMap = new Map<string, LayoutNode>();

    // Create mapping from event ID to LayoutWeekEvent to ensure reference consistency
    const eventMap = new Map<string, LayoutWeekEvent>();
    allEvents.forEach(event => eventMap.set(event.id, event));

    // Create nodes
    for (const group of parallelGroups) {
      for (const event of group.events) {
        const node: LayoutNode = {
          event: eventMap.get(event.id)!, // Ensure using consistent reference
          children: [],
          parent: null,
          depth: 0,
          isProcessed: false,
        };
        allNodes.push(node);
        nodeMap.set(event.id, node);
      }
    }

    // First establish regular parent-child relationships
    for (let i = 0; i < parallelGroups.length; i++) {
      const currentGroup = parallelGroups[i];
      // Ensure using event references from eventMap
      const currentGroupEvents = currentGroup.events.map(
        e => eventMap.get(e.id)!
      );

      let foundParent = false;
      for (let j = i - 1; j >= 0 && !foundParent; j--) {
        const potentialParentGroup = parallelGroups[j];
        // Ensure using event references from eventMap
        const potentialParentGroupEvents = potentialParentGroup.events.map(
          e => eventMap.get(e.id)!
        );
        const potentialParentGroupMapped: ParallelGroup = {
          events: potentialParentGroupEvents,
          startHour: potentialParentGroup.startHour,
          endHour: potentialParentGroup.endHour,
        };

        if (
          this.canGroupContain(potentialParentGroupMapped, {
            events: currentGroupEvents,
            startHour: currentGroup.startHour,
            endHour: currentGroup.endHour,
          })
        ) {
          const childAssignments = this.optimizeChildAssignments(
            currentGroupEvents,
            potentialParentGroupMapped,
            allEvents
          );

          for (const assignment of childAssignments) {
            const childNode = nodeMap.get(assignment.child.id)!;
            const parentNode = nodeMap.get(assignment.parent.id)!;

            childNode.parent = parentNode;
            childNode.depth = parentNode.depth + 1;
            parentNode.children.push(childNode);
          }
          foundParent = true;
        }
      }
    }

    // At the end of buildNestedStructure function, after rootNodes definition
    const rootNodes = allNodes.filter(node => node.parent === null);
    rootNodes.forEach(rootNode => {
      rootNode.depth = 0;
    });

    // Perform load rebalancing check by group
    this.rebalanceLoadByGroups(parallelGroups, allNodes);

    return rootNodes;
  }

  /**
   * Find the peer branch root node of the branch where the event is located
   */
  private static findAlternateBranchRoot(
    event: LayoutWeekEvent,
    allNodes: LayoutNode[],
    nodeMap: Map<string, LayoutNode>
  ): LayoutWeekEvent | null {
    const eventNode = nodeMap.get(event.id);
    if (!eventNode) return null;

    // Find the branch root node of the current event (depth=1)
    let currentBranchRoot = eventNode;
    while (currentBranchRoot.parent && currentBranchRoot.depth > 1) {
      currentBranchRoot = currentBranchRoot.parent;
    }

    if (currentBranchRoot.depth !== 1) return null;

    // Find other child nodes of the root node (peer branches)
    const rootNode = currentBranchRoot.parent;
    if (!rootNode) return null;

    const alternateBranches = rootNode.children.filter(
      child =>
        child.depth === 1 && child.event.id !== currentBranchRoot.event.id
    );

    // Select peer branch with minimum load
    let minLoad = Infinity;
    let selectedBranch: LayoutNode | null = null;

    for (const branch of alternateBranches) {
      const load = this.calculateBranchLoad(branch);
      if (load < minLoad) {
        minLoad = load;
        selectedBranch = branch;
      }
    }

    return selectedBranch ? selectedBranch.event : null;
  }

  /**
   * Calculate branch load (total number of child nodes)
   */
  private static calculateBranchLoad(branchRoot: LayoutNode): number {
    let load = 0;

    function countNodes(node: LayoutNode) {
      load++;
      for (const child of node.children) {
        countNodes(child);
      }
    }

    for (const child of branchRoot.children) {
      countNodes(child);
    }

    return load;
  }

  /**
   * Check if parent group can contain child group - consider load balancing parallelism
   */
  private static canGroupContain(
    parentGroup: ParallelGroup,
    childGroup: ParallelGroup
  ): boolean {
    const timeDiff = childGroup.startHour - parentGroup.startHour;

    // New: Check if load balancing parallel relationship exists
    const hasLoadBalanceParallel = this.checkLoadBalanceParallel(
      parentGroup,
      childGroup
    );

    if (hasLoadBalanceParallel) {
      return false; // Don't nest when load balancing parallel relationship exists
    }

    // Child group must start at least 30 minutes after parent group to nest
    if (timeDiff < LAYOUT_CONFIG.NESTED_THRESHOLD) {
      return false;
    }

    // Check if there is overlap or containment relationship
    let hasValidParentChild = false;

    for (const parentEvent of parentGroup.events) {
      for (const childEvent of childGroup.events) {
        if (this.canEventContain(parentEvent, childEvent)) {
          hasValidParentChild = true;
          break;
        }
      }
      if (hasValidParentChild) break;
    }

    return hasValidParentChild;
  }

  /**
   * Check if load balancing parallel relationship exists, based on time intersection and extension situation
   */
  private static checkLoadBalanceParallel(
    parentGroup: ParallelGroup,
    childGroup: ParallelGroup
  ): boolean {
    for (const parentEvent of parentGroup.events) {
      for (const childEvent of childGroup.events) {
        // Check if there is time intersection
        if (!this.eventsOverlap(parentEvent, childEvent)) {
          continue;
        }

        const timeDiff = Math.abs(
          getStartHour(childEvent) - getStartHour(parentEvent)
        );

        // Within 15 minutes, strictly parallel
        if (timeDiff <= LAYOUT_CONFIG.PARALLEL_THRESHOLD) {
          return true;
        }

        // Between 15-30 minutes, basic load balancing parallel
        if (
          timeDiff > LAYOUT_CONFIG.PARALLEL_THRESHOLD &&
          timeDiff < LAYOUT_CONFIG.NESTED_THRESHOLD
        ) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Check if parent event can contain child event
   */
  private static canEventContain(
    parent: LayoutWeekEvent,
    child: LayoutWeekEvent
  ): boolean {
    const strictContain =
      getStartHour(parent) <= getStartHour(child) &&
      getEndHour(parent) >= getEndHour(child);
    const overlapNesting =
      getStartHour(parent) <= getStartHour(child) &&
      getStartHour(child) < getEndHour(parent) &&
      this.eventsOverlap(parent, child);

    const result = strictContain || overlapNesting;

    if (result && !strictContain) {
    }

    return result;
  }

  /**
   * Load balancing and cross-branch parallel processing
   */
  private static optimizeChildAssignments(
    childEvents: LayoutWeekEvent[],
    parentGroup: ParallelGroup,
    allEvents: LayoutWeekEvent[]
  ): Array<{ child: LayoutWeekEvent; parent: LayoutWeekEvent }> {
    const assignments: Array<{
      child: LayoutWeekEvent;
      parent: LayoutWeekEvent;
    }> = [];

    if (childEvents.length === 1) {
      const parent = this.findBestParentInGroup(
        childEvents[0],
        parentGroup,
        allEvents
      );
      if (parent) {
        assignments.push({ child: childEvents[0], parent });
        // Immediately establish relationship
        this.setParentChildRelation(parent, childEvents[0]);
      }
      return assignments;
    }

    if (parentGroup.events.length === 1) {
      const parent = parentGroup.events[0];
      for (const child of childEvents) {
        if (this.canEventContain(parent, child)) {
          assignments.push({ child, parent });
          // Immediately establish relationship
          this.setParentChildRelation(parent, child);
        }
      }
      return assignments;
    }

    const validParents = parentGroup.events.filter(parent =>
      childEvents.every(child => this.canEventContain(parent, child))
    );

    if (validParents.length === 0) {
      for (const child of childEvents) {
        const parent = this.findBestParentInGroup(
          child,
          parentGroup,
          allEvents
        );
        if (parent) {
          assignments.push({ child, parent });
          // Immediately establish relationship
          this.setParentChildRelation(parent, child);
        } else {
          // Find sibling events that overlap with current event
          const siblingEvent = childEvents.find(
            e => e.id !== child.id && this.eventsOverlap(e, child)
          );
          if (siblingEvent) {
            // Find alternate branch root node - need to build temporary node mapping
            const tempNodeMap = this.buildTempNodeMap(allEvents);
            const alternateBranchRoot = this.findAlternateBranchRoot(
              siblingEvent,
              Array.from(tempNodeMap.values()),
              tempNodeMap
            );

            if (alternateBranchRoot) {
              assignments.push({ child, parent: alternateBranchRoot });
              this.setParentChildRelation(alternateBranchRoot, child);
            } else {
            }
          }
        }
      }
      return assignments;
    }

    // Use load balancing strategy for distribution

    const sortedChildren = [...childEvents].sort((a, b) => {
      const durationA = getEndHour(a) - getStartHour(a);
      const durationB = getEndHour(b) - getStartHour(b);

      // Longer duration first
      return durationB - durationA;
    });

    // If number of child events is divisible by number of parent nodes, distribute evenly
    if (sortedChildren.length % validParents.length === 0) {
      const childrenPerParent = sortedChildren.length / validParents.length;
      for (let i = 0; i < validParents.length; i++) {
        const parent = validParents[i];
        const childrenForParent = sortedChildren.slice(
          i * childrenPerParent,
          (i + 1) * childrenPerParent
        );
        for (const child of childrenForParent) {
          assignments.push({ child, parent });
          // Immediately establish relationship
          this.setParentChildRelation(parent, child);
        }
      }
      return assignments;
    } else {
      // If not divisible
      for (let i = 0; i < sortedChildren.length; i++) {
        const child = sortedChildren[i];
        const parentWithMinLoad = this.findParentWithMinLoadFromEvents(
          child,
          validParents,
          sortedChildren
        );

        if (parentWithMinLoad) {
          assignments.push({ child, parent: parentWithMinLoad });
          // Immediately establish relationship to affect next load calculation
          this.setParentChildRelation(parentWithMinLoad, child);
        }
      }
    }

    return assignments;
  }

  /**
   * Build temporary node mapping for cross-branch lookup
   */
  private static buildTempNodeMap(
    allEvents: LayoutWeekEvent[]
  ): Map<string, LayoutNode> {
    const nodeMap = new Map<string, LayoutNode>();

    for (const event of allEvents) {
      const node: LayoutNode = {
        event,
        children: [],
        parent: null,
        depth: 0,
        isProcessed: false,
      };
      nodeMap.set(event.id, node);
    }

    // Build node hierarchy based on existing parent-child relationships
    for (const event of allEvents) {
      if (event.parentId) {
        const childNode = nodeMap.get(event.id);
        const parentNode = nodeMap.get(event.parentId);
        if (childNode && parentNode) {
          childNode.parent = parentNode;
          childNode.depth = parentNode.depth + 1;
          parentNode.children.push(childNode);
        }
      }
    }

    return nodeMap;
  }

  /**
   * Find parent node with minimum load from LayoutWeekEvent
   */
  private static findParentWithMinLoadFromEvents(
    currentChild: LayoutWeekEvent,
    validParents: LayoutWeekEvent[],
    children: LayoutWeekEvent[]
  ): LayoutWeekEvent | null {
    if (validParents.length === 0) return null;

    let minLoad = Infinity;
    let candidateParents: LayoutWeekEvent[] = [];
    for (const parent of validParents) {
      const load = parent.children.length;
      if (load < minLoad) {
        minLoad = load;
        candidateParents = [parent];
      } else if (load === minLoad) {
        candidateParents.push(parent);
      }
    }

    const loadedChildren = candidateParents.map(p => p.children).flat();
    const currentChildDuration =
      getEndHour(currentChild) - getStartHour(currentChild);
    // If current child event's duration is greater than or equal to other child events, select leftmost parent node
    const currentChildDurationGraterThanAllOtherEvents =
      currentChildDuration >
      Math.max(
        ...loadedChildren.map(id => {
          const childEvent = children.find(e => e.id === id);
          return childEvent
            ? getEndHour(childEvent) - getStartHour(childEvent)
            : 0;
        })
      );
    // If all child events have the same duration, select rightmost parent node
    const allChildrenTheSameDuration = children.every(e => {
      const duration = getEndHour(e) - getStartHour(e);
      return duration === currentChildDuration;
    });

    if (currentChildDurationGraterThanAllOtherEvents) {
      return candidateParents[0];
    } else if (allChildrenTheSameDuration) {
      return candidateParents[candidateParents.length - 1]; // Select last one (rightmost)
    } else {
      return candidateParents[candidateParents.length - 1]; // Select last one (rightmost)
    }
  }

  /**
   * Find best parent node for child event in parent group - configurable priority
   */
  private static findBestParentInGroup(
    childEvent: LayoutWeekEvent,
    parentGroup: ParallelGroup,
    allEvents: LayoutWeekEvent[]
  ): LayoutWeekEvent | null {
    const validParents = parentGroup.events.filter(parent =>
      this.canEventContain(parent, childEvent)
    );

    if (validParents.length === 0) {
      return null;
    }

    if (validParents.length === 1) {
      return validParents[0];
    }

    // Load balancing: select parent node with fewest child events
    const parentLoads = validParents.map(parent => ({
      parent,
      load: parent.children.length,
      hasParallelSibling: false,
    }));

    // Check if there are sibling events with parallel relationship
    for (const parentLoad of parentLoads) {
      for (const siblingId of parentLoad.parent.children) {
        const sibling = allEvents.find(e => e.id === siblingId);
        if (sibling && this.shouldBeParallel(childEvent, sibling)) {
          parentLoad.hasParallelSibling = true;

          break;
        }
      }
    }

    parentLoads.sort((a, b) => {
      // Priority 1: Load balancing (if you want load balancing priority, uncomment the next two lines)
      if (a.load !== b.load) return a.load - b.load;

      // Priority 2: Parallel relationship (current priority)
      if (a.hasParallelSibling !== b.hasParallelSibling) {
        return a.hasParallelSibling ? -1 : 1; // Prioritize those with parallel siblings
      }

      // Priority 3: Load balancing (consider load when parallel relationship is the same)
      if (a.load !== b.load) return a.load - b.load;

      // Priority 4: Time distance
      const aTimeDiff = Math.abs(
        getStartHour(childEvent) - getStartHour(a.parent)
      );
      const bTimeDiff = Math.abs(
        getStartHour(childEvent) - getStartHour(b.parent)
      );
      return aTimeDiff - bTimeDiff;
    });

    const selectedParent = parentLoads[0].parent;

    return selectedParent;
  }

  /**
   * Calculate layout from nested structure
   */
  private static calculateLayoutFromStructure(
    rootNodes: LayoutNode[],
    layoutMap: Map<string, EventLayout>,
    params: LayoutCalculationParams = {}
  ): void {
    const totalWidth = 100 - LAYOUT_CONFIG.EDGE_MARGIN_PERCENT;

    if (rootNodes.length === 1) {
      this.calculateNodeLayoutWithVirtualParallel(
        rootNodes[0],
        0,
        totalWidth,
        layoutMap,
        params
      );
    } else {
      const nodeCount = rootNodes.length;
      const totalMargin = LAYOUT_CONFIG.MARGIN_BETWEEN * (nodeCount - 1);
      const nodeWidth = (totalWidth - totalMargin) / nodeCount;

      rootNodes.forEach((node, index) => {
        const left = index * (nodeWidth + LAYOUT_CONFIG.MARGIN_BETWEEN);
        this.calculateNodeLayoutWithVirtualParallel(
          node,
          left,
          Math.max(nodeWidth, LAYOUT_CONFIG.MIN_WIDTH),
          layoutMap,
          params
        );
      });
    }
  }

  /**
   * Recursively calculate node layout - refactored version, removed dependency on CONTAINER_WIDTH
   */
  private static calculateNodeLayoutWithVirtualParallel(
    node: LayoutNode,
    baseLeft: number,
    availableWidth: number,
    layoutMap: Map<string, EventLayout>,
    params: LayoutCalculationParams = {}
  ): void {
    const indentOffset =
      node.depth * this.getIndentStepPercent(params.viewType);

    // Check if it's a cross-branch parallel node
    let finalIndentOffset = indentOffset;

    if (node.isProcessed) {
      const branchRootIndent = this.findBranchRootIndent(node, params.viewType);
      if (branchRootIndent !== null) {
        finalIndentOffset = branchRootIndent;
      }
    }

    // Adjust left position based on depth and node characteristics, based on view type
    let leftAdjustment = 0;
    const isDayView = params.viewType === 'day';

    if (node.depth === 1) {
      leftAdjustment = isDayView ? 0.5 : 1.5; // DayView: 0.5%, WeekView: 1.5%
    } else if (node.depth === 2) {
      leftAdjustment = isDayView ? -0.01 : -1.0; // DayView: -0.01%, WeekView: -1.0%
    } else if (node.depth >= 3) {
      leftAdjustment = isDayView ? 0.55 : -3.5; // DayView: 0.55%, WeekView: -3.5%
    }

    // Calculate actual position and width of current node
    const nodeLeft = baseLeft + finalIndentOffset + leftAdjustment;
    // Child events should fully utilize parent event's remaining width, subtract all used left space
    const usedLeftSpace = finalIndentOffset + leftAdjustment;
    let nodeWidth = availableWidth - usedLeftSpace;

    // Ensure width doesn't exceed parent event range
    if (nodeLeft + nodeWidth > baseLeft + availableWidth) {
      nodeWidth = baseLeft + availableWidth - nodeLeft;
      console.warn(
        `⚠️ ${node.event.title}'s width exceeds parent event range, adjusted to: ${nodeWidth.toFixed(1)}%`
      );
    }

    // Set layout for current node
    layoutMap.set(node.event.id, {
      id: node.event.id,
      left: nodeLeft,
      width: nodeWidth,
      zIndex: node.depth,
      level: node.depth,
      isPrimary: node.depth === 0,
      indentOffset: (finalIndentOffset * (params.containerWidth || 320)) / 100, // Convert if pixel value is needed
      importance: this.calculateEventImportance(node.event),
    });

    // Process child nodes
    if (node.children.length === 0) return;

    const sortedChildren = [...node.children].sort((a, b) => {
      const durationA = getEndHour(a.event) - getStartHour(a.event);
      const durationB = getEndHour(b.event) - getStartHour(b.event);
      return durationB - durationA;
    });

    if (sortedChildren.length === 1) {
      // Single child node: directly recurse, pass current node as constraint
      this.calculateNodeLayoutWithVirtualParallel(
        sortedChildren[0],
        nodeLeft, // Child node's baseLeft starts from current node
        nodeWidth, // Child node's available width is current node's width
        layoutMap,
        params
      );
    } else {
      const shouldChildrenBeParallel = this.shouldChildrenBeParallel(
        sortedChildren.map(c => c.event)
      );

      if (shouldChildrenBeParallel) {
        this.calculateParallelChildrenLayout(
          sortedChildren,
          nodeLeft,
          nodeWidth,
          layoutMap,
          params
        );
      } else {
        // Non-parallel child nodes: each starts layout from current node
        sortedChildren.forEach(child => {
          this.calculateNodeLayoutWithVirtualParallel(
            child,
            nodeLeft,
            nodeWidth,
            layoutMap,
            params
          );
        });
      }
    }
  }

  /**
   * Calculate layout for parallel child nodes - refactored version
   */
  private static calculateParallelChildrenLayout(
    children: LayoutNode[],
    parentLeft: number,
    parentWidth: number,
    layoutMap: Map<string, EventLayout>,
    params: LayoutCalculationParams = {}
  ): void {
    const childCount = children.length;
    const firstChildDepth = children[0].depth;
    const childIndentOffset =
      firstChildDepth * this.getIndentStepPercent(params.viewType);

    // Calculate layout area for child nodes - optimize starting position calculation, based on view type
    // Adjust starting position based on depth to make layout more aligned with expectations
    let baseIndentAdjustment: number;
    const isDayView = params.viewType === 'day';

    if (firstChildDepth === 1) {
      baseIndentAdjustment = isDayView ? 0.5 : 1.5; // DayView: 0.5%, WeekView: 1.5%
    } else if (firstChildDepth === 2) {
      baseIndentAdjustment = isDayView ? -0.01 : -1.0; // DayView: -0.01%, WeekView: -1.0%
    } else {
      baseIndentAdjustment = isDayView ? 0.55 : -3.5; // DayView: 0.55%, WeekView: -3.5%
    }

    const childrenStartLeft =
      parentLeft + childIndentOffset + baseIndentAdjustment;
    // Correctly calculate available width: parent event width - indent offset - adjustment value
    const usedLeftSpace = childIndentOffset + baseIndentAdjustment;
    const childrenAvailableWidth = parentWidth - usedLeftSpace;

    // Check if available width is sufficient
    if (childrenAvailableWidth <= 0) {
      children.forEach(child => {
        this.calculateNodeLayoutWithVirtualParallel(
          child,
          parentLeft,
          parentWidth,
          layoutMap,
          params
        );
      });
      return;
    }

    // Calculate actually adjusted spacing
    // const isDayView = params.viewType === 'day';
    let adjustedMargin: number;

    if (firstChildDepth === 1) {
      adjustedMargin = LAYOUT_CONFIG.MARGIN_BETWEEN * (isDayView ? 0.15 : 0.3);
    } else if (firstChildDepth === 2) {
      adjustedMargin = LAYOUT_CONFIG.MARGIN_BETWEEN * (isDayView ? 0.1 : 0.2);
    } else {
      adjustedMargin = LAYOUT_CONFIG.MARGIN_BETWEEN * (isDayView ? 0.1 : 0.2);
    }

    // Optimize width calculation - use actually adjusted spacing
    const totalMarginWidth = adjustedMargin * (childCount - 1);

    // Calculate child node width: (parent event available width - all spacing) / number of child events
    const childWidth = (childrenAvailableWidth - totalMarginWidth) / childCount;

    // Calculate position for each child node and recursively process
    children.forEach((child, index) => {
      const childLeft =
        childrenStartLeft + index * (childWidth + adjustedMargin);

      // Directly set child node layout
      layoutMap.set(child.event.id, {
        id: child.event.id,
        left: childLeft,
        width: childWidth,
        zIndex: child.depth,
        level: child.depth,
        isPrimary: child.depth === 0,
        indentOffset:
          (childIndentOffset * (params.containerWidth || 320)) / 100, // Convert if pixel value is needed
        importance: this.calculateEventImportance(child.event),
      });

      // Recursively process child nodes of child nodes
      if (child.children.length > 0) {
        const sortedGrandChildren = [...child.children].sort((a, b) => {
          const durationA = getEndHour(a.event) - getStartHour(a.event);
          const durationB = getEndHour(b.event) - getStartHour(b.event);
          return durationB - durationA;
        });

        if (sortedGrandChildren.length === 1) {
          this.calculateNodeLayoutWithVirtualParallel(
            sortedGrandChildren[0],
            childLeft,
            childWidth,
            layoutMap,
            params
          );
        } else {
          const shouldGrandChildrenBeParallel = this.shouldChildrenBeParallel(
            sortedGrandChildren.map(c => c.event)
          );

          if (shouldGrandChildrenBeParallel) {
            this.calculateParallelChildrenLayout(
              sortedGrandChildren,
              childLeft,
              childWidth,
              layoutMap,
              params
            );
          } else {
            sortedGrandChildren.forEach(grandChild => {
              this.calculateNodeLayoutWithVirtualParallel(
                grandChild,
                childLeft,
                childWidth,
                layoutMap,
                params
              );
            });
          }
        }
      }
    });
  }

  /**
   * Find branch root node indent that cross-branch parallel nodes should align with
   */
  private static findBranchRootIndent(
    node: LayoutNode,
    viewType?: 'week' | 'day'
  ): number | null {
    // Find branch root node of current node (parent node with depth=1)
    let current = node;
    while (current.parent && current.parent.depth > 0) {
      current = current.parent;
    }

    // current should now be a branch root node with depth=1
    if (current.depth === 1) {
      const branchRootIndent =
        current.depth * this.getIndentStepPercent(viewType);
      return branchRootIndent;
    }

    return null;
  }

  /**
   * Determine if child nodes should be parallel
   */
  private static shouldChildrenBeParallel(
    childEvents: LayoutWeekEvent[]
  ): boolean {
    if (childEvents.length < 2) return false;

    for (let i = 0; i < childEvents.length; i++) {
      for (let j = i + 1; j < childEvents.length; j++) {
        if (this.shouldBeParallel(childEvents[i], childEvents[j])) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Calculate event importance
   */
  private static calculateEventImportance(event: LayoutWeekEvent): number {
    const duration = getEndHour(event) - getStartHour(event);
    return Math.max(0.1, Math.min(1.0, duration / 4));
  }

  // Calculate number of descendants
  private static countDescendants(node: LayoutNode): number {
    let count = 0;
    for (const child of node.children) {
      count += 1 + this.countDescendants(child);
    }
    return count;
  }

  // Find transferable leaf node
  private static findTransferableLeaf(
    heavyRoot: LayoutNode,
    lightRoot: LayoutNode
  ): LayoutNode | null {
    const leaves: LayoutNode[] = [];
    this.collectLeaves(heavyRoot, leaves);

    // Find first leaf that can be contained by light-load root node in time
    return (
      leaves.find(leaf => this.canEventContain(lightRoot.event, leaf.event)) ||
      leaves[0]
    ); // If no suitable leaf found, default to returning first leaf node
  }

  // Collect leaf nodes & perform transfer
  private static collectLeaves(node: LayoutNode, leaves: LayoutNode[]): void {
    if (node.children.length === 0) {
      leaves.push(node);
    } else {
      node.children.forEach(child => this.collectLeaves(child, leaves));
    }
  }

  private static transferNode(
    leafNode: LayoutNode,
    newParent: LayoutNode
  ): void {
    // Remove from original parent node
    if (leafNode.parent) {
      leafNode.parent.children = leafNode.parent.children.filter(
        c => c !== leafNode
      );
    }

    // Check relationship with new parent node's existing child nodes
    const existingChildren = newParent.children;
    let shouldBeParallel = false;
    let shouldNestUnder = null;

    for (const existingChild of existingChildren) {
      if (this.shouldBeParallel(leafNode.event, existingChild.event)) {
        shouldBeParallel = true;

        break;
      } else if (this.canEventContain(existingChild.event, leafNode.event)) {
        shouldNestUnder = existingChild;

        break;
      }
    }

    if (shouldNestUnder) {
      // Nest under existing child node
      leafNode.parent = shouldNestUnder;
      leafNode.depth = shouldNestUnder.depth + 1;
      shouldNestUnder.children.push(leafNode);
      this.setParentChildRelation(shouldNestUnder.event, leafNode.event);
    } else {
      // Directly add to new parent node (parallel or independent)
      leafNode.parent = newParent;
      leafNode.depth = newParent.depth + 1;
      newParent.children.push(leafNode);
      this.setParentChildRelation(newParent.event, leafNode.event);

      if (shouldBeParallel) {
      } else {
      }
    }
  }

  private static calculateParentLoads(
    groupNodes: LayoutNode[],
    allNodes: LayoutNode[]
  ): Array<{ node: LayoutNode; load: number }> {
    const parentLoads: Array<{ node: LayoutNode; load: number }> = [];

    // Find parent node level of current group
    const parentLevel = groupNodes[0]?.parent?.depth;
    if (parentLevel === undefined) return parentLoads;

    // Get all nodes at that level
    const allParentNodes = allNodes.filter(node => node.depth === parentLevel);

    for (const parentNode of allParentNodes) {
      const load = this.countDescendants(parentNode);
      parentLoads.push({ node: parentNode, load });
    }

    // Sort by load descending
    parentLoads.sort((a, b) => b.load - a.load);

    return parentLoads;
  }

  private static needsRebalancing(
    parentLoads: Array<{ node: LayoutNode; load: number }>
  ): boolean {
    if (parentLoads.length < 2) return false;

    const maxLoad = parentLoads[0].load;
    const minLoad = parentLoads[parentLoads.length - 1].load;
    const loadDifference = maxLoad - minLoad;

    // Rebalancing needed when load difference >= 2
    return loadDifference >= 2;
  }

  private static rebalanceGroupLoad(
    parentLoads: Array<{ node: LayoutNode; load: number }>
  ): void {
    const maxIterations = 5; // Prevent infinite loop
    let iteration = 0;

    while (iteration < maxIterations) {
      // Resort to ensure getting current heaviest and lightest parent nodes
      parentLoads.sort((a, b) => b.load - a.load);

      const heaviestParent = parentLoads[0];
      const lightestParent = parentLoads[parentLoads.length - 1];
      const loadDifference = heaviestParent.load - lightestParent.load;

      // If load difference < 2, rebalancing complete
      if (loadDifference < 2) {
        break;
      }

      // Find a transferable leaf node of heavy-load parent node
      const transferableLeaf = this.findTransferableLeaf(
        heaviestParent.node,
        lightestParent.node
      );

      if (transferableLeaf) {
        this.transferNode(transferableLeaf, lightestParent.node);

        // Update load statistics
        heaviestParent.load--;
        lightestParent.load++;

        iteration++;
      } else {
        break;
      }
    }

    if (iteration >= maxIterations) {
    }
  }

  private static rebalanceLoadByGroups(
    parallelGroups: ParallelGroup[],
    allNodes: LayoutNode[]
  ): void {
    // Check load distribution of each group from back to front
    for (let i = parallelGroups.length - 1; i >= 1; i--) {
      const currentGroup = parallelGroups[i];

      // Check if events in current group have load imbalance
      const groupNodes = currentGroup.events.map(
        e => allNodes.find(node => node.event.id === e.id)!
      );

      const parentLoads = this.calculateParentLoads(groupNodes, allNodes);
      if (this.needsRebalancing(parentLoads)) {
        this.rebalanceGroupLoad(parentLoads);
      }
    }
  }
}
