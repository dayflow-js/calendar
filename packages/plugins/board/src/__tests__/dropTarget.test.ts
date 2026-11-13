import {
  autoScrollDelta,
  nextFocusedTaskId,
  nextKeyboardDropState,
  pickGroupAtPoint,
  resolveDropIndex,
} from '@board/interaction/dropTarget';
import { assert, test } from 'vitest';

const cards = [
  { id: 'a', top: 0, bottom: 40 },
  { id: 'b', top: 48, bottom: 88 },
  { id: 'c', top: 96, bottom: 136 },
];

test('drops before the first card whose midpoint is below the pointer', () => {
  assert.deepEqual(resolveDropIndex(10, cards), {
    index: 0,
    beforeTaskId: 'a',
    afterTaskId: undefined,
  });
  assert.deepEqual(resolveDropIndex(70, cards), {
    index: 2,
    beforeTaskId: 'c',
    afterTaskId: 'b',
  });
  assert.deepEqual(resolveDropIndex(500, cards), {
    index: 3,
    beforeTaskId: undefined,
    afterTaskId: 'c',
  });
  assert.deepEqual(resolveDropIndex(10, []), {
    index: 0,
    beforeTaskId: undefined,
    afterTaskId: undefined,
  });
});

test('picks the column under the pointer or the nearest one', () => {
  const columns = [
    { id: 'todo', left: 0, right: 280 },
    { id: 'doing', left: 292, right: 572 },
  ];
  assert.strictEqual(pickGroupAtPoint(100, columns), 'todo');
  assert.strictEqual(pickGroupAtPoint(290, columns), 'doing');
  assert.strictEqual(pickGroupAtPoint(900, columns), 'doing');
  assert.strictEqual(pickGroupAtPoint(10, []), null);
});

test('auto-scroll speeds up towards the edges', () => {
  assert.strictEqual(autoScrollDelta(500, 0, 1000), 0);
  assert.ok(autoScrollDelta(5, 0, 1000) < 0);
  assert.ok(autoScrollDelta(995, 0, 1000) > 0);
  assert.ok(
    Math.abs(autoScrollDelta(1, 0, 1000)) >
      Math.abs(autoScrollDelta(40, 0, 1000))
  );
});

test('keyboard dragging moves within and across droppable groups', () => {
  const groups = [
    { id: 'todo', visibleTaskIds: ['a', 'b'], droppable: true },
    { id: 'locked', visibleTaskIds: ['x'], droppable: false },
    { id: 'done', visibleTaskIds: ['c'], droppable: true },
  ];
  const start = { groupId: 'todo', index: 0 };
  assert.deepEqual(nextKeyboardDropState(groups, 'a', start, 'ArrowDown'), {
    groupId: 'todo',
    index: 1,
  });
  assert.deepEqual(
    nextKeyboardDropState(
      groups,
      'a',
      { groupId: 'todo', index: 1 },
      'ArrowDown'
    ),
    { groupId: 'todo', index: 1 }
  );
  assert.deepEqual(nextKeyboardDropState(groups, 'a', start, 'ArrowRight'), {
    groupId: 'done',
    index: 0,
  });
  assert.deepEqual(
    nextKeyboardDropState(
      groups,
      'a',
      { groupId: 'done', index: 1 },
      'ArrowLeft'
    ),
    { groupId: 'todo', index: 1 }
  );
});

test('arrow keys move focus between cards and columns', () => {
  const groups = [
    { id: 'todo', visibleTaskIds: ['a', 'b', 'c'] },
    { id: 'empty', visibleTaskIds: [] },
    { id: 'done', visibleTaskIds: ['d'] },
  ];
  assert.strictEqual(nextFocusedTaskId(groups, 'a', 'ArrowDown'), 'b');
  assert.strictEqual(nextFocusedTaskId(groups, 'a', 'ArrowUp'), 'a');
  assert.strictEqual(nextFocusedTaskId(groups, 'c', 'ArrowRight'), 'd');
  assert.strictEqual(nextFocusedTaskId(groups, 'd', 'ArrowLeft'), 'a');
  assert.strictEqual(nextFocusedTaskId(groups, 'b', 'End'), 'c');
});

test('column drops use the other columns midpoints', async () => {
  const { resolveColumnDropIndex } =
    await import('@board/interaction/dropTarget');
  const columns = [
    { id: 'a', left: 0, width: 280 },
    { id: 'b', left: 292, width: 280 },
    { id: 'c', left: 584, width: 280 },
  ];
  assert.strictEqual(resolveColumnDropIndex(100, columns, 'c'), 0);
  assert.strictEqual(resolveColumnDropIndex(500, columns, 'a'), 1);
  assert.strictEqual(resolveColumnDropIndex(800, columns, 'a'), 2);
  assert.strictEqual(resolveColumnDropIndex(10, columns, 'a'), 0);
});

test('column offsets open a gap at the target index', async () => {
  const { columnShiftOffsets } = await import('@board/interaction/dropTarget');
  const columns = [
    { id: 'a', left: 0, width: 280 },
    { id: 'b', left: 292, width: 44 },
    { id: 'c', left: 348, width: 280 },
  ];
  // Moving `a` to the end: b and c slide left by a's width plus the gap,
  // and a's placeholder lands after c.
  const offsets = columnShiftOffsets(columns, 'a', 2);
  assert.strictEqual(offsets.get('b'), -292);
  assert.strictEqual(offsets.get('c'), -292);
  assert.strictEqual(offsets.get('a'), 44 + 12 + 280 + 12);
  // Unchanged position: no offsets.
  const still = columnShiftOffsets(columns, 'b', 1);
  assert.deepEqual([...still.values()], [0, 0, 0]);
});
