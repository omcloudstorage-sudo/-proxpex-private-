// A task and a subtask share this exact schema — a subtask is a task doc
// with parentTaskId set to its parent's id. One level deep only: enforced
// here (isSubtask helper), in the UI (TaskDetailModal hides "+ Add
// subtask" when isSubtask), and in firestore.rules (create rejects a
// grandchild).
export const TASK_STATUS = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  REVIEW: 'review',
  DONE: 'done',
}

export const TASK_STATUS_COLUMNS = [
  { id: TASK_STATUS.TODO, name: 'To Do' },
  { id: TASK_STATUS.IN_PROGRESS, name: 'In Progress' },
  { id: TASK_STATUS.REVIEW, name: 'Review' },
  { id: TASK_STATUS.DONE, name: 'Done' },
]

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

export function newTaskDraft({ priorityId, stageId, parentTaskId = null } = {}) {
  return {
    title: '',
    description: '',
    priorityId: priorityId || 'medium',
    status: TASK_STATUS.TODO,
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
