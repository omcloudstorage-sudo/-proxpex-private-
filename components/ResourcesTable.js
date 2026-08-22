'use client'

import { useEffect, useRef, useState } from 'react'
import { Plus, Trash2, Copy, Check, ExternalLink, ChevronDown, ChevronRight, Eye, EyeOff, KeyRound, ShieldCheck, Link2 } from 'lucide-react'
import { newSection, newItem, ITEM_TYPES } from '@/lib/resources'
import { AUDIT_ACTIONS } from '@/lib/auditLog'

const ADD_ITEM_OPTIONS = [
  { type: ITEM_TYPES.KEY, label: 'Key', icon: KeyRound },
  { type: ITEM_TYPES.CREDENTIAL, label: 'Credential', icon: ShieldCheck },
  { type: ITEM_TYPES.LINK, label: 'Link / Resource', icon: Link2 },
]

// Shared by the project detail page and the template editor.
// canManage (Admin/PM): can add/rename/remove sections and add/remove
// items. Everyone else (Client/Team member) can only fill in values on
// items that already exist — no structural changes.
// logAction, if given, gets (action, description) calls for the audit log.
// Value edits are logged on blur (not per keystroke) and never include the
// actual field content — only which section changed — since these fields
// can hold secrets and the log is readable by everyone on the project.
export default function ResourcesTable({ sections, onChange, canManage = true, logAction, focusItemId = null }) {
  const [collapsed, setCollapsed] = useState({})

  function addSection() {
    onChange([...(sections || []), newSection((sections || []).length)])
  }
  function updateSection(id, patch) {
    onChange((sections || []).map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }
  function removeSection(id) {
    const section = (sections || []).find((s) => s.id === id)
    onChange((sections || []).filter((s) => s.id !== id))
    logAction?.(AUDIT_ACTIONS.RESOURCE_SECTION_REMOVED, `Removed resource section "${section?.name || ''}"`)
  }
  function addItem(sectionId, type) {
    const section = (sections || []).find((s) => s.id === sectionId)
    onChange((sections || []).map((s) => (s.id === sectionId ? { ...s, items: [...s.items, newItem(type, s.items.length)] } : s)))
    logAction?.(AUDIT_ACTIONS.RESOURCE_ITEM_ADDED, `Added a ${type} item to "${section?.name || ''}"`)
  }
  function updateItem(sectionId, itemId, patch) {
    onChange((sections || []).map((s) => (s.id !== sectionId ? s : { ...s, items: s.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)) })))
  }
  function removeItem(sectionId, itemId) {
    const section = (sections || []).find((s) => s.id === sectionId)
    onChange((sections || []).map((s) => (s.id !== sectionId ? s : { ...s, items: s.items.filter((it) => it.id !== itemId) })))
    logAction?.(AUDIT_ACTIONS.RESOURCE_ITEM_REMOVED, `Removed an item from "${section?.name || ''}"`)
  }
  function toggleCollapsed(id) {
    setCollapsed((c) => ({ ...c, [id]: !c[id] }))
  }
  function logValueChanged(sectionName) {
    logAction?.(AUDIT_ACTIONS.RESOURCE_VALUE_UPDATED, `Updated a value in "${sectionName}"`)
  }
  function logSectionRenamed(oldName, newName) {
    logAction?.(AUDIT_ACTIONS.RESOURCE_SECTION_RENAMED, `Renamed section "${oldName}" to "${newName}"`)
  }

  return (
    <div className="space-y-4">
      {(sections || []).length === 0 && (
        <p className="text-sm text-slate-light italic">No sections yet.</p>
      )}

      {(sections || []).map((section) => (
        <SectionGroup
          key={section.id}
          section={section}
          canManage={canManage}
          collapsed={!!collapsed[section.id]}
          onToggleCollapsed={() => toggleCollapsed(section.id)}
          onUpdateSection={(patch) => updateSection(section.id, patch)}
          onRemoveSection={() => removeSection(section.id)}
          onAddItem={(type) => addItem(section.id, type)}
          onUpdateItem={(itemId, patch) => updateItem(section.id, itemId, patch)}
          onRemoveItem={(itemId) => removeItem(section.id, itemId)}
          onLogValueChanged={() => logValueChanged(section.name)}
          onLogSectionRenamed={logSectionRenamed}
          focusItemId={focusItemId}
        />
      ))}

      {canManage && (
        <button onClick={addSection} className="flex items-center gap-1.5 text-sm font-semibold text-signal hover:text-signal-dark">
          <Plus className="w-4 h-4" strokeWidth={2} /> Add new section
        </button>
      )}
    </div>
  )
}

