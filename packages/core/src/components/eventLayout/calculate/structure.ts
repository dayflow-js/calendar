import { LAYOUT_CONFIG } from '@/components/eventLayout/constants';
import {
  LayoutWeekEvent,
  ParallelGroup,
  LayoutNode,
} from '@/components/eventLayout/types';
import {
  canEventContain,
  eventsOverlap,
  getStartHour,
  getEndHour,
  shouldBeParallel,
} from '@/components/eventLayout/utils';

import { rebalanceLoadByGroups } from './rebalance';

function checkLoadBalanceParallel(
  parentGroup: ParallelGroup,
  childGroup: ParallelGroup
): boolean {
  for (const parentEvent of parentGroup.events) {
    for (const childEvent of childGroup.events) {
      if (!eventsOverlap(parentEvent, childEvent)) continue;

      const timeDiff = Math.abs(
        getStartHour(childEvent) - getStartHour(parentEvent)
      );
      if (timeDiff < LAYOUT_CONFIG.NESTED_THRESHOLD) return true;
    }
  }
  return false;
}

export function canGroupContain(
  parentGroup: ParallelGroup,
  childGroup: ParallelGroup
): boolean {
  const timeDiff = childGroup.startHour - parentGroup.startHour;

  // Check load balance parallel
  if (checkLoadBalanceParallel(parentGroup, childGroup)) {
    return false;
  }

  if (timeDiff < LAYOUT_CONFIG.NESTED_THRESHOLD) {
    return false;
  }

  for (const parentEvent of parentGroup.events) {
    for (const childEvent of childGroup.events) {
      if (canEventContain(parentEvent, childEvent)) {
        return true;
      }
    }
  }

  return false;
}

export function findBestParentInGroup(
  childEvent: LayoutWeekEvent,
  parentGroup: ParallelGroup,
  allEvents: LayoutWeekEvent[]
): LayoutWeekEvent | null {
  const validParents = parentGroup.events.filter(p =>
    canEventContain(p, childEvent)
  );
  if (validParents.length === 0) return null;
  if (validParents.length === 1) return validParents[0];

  const parentLoads = validParents.map(parent => ({
    parent,
    load: parent.children.length,
    hasParallelSibling: parent.children.some(id => {
      const sibling = allEvents.find(e => e.id === id);
      return sibling && shouldBeParallel(childEvent, sibling, LAYOUT_CONFIG);
    }),
  }));

  parentLoads.sort((a, b) => {
    if (a.load !== b.load) return a.load - b.load;
    if (a.hasParallelSibling !== b.hasParallelSibling)
      return a.hasParallelSibling ? -1 : 1;
    return (
      Math.abs(getStartHour(childEvent) - getStartHour(a.parent)) -
      Math.abs(getStartHour(childEvent) - getStartHour(b.parent))
    );
  });

  return parentLoads[0].parent;
}

function findParentWithMinLoad(
  currentChild: LayoutWeekEvent,
  validParents: LayoutWeekEvent[],
  children: LayoutWeekEvent[]
): LayoutWeekEvent | null {
  if (validParents.length === 0) return null;

  let minLoad = Infinity;
  let candidates: LayoutWeekEvent[] = [];
  for (const parent of validParents) {
    const load = parent.children.length;
    if (load < minLoad) {
      minLoad = load;
      candidates = [parent];
    } else if (load === minLoad) {
      candidates.push(parent);
    }
  }

  const currentDuration = getEndHour(currentChild) - getStartHour(currentChild);
  const loadedChildrenIds = candidates.flatMap(p => p.children);

  const isLongest =
    currentDuration >
    Math.max(
      ...loadedChildrenIds.map(id => {
        const child = children.find(e => e.id === id);
        return child ? getEndHour(child) - getStartHour(child) : 0;
      }),
      0
    );

  return isLongest ? candidates[0] : candidates.at(-1) || null;
}

