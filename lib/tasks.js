// A task and a subtask share this exact schema — a subtask is a task doc
// with parentTaskId set to its parent's id. One level deep only: enforced
// here (isSubtask helper), in the UI (TaskDetailModal hides "+ Add
// subtask" when isSubtask), and in firestore.rules (create rejects a
// grandchild).
// task.status is a column id from the company's Kanban column library (see
// lib/kanbanColumns.js) — only TODO/DONE are reserved fixed ids; everything
// in between is company-configurable, so there's no fixed column list here
// anymore.
export const TASK_STATUS = {
  TODO: 'todo',
  DONE: 'done',
}

export function isSubtask(task) {
  return !!task?.parentTaskId
}

// Overdue is purely derived from timerDeadline vs now — never stored, so
// there's nothing to keep in sync and no scheduled job needed. A task with
// no timer set is never overdue.
export function isOverdue(task) {
  if (!task?.timerDeadline || task.status === TASK_STATUS.DONE) return false
  return new Date(task.timerDeadline).getTime() < Date.now()
}

export function newTaskDraft({ priorityId, stageId, parentTaskId = null, status } = {}) {
  return {
    title: '',
    description: '',
    priorityId: priorityId || 'medium',
    status: status || TASK_STATUS.TODO,
    stageId,
    parentTaskId,
    assigneeIds: [],
    timerDeadline: null,
  }
}

export function subtaskProgress(subtasks) {
  const total = subtasks?.length || 0
  const done = (subtasks || []).filter((t) => t.status === TASK_STATUS.DONE).length
  return { done, total }
}
