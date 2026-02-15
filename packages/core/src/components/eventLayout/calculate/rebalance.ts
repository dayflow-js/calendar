import { LayoutWeekEvent, ParallelGroup, LayoutNode } from '../types';
import { canEventContain, shouldBeParallel } from '../utils';
import { LAYOUT_CONFIG } from '../constants';

export function rebalanceLoadByGroups(
  parallelGroups: ParallelGroup[],
  allNodes: LayoutNode[]
): void {
  for (let i = parallelGroups.length - 1; i >= 1; i--) {
    const groupNodes = parallelGroups[i].events.map(
      e => allNodes.find(node => node.event.id === e.id)!
    );

    const parentLoads = calculateParentLoads(groupNodes, allNodes);
    if (needsRebalancing(parentLoads)) {
      rebalanceGroupLoad(parentLoads);
    }
  }
}

function calculateParentLoads(
  groupNodes: LayoutNode[],
  allNodes: LayoutNode[]
): Array<{ node: LayoutNode; load: number }> {
  const parentLevel = groupNodes[0]?.parent?.depth;
  if (parentLevel === undefined) return [];

  return allNodes
    .filter(node => node.depth === parentLevel)
    .map(node => ({ node, load: countDescendants(node) }))
    .sort((a, b) => b.load - a.load);
}

function countDescendants(node: LayoutNode): number {
  let count = 0;
  for (const child of node.children) {
    count += 1 + countDescendants(child);
  }
  return count;
}

function needsRebalancing(
  parentLoads: Array<{ node: LayoutNode; load: number }>
): boolean {
  if (parentLoads.length < 2) return false;
  return parentLoads[0].load - parentLoads[parentLoads.length - 1].load >= 2;
}

function rebalanceGroupLoad(
  parentLoads: Array<{ node: LayoutNode; load: number }>
): void {
  const maxIterations = 5;
  let iteration = 0;

  while (iteration < maxIterations) {
    parentLoads.sort((a, b) => b.load - a.load);
    const heaviest = parentLoads[0];
    const lightest = parentLoads[parentLoads.length - 1];

    if (heaviest.load - lightest.load < 2) break;

    const transferableLeaf = findTransferableLeaf(heaviest.node, lightest.node);
    if (transferableLeaf) {
      transferNode(transferableLeaf, lightest.node);
      heaviest.load--;
      lightest.load++;
      iteration++;
    } else {
      break;
    }
  }
}

function findTransferableLeaf(
  heavyRoot: LayoutNode,
  lightRoot: LayoutNode
): LayoutNode | null {
  const leaves: LayoutNode[] = [];
  collectLeaves(heavyRoot, leaves);
  return (
    leaves.find(leaf => canEventContain(lightRoot.event, leaf.event)) ||
    leaves[0] ||
    null
  );
}

function collectLeaves(node: LayoutNode, leaves: LayoutNode[]): void {
  if (node.children.length === 0) {
    leaves.push(node);
  } else {
    node.children.forEach(child => collectLeaves(child, leaves));
  }
}

function transferNode(leafNode: LayoutNode, newParent: LayoutNode): void {
  if (leafNode.parent) {
    leafNode.parent.children = leafNode.parent.children.filter(
      c => c !== leafNode
    );
  }

  const shouldNestUnder = newParent.children.find(c =>
    canEventContain(c.event, leafNode.event)
  );

  if (shouldNestUnder) {
    leafNode.parent = shouldNestUnder;
    leafNode.depth = shouldNestUnder.depth + 1;
    shouldNestUnder.children.push(leafNode);
    setParentChildRelation(shouldNestUnder.event, leafNode.event);
  } else {
    leafNode.parent = newParent;
    leafNode.depth = newParent.depth + 1;
    newParent.children.push(leafNode);
    setParentChildRelation(newParent.event, leafNode.event);
  }
}

function setParentChildRelation(
  parent: LayoutWeekEvent,
  child: LayoutWeekEvent
): void {
  child.parentId = parent.id;
  if (!parent.children.includes(child.id)) {
    parent.children.push(child.id);
  }
}