function setRelation(parent: LayoutWeekEvent, child: LayoutWeekEvent) {
  child.parentId = parent.id;
  if (!parent.children.includes(child.id)) {
    parent.children.push(child.id);
  }
}

export function optimizeChildAssignments(
  childEvents: LayoutWeekEvent[],
  parentGroup: ParallelGroup,
  allEvents: LayoutWeekEvent[]
): Array<{ child: LayoutWeekEvent; parent: LayoutWeekEvent }> {
  const assignments: Array<{
    child: LayoutWeekEvent;
    parent: LayoutWeekEvent;
  }> = [];

  if (childEvents.length === 1) {
    const parent = findBestParentInGroup(
      childEvents[0],
      parentGroup,
      allEvents
    );
    if (parent) {
      assignments.push({ child: childEvents[0], parent });
      setRelation(parent, childEvents[0]);
    }
    return assignments;
  }

  const validParents = parentGroup.events.filter(parent =>
    childEvents.every(child => canEventContain(parent, child))
  );

  if (validParents.length === 0) {
    for (const child of childEvents) {
      const parent = findBestParentInGroup(child, parentGroup, allEvents);
      if (parent) {
        assignments.push({ child, parent });
        setRelation(parent, child);
      } else {
        // Cross-branch parallel detection could go here if needed,
        // but it requires NodeMap which is not fully available here.
        // The original index.tsx uses a temporary node map.
      }
    }
    return assignments;
  }

  const sortedChildren = [...childEvents].toSorted(
    (a, b) =>
      getEndHour(b) - getStartHour(b) - (getEndHour(a) - getStartHour(a))
  );

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
        setRelation(parent, child);
      }
    }
  } else {
    for (const child of sortedChildren) {
      const parent = findParentWithMinLoad(child, validParents, sortedChildren);
      if (parent) {
        assignments.push({ child, parent });
        setRelation(parent, child);
      }
    }
  }

  return assignments;
}

/**
 * Build nested structure for overlapping events
 */
export function buildNestedStructure(
  parallelGroups: ParallelGroup[],
  allEvents: LayoutWeekEvent[]
): LayoutNode[] {
  const allNodes: LayoutNode[] = [];
  const nodeMap = new Map<string, LayoutNode>();

  const eventMap = new Map<string, LayoutWeekEvent>();
  allEvents.forEach(event => eventMap.set(event.id, event));

  // Create nodes
  for (const group of parallelGroups) {
    for (const event of group.events) {
      const node: LayoutNode = {
        event: eventMap.get(event.id)!,
        children: [],
        parent: null,
        depth: 0,
        isProcessed: false,
      };
      allNodes.push(node);
      nodeMap.set(event.id, node);
    }
  }

  // Establish parent-child relationships
  for (let i = 0; i < parallelGroups.length; i++) {
    const currentGroup = parallelGroups[i];
    const currentGroupEvents = currentGroup.events.map(
      e => eventMap.get(e.id)!
    );

    let foundParent = false;
    for (let j = i - 1; j >= 0 && !foundParent; j--) {
      const potentialParentGroup = parallelGroups[j];
      const potentialParentGroupEvents = potentialParentGroup.events.map(
        e => eventMap.get(e.id)!
      );
      const potentialParentGroupMapped: ParallelGroup = {
        events: potentialParentGroupEvents,
        startHour: potentialParentGroup.startHour,
        endHour: potentialParentGroup.endHour,
      };

      if (
        canGroupContain(potentialParentGroupMapped, {
          events: currentGroupEvents,
          startHour: currentGroup.startHour,
          endHour: currentGroup.endHour,
        })
      ) {
        const childAssignments = optimizeChildAssignments(
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

  const rootNodes = allNodes.filter(node => node.parent === null);
  rootNodes.forEach(rootNode => {
    rootNode.depth = 0;
  });

  // Load balancing
  rebalanceLoadByGroups(parallelGroups, allNodes);

  return rootNodes;
}
