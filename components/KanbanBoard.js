'use client'

import { useEffect, useRef, useState } from 'react'
import { doc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Plus, LayoutGrid, Pencil, Check, X, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react'
import TaskCard from '@/components/TaskCard'
import ProgressBar from '@/components/ProgressBar'
import TeamUpdatesPanel from '@/components/TeamUpdatesPanel'
import { subtaskProgress } from '@/lib/tasks'
import { newColumn, TODO_COLUMN_ID, DONE_COLUMN_ID } from '@/lib/kanbanColumns'

const COLUMN_WIDTH = 272 // px — matches the fixed-width column below, used to page the scroll buttons

// Renders one stage's board. `tasks` are already filtered to this stage's
// top-level tasks (parentTaskId == null) by the caller; subtasks never
// appear here as their own cards — subtaskCountByParent supplies each
// parent card's "X of Y subtasks done" secondary indicator. `columns` is the
// company's Kanban column library (fixed To Do first, fixed Done last,
// custom columns in between — see lib/kanbanColumns.js), passed in already
// ordered by the caller via useKanbanColumns. Columns render in a single
// horizontally-scrolling row (with the "+ Add column" tile inline) so the
// board can grow past the viewport width instead of wrapping — the chevron
// buttons page through it. Team Updates renders as a dropdown anchored to
// this board's header rather than a page-level section.
export default function KanbanBoard({
  tasks,
  subtasksByParent,
  priorityLibrary,
  assignees,
  columns,
  companyId,
  canManage,
  onOpenTask,
  onCreateTask,
  onMoveTask,
  teamUpdates,
  canPostUpdate,
  currentUser,
  onPostUpdate,
  onEditUpdate,
  onDeleteUpdate,
  stages,
}) {
  const [dragTaskId, setDragTaskId] = useState(null)
  const [updatesOpen, setUpdatesOpen] = useState(false)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const scrollRef = useRef(null)
  const updatesRef = useRef(null)

  const done = tasks.filter((t) => t.status === DONE_COLUMN_ID).length
  const total = tasks.length
  const pct = total ? Math.round((done / total) * 100) : 0

  useEffect(() => {
    if (!updatesOpen) return
    function onClickOutside(e) {
      if (updatesRef.current && !updatesRef.current.contains(e.target)) setUpdatesOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [updatesOpen])

  function updateScrollState() {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  useEffect(() => {
    updateScrollState()
  }, [columns.length])

  function scrollByPage(dir) {
    scrollRef.current?.scrollBy({ left: dir * COLUMN_WIDTH * 2, behavior: 'smooth' })
  }

  function handleDragStart(e, task) {
    setDragTaskId(task.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDrop(e, columnId) {
    e.preventDefault()
    if (dragTaskId) onMoveTask(dragTaskId, columnId)
    setDragTaskId(null)
  }

  async function addColumn(name) {
    if (!name?.trim()) return
    const maxOrder = columns.filter((c) => !c.fixed).reduce((m, c) => Math.max(m, c.order ?? 0), 0)
    const entry = newColumn(maxOrder + 1)
    await setDoc(doc(db, 'companies', companyId, 'kanbanColumnLibrary', entry.id), { name: name.trim(), order: entry.order, fixed: false })
  }

  async function renameColumn(columnId, name) {
    if (!name?.trim()) return
    await updateDoc(doc(db, 'companies', companyId, 'kanbanColumnLibrary', columnId), { name: name.trim() })
  }

  return (
    <div className="bg-surface/90 backdrop-blur border border-line rounded-card shadow-card p-6">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-[18px] h-[18px] text-ink" strokeWidth={1.75} />
          <span className="font-display text-xl font-semibold text-ink uppercase tracking-wide">Sprint board</span>
        </div>

        {onPostUpdate && (
          <div className="relative" ref={updatesRef}>
            <button
              onClick={() => setUpdatesOpen((v) => !v)}
              className="flex items-center gap-1.5 text-sm font-semibold text-ink px-3 py-1.5 rounded-lg border border-line hover:border-ink/30 transition-colors"
            >
              <MessageSquare className="w-4 h-4" strokeWidth={1.75} /> Team Updates
            </button>
            {updatesOpen && (
              <div className="absolute z-20 top-full right-0 mt-2 w-[360px] max-h-[70vh] overflow-y-auto bg-surface border border-line rounded-card shadow-card p-5">
                <TeamUpdatesPanel
                  updates={teamUpdates}
                  canPost={canPostUpdate}
                  currentUser={currentUser}
                  onPost={onPostUpdate}
                  onEdit={onEditUpdate}
                  onDelete={onDeleteUpdate}
                  stages={stages}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {total > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5 text-xs">
            <span className="text-slate font-semibold uppercase tracking-wide">{done} of {total} tasks done</span>
            <span className="text-progress font-bold">{pct}%</span>
          </div>
          <ProgressBar pct={pct} className="h-2" />
        </div>
      )}

      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={updateScrollState}
          className="flex items-start gap-4 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {columns.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.id)
            return (
              <div
                key={col.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, col.id)}
                style={{ width: COLUMN_WIDTH }}
                className="flex-shrink-0 bg-paper/60 border border-line rounded-lg p-4 flex flex-col"
              >
                <ColumnHeader
                  column={col}
                  count={colTasks.length}
                  canManage={canManage}
                  onRename={(name) => renameColumn(col.id, name)}
                />
                <div className="space-y-3 overflow-y-auto max-h-[480px] pr-0.5 flex-1 min-h-[80px]">
                  {colTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      priorityLibrary={priorityLibrary}
                      assignees={assignees}
                      subtaskCount={subtaskProgress(subtasksByParent[task.id])}
                      onClick={() => onOpenTask(task)}
                      draggable={canManage}
                      onDragStart={handleDragStart}
                    />
                  ))}
                  {colTasks.length === 0 && (
                    <p className="text-xs text-slate-light italic px-1 py-1">No tasks.</p>
                  )}
                </div>
                {canManage && (
                  <button
                    onClick={() => onCreateTask(col.id)}
                    className="mt-3 flex-shrink-0 text-ink hover:text-signal flex items-center gap-1 text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" strokeWidth={2.5} /> Add task
                  </button>
                )}
              </div>
            )
          })}

          {canManage && (
            <div style={{ width: COLUMN_WIDTH }} className="flex-shrink-0">
              <AddColumnControl onAdd={addColumn} />
            </div>
          )}
        </div>

        {canScrollLeft && (
          <button
            onClick={() => scrollByPage(-1)}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-signal text-white flex items-center justify-center shadow-card hover:bg-signal-dark transition-colors"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
          </button>
        )}
        {canScrollRight && (
          <button
            onClick={() => scrollByPage(1)}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-8 h-8 rounded-full bg-signal text-white flex items-center justify-center shadow-card hover:bg-signal-dark transition-colors"
          >
            <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  )
}

function ColumnHeader({ column, count, canManage, onRename }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(column.name)

  function save() {
    onRename(name)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5 mb-3 px-0.5">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          className="flex-1 min-w-0 text-xs font-semibold uppercase tracking-wide text-ink bg-surface border border-line rounded px-1.5 py-0.5 outline-none focus:border-signal"
        />
        <button onClick={save} className="text-progress flex-shrink-0"><Check className="w-3.5 h-3.5" strokeWidth={2} /></button>
        <button onClick={() => { setName(column.name); setEditing(false) }} className="text-slate-light flex-shrink-0"><X className="w-3.5 h-3.5" strokeWidth={2} /></button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between mb-3 px-0.5 flex-shrink-0 group">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate truncate">{column.name}</span>
        {canManage && !column.fixed && (
          <button onClick={() => setEditing(true)} className="text-slate-light hover:text-ink opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <Pencil className="w-3 h-3" strokeWidth={1.75} />
          </button>
        )}
      </div>
      <span className="text-xs text-slate-light flex-shrink-0">{count}</span>
    </div>
  )
}

function AddColumnControl({ onAdd }) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')

  function save() {
    onAdd(name)
    setName('')
    setAdding(false)
  }

  if (!adding) {
    return (
      <button
        onClick={() => setAdding(true)}
        className="w-full border border-dashed border-line rounded-lg p-4 flex items-center justify-center gap-1.5 text-sm font-semibold text-slate hover:text-ink hover:border-ink/30 transition-colors min-h-[120px]"
      >
        <Plus className="w-3.5 h-3.5" strokeWidth={2.5} /> Add column
      </button>
    )
  }

  return (
    <div className="border border-signal/40 rounded-lg p-4 bg-signal-light/30 space-y-2">
      <input
        autoFocus
        placeholder="Column name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && save()}
        className="w-full border border-line rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-signal bg-surface"
      />
      <div className="flex justify-end gap-2">
        <button onClick={() => { setName(''); setAdding(false) }} className="text-xs font-medium px-2 py-1 rounded-lg text-slate hover:text-ink flex items-center gap-1"><X className="w-3.5 h-3.5" /></button>
        <button onClick={save} className="text-xs font-medium px-2.5 py-1 rounded-lg bg-signal text-white hover:bg-signal-dark flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Add</button>
      </div>
    </div>
  )
}
