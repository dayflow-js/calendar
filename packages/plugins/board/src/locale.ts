import type { BoardMessages } from './types';

const en: BoardMessages = {
  title: 'Board',
  groupBy: 'Group by',
  assignee: 'Assignee',
  addTask: 'Add task',
  newTask: 'New task',
  cancel: 'Cancel',
  columnMenu: 'Column actions',
  renameColumn: 'Rename',
  columnColor: 'Color',
  done: 'Done',
  deleteColumn: 'Delete column',
  deleteColumnBlocked: 'A board needs at least one column',
  deleteColumnTitle: 'Delete “{title}”?',
  deleteColumnMessage:
    'Do you want to delete “{title}” and its tasks, or merge its tasks into another column?',
  confirmDeleteColumnTitle: 'Delete “{title}” and all of its tasks?',
  confirmDeleteColumnMessage:
    'All tasks in this column will be deleted as well. This can’t be undone.',
  deleteColumnEmpty: 'This column has no tasks. This can’t be undone.',
  merge: 'Merge',
  mergeColumnTitle: 'Merge “{source}” into “{target}”?',
  mergeColumnMessage:
    'All tasks in “{source}” will move to “{target}”, and “{source}” will be deleted. This can’t be undone.',
  addColumn: 'Add column',
  newColumnTitle: 'New column',
  moved: 'Task moved',
  saveFailed: 'Unable to save task',
  filterByAssignee: 'Show tasks assigned to',
  clearFilter: 'Show everyone',
  reorderColumn: 'Drag to reorder column; Alt + Left/Right to move',
  columnMoved: 'Column moved',
};

const zh: BoardMessages = {
  title: '看板',
  groupBy: '分组',
  assignee: '负责人',
  addTask: '添加任务',
  newTask: '新建任务',
  cancel: '取消',
  columnMenu: '列操作',
  renameColumn: '重命名',
  columnColor: '颜色',
  done: '完成',
  deleteColumn: '删除列',
  deleteColumnBlocked: '看板至少需要保留一列',
  deleteColumnTitle: '删除“{title}”？',
  deleteColumnMessage: '要删除“{title}”及其中的任务，还是把任务合并到另一列？',
  confirmDeleteColumnTitle: '删除“{title}”及其中所有任务？',
  confirmDeleteColumnMessage: '这一列中的所有任务也会被删除。此操作无法撤销。',
  deleteColumnEmpty: '这一列没有任务。此操作无法撤销。',
  merge: '合并',
  mergeColumnTitle: '把“{source}”合并到“{target}”？',
  mergeColumnMessage:
    '“{source}”中的所有任务将移到“{target}”，“{source}”会被删除。此操作无法撤销。',
  addColumn: '添加列',
  newColumnTitle: '新列',
  moved: '任务已移动',
  saveFailed: '无法保存任务',
  filterByAssignee: '只看分配给',
  clearFilter: '显示所有人',
  reorderColumn: '拖动调整列顺序，或按 Alt + 左右方向键移动',
  columnMoved: '列顺序已更新',
};

export function getBoardMessages(locale: string): BoardMessages {
  return locale.toLowerCase().startsWith('zh') ? zh : en;
}