function SectionGroup({
  section, canManage, collapsed, onToggleCollapsed, onUpdateSection, onRemoveSection,
  onAddItem, onUpdateItem, onRemoveItem, onLogValueChanged, onLogSectionRenamed, focusItemId,
}) {
  const nameFocusRef = useRef(section.name)

  return (
    <div className="border border-line rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 bg-signal-light/20">
        <button onClick={onToggleCollapsed} className="text-signal flex-shrink-0">
          {collapsed ? <ChevronRight className="w-4 h-4" strokeWidth={2} /> : <ChevronDown className="w-4 h-4" strokeWidth={2} />}
        </button>
        {canManage ? (
          <input
            value={section.name}
            onChange={(e) => onUpdateSection({ name: e.target.value })}
            onFocus={(e) => { nameFocusRef.current = e.target.value }}
            onBlur={(e) => {
              if (nameFocusRef.current !== e.target.value) onLogSectionRenamed(nameFocusRef.current, e.target.value)
            }}
            className="flex-1 min-w-0 bg-transparent outline-none border-b border-transparent focus:border-signal font-display font-semibold text-sm text-signal"
          />
        ) : (
          <span className="flex-1 min-w-0 font-display font-semibold text-sm text-signal">{section.name}</span>
        )}
        <span className="text-[11px] text-slate-light flex-shrink-0">{section.items.length} item{section.items.length === 1 ? '' : 's'}</span>
        {canManage && (
          <button onClick={onRemoveSection} className="text-slate-light hover:text-coral flex-shrink-0"><Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} /></button>
        )}
      </div>

      {!collapsed && (
        <div className="p-3 space-y-3">
          {section.items.length === 0 && (
            <p className="text-sm text-slate-light italic">No items yet.</p>
          )}
          {section.items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              canManage={canManage}
              onUpdate={(patch) => onUpdateItem(item.id, patch)}
              onRemove={() => onRemoveItem(item.id)}
              onLogValueChanged={onLogValueChanged}
              focused={item.id === focusItemId}
            />
          ))}

          {canManage && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-slate-light">Add new item:</span>
              {ADD_ITEM_OPTIONS.map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => onAddItem(type)}
                  className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border border-line text-slate hover:border-signal hover:text-signal bg-surface"
                >
                  <Icon className="w-3.5 h-3.5" strokeWidth={1.75} /> {label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CopyButton({ value }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    if (!value) return
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }
  return (
    <button type="button" onClick={copy} className="text-slate-light hover:text-ink flex-shrink-0" title="Copy">
      {copied ? <Check className="w-3.5 h-3.5" strokeWidth={1.75} /> : <Copy className="w-3.5 h-3.5" strokeWidth={1.75} />}
    </button>
  )
}

function Field({ label, children }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-light mb-1">{label}</div>
      {children}
    </div>
  )
}

const inputCls = 'w-full border border-line rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-signal bg-surface'

// Tracks each field's value at focus time so a blur only fires the audit
// log when the content actually changed — never on every keystroke, and
// never with the value itself in the log entry.
function useBlurLogger(onLogValueChanged) {
  const focusRef = useRef({})
  return {
    onFocus: (field, value) => { focusRef.current[field] = value },
    onBlur: (field, value) => {
      if (focusRef.current[field] !== undefined && focusRef.current[field] !== value) onLogValueChanged?.()
      delete focusRef.current[field]
    },
  }
}

function ItemCard({ item, canManage, onUpdate, onRemove, onLogValueChanged, focused = false }) {
  const [revealed, setRevealed] = useState(false)
  const blurLog = useBlurLogger(onLogValueChanged)
  const ref = useRef(null)

  useEffect(() => {
    if (focused && ref.current) ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [focused])

  return (
    <div
      ref={ref}
      id={`resource-item-${item.id}`}
      className={`border rounded-lg p-3 bg-paper/60 transition-colors ${focused ? 'border-signal shadow-glow' : 'border-line'}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {item.type === ITEM_TYPES.RESOURCE && (
            <div className="space-y-2">
              <Field label="Resource name">
                <input
                  value={item.name}
                  onChange={(e) => onUpdate({ name: e.target.value })}
                  onFocus={(e) => blurLog.onFocus('name', e.target.value)}
                  onBlur={(e) => blurLog.onBlur('name', e.target.value)}
                  placeholder="e.g. API Documentation"
                  className={inputCls}
                />
              </Field>
              <Field label="Detailed configuration / notes">
                <textarea
                  value={item.notes}
                  onChange={(e) => onUpdate({ notes: e.target.value })}
                  onFocus={(e) => blurLog.onFocus('notes', e.target.value)}
                  onBlur={(e) => blurLog.onBlur('notes', e.target.value)}
                  rows={2}
                  className={`${inputCls} resize-none`}
                />
              </Field>
            </div>
          )}

          {item.type === ITEM_TYPES.KEY && (
            <div className="space-y-2">
              <Field label="Key name">
                <input
                  value={item.name}
                  onChange={(e) => onUpdate({ name: e.target.value })}
                  onFocus={(e) => blurLog.onFocus('name', e.target.value)}
                  onBlur={(e) => blurLog.onBlur('name', e.target.value)}
                  placeholder="e.g. AWS_ACCESS_KEY_ID"
                  className={inputCls}
                />
              </Field>
              <Field label="Key value">
                <div className="flex items-center gap-1.5">
                  <input
                    type={revealed ? 'text' : 'password'}
                    value={item.value}
                    onChange={(e) => onUpdate({ value: e.target.value })}
                    onFocus={(e) => blurLog.onFocus('value', e.target.value)}
                    onBlur={(e) => blurLog.onBlur('value', e.target.value)}
                    placeholder="Enter key value…"
                    className={`${inputCls} flex-1`}
                  />
                  <button type="button" onClick={() => setRevealed((r) => !r)} className="text-slate-light hover:text-ink flex-shrink-0">
                    {revealed ? <EyeOff className="w-3.5 h-3.5" strokeWidth={1.75} /> : <Eye className="w-3.5 h-3.5" strokeWidth={1.75} />}
                  </button>
                  <CopyButton value={item.value} />
                </div>
              </Field>
            </div>
          )}

          {item.type === ITEM_TYPES.CREDENTIAL && (
            <div className="grid sm:grid-cols-3 gap-2">
              <Field label="Label">
                <input
                  value={item.label}
                  onChange={(e) => onUpdate({ label: e.target.value })}
                  onFocus={(e) => blurLog.onFocus('label', e.target.value)}
                  onBlur={(e) => blurLog.onBlur('label', e.target.value)}
                  placeholder="e.g. Staging Server"
                  className={inputCls}
                />
              </Field>
              <Field label="ID">
                <div className="flex items-center gap-1.5">
                  <input
                    value={item.username}
                    onChange={(e) => onUpdate({ username: e.target.value })}
                    onFocus={(e) => blurLog.onFocus('username', e.target.value)}
                    onBlur={(e) => blurLog.onBlur('username', e.target.value)}
                    className={`${inputCls} flex-1`}
                  />
                  <CopyButton value={item.username} />
                </div>
              </Field>
              <Field label="Password">
                <div className="flex items-center gap-1.5">
                  <input
                    type={revealed ? 'text' : 'password'}
                    value={item.password}
                    onChange={(e) => onUpdate({ password: e.target.value })}
                    onFocus={(e) => blurLog.onFocus('password', e.target.value)}
                    onBlur={(e) => blurLog.onBlur('password', e.target.value)}
                    className={`${inputCls} flex-1`}
                  />
                  <button type="button" onClick={() => setRevealed((r) => !r)} className="text-slate-light hover:text-ink flex-shrink-0">
                    {revealed ? <EyeOff className="w-3.5 h-3.5" strokeWidth={1.75} /> : <Eye className="w-3.5 h-3.5" strokeWidth={1.75} />}
                  </button>
                  <CopyButton value={item.password} />
                </div>
              </Field>
            </div>
          )}

          {item.type === ITEM_TYPES.LINK && (
            <div className="grid sm:grid-cols-2 gap-2">
              <Field label="Link name">
                <input
                  value={item.name}
                  onChange={(e) => onUpdate({ name: e.target.value })}
                  onFocus={(e) => blurLog.onFocus('name', e.target.value)}
                  onBlur={(e) => blurLog.onBlur('name', e.target.value)}
                  placeholder="e.g. Design System"
                  className={inputCls}
                />
              </Field>
              <Field label="URL">
                <div className="flex items-center gap-1.5">
                  <input
                    value={item.url}
                    onChange={(e) => onUpdate({ url: e.target.value })}
                    onFocus={(e) => blurLog.onFocus('url', e.target.value)}
                    onBlur={(e) => blurLog.onBlur('url', e.target.value)}
                    placeholder="https://…"
                    className={`${inputCls} flex-1`}
                  />
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noreferrer" className="text-slate-light hover:text-ink flex-shrink-0">
                      <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </a>
                  )}
                </div>
              </Field>
            </div>
          )}
        </div>

        {canManage && (
          <button onClick={onRemove} className="text-slate-light hover:text-coral flex-shrink-0 mt-4"><Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} /></button>
        )}
      </div>
    </div>
  )
}
