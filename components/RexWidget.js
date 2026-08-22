'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname, useParams } from 'next/navigation'
import { X, Send, RotateCcw, Lock, ArrowUpRight } from 'lucide-react'
import { auth } from '@/lib/firebase'
import RexIcon from '@/components/RexIcon'
import { useRexPreferences } from '@/contexts/RexPreferencesContext'

const MAX_MESSAGES = 25

// Launcher box size + rest-corner margin — kept in sync with the w-16
// (64px) button below and its old bottom-6/right-6 (24px) position, so
// switching to roaming doesn't shift Rex's resting spot.
const SIZE = 64
const MARGIN = 24
const JUMP_MS = 380
const HOLD_MS = 3500

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function askRex({ message, history, pageContext }) {
  const idToken = await auth.currentUser.getIdToken()
  const res = await fetch('/api/rex/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ message, history, pageContext }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) return { error: data.error || 'Something went wrong.' }
  return { text: data.text, links: data.links }
}

function ResultLink({ link, onNavigate }) {
  return (
    <button
      onClick={() => onNavigate(link.href)}
      className="w-full flex items-center gap-2 text-left px-2.5 py-2 rounded-lg border border-line bg-surface hover:border-signal hover:text-signal transition-colors text-xs"
    >
      {link.sensitive ? (
        <Lock className="w-3 h-3 flex-shrink-0 text-slate-light" strokeWidth={2} />
      ) : (
        <ArrowUpRight className="w-3 h-3 flex-shrink-0 text-slate-light" strokeWidth={2} />
      )}
      <span className="flex-1 min-w-0 truncate text-slate">{link.label}</span>
    </button>
  )
}

// Rex's own small avatar, sat beside his messages exactly like a person's
// avatar would be — this is the one place his live state (searching,
// writing, found) actually plays out while he's "in the chat", rather
// than on a detached icon above the conversation.
function RexAvatar({ state = 'idle' }) {
  return (
    <div className="w-6 h-6 flex-shrink-0 mt-0.5">
      <RexIcon variant="compact" state={state} />
    </div>
  )
}

function Message({ msg, onNavigate }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex items-start gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && <RexAvatar state="idle" />}
      <div className={`max-w-[78%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1.5`}>
        <div
          className={[
            'px-3 py-2 rounded-xl text-sm whitespace-pre-wrap break-words',
            isUser ? 'bg-signal text-white rounded-br-sm' : 'bg-paper text-ink border border-line rounded-bl-sm',
          ].join(' ')}
        >
          {msg.text}
        </div>
        {msg.links?.length > 0 && (
          <div className="w-full flex flex-col gap-1.5">
            {msg.links.slice(0, 6).map((link, i) => (
              <ResultLink key={i} link={link} onNavigate={onNavigate} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Live "Rex is working" row — his avatar plays the real searching/writing/
// found motion here, in the flow of the conversation, then this row is
// replaced by his actual reply once it lands.
function RexWorking({ state }) {
  const label = state === 'writing' ? 'Writing a reply…' : 'Searching…'
  return (
    <div className="flex items-start gap-2 justify-start">
      <RexAvatar state={state} />
      <div className="px-3 py-2 rounded-xl rounded-bl-sm bg-paper border border-line text-xs text-slate-light italic">
        {state === 'found' ? 'Found it…' : label}
      </div>
    </div>
  )
}

export default function RexWidget() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const { roamEnabled } = useRexPreferences()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [rexState, setRexState] = useState('idle')
  const [busy, setBusy] = useState(false)
  const listRef = useRef(null)

  // Roaming: position is tracked separately from the chat-turn `rexState`
  // above (searching/writing/found) — `motion` only ever holds
  // idle/running/jumping, and only drives the floating launcher, never the
  // in-chat avatar.
  const [pos, setPos] = useState(null)
  const [motion, setMotion] = useState('idle')
  const [reducedMotion, setReducedMotion] = useState(false)
  const posRef = useRef(null)
  const restingRef = useRef(true)
  const timersRef = useRef([])

  const roamEffective = roamEnabled && !reducedMotion

  useEffect(() => {
    posRef.current = pos
  }, [pos])

  function clearTimers() {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }
  function after(ms, fn) {
    timersRef.current.push(setTimeout(fn, ms))
  }
  function restPos() {
    return { left: window.innerWidth - MARGIN - SIZE, top: window.innerHeight - MARGIN - SIZE, duration: 0 }
  }
  function tripDuration(from, to) {
    const dist = Math.hypot(to.left - from.left, to.top - from.top)
    return Math.round(Math.min(900, Math.max(420, dist * 1.15)))
  }

  // Mount: place Rex at rest, and track the OS-level reduced-motion
  // preference live (it can change without a reload).
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const onMq = (e) => setReducedMotion(e.matches)
    mq.addEventListener('change', onMq)

    setPos(restPos())

    function onResize() {
      if (restingRef.current) setPos(restPos())
    }
    window.addEventListener('resize', onResize)

    return () => {
      mq.removeEventListener('change', onMq)
      window.removeEventListener('resize', onResize)
      clearTimers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function goRestNow() {
    clearTimers()
    restingRef.current = true
    setMotion('idle')
    setPos(restPos())
  }

  // Run to a clicked sidebar item, jump, hold, then wander back to the
  // resting corner — settling near the section reads as "acknowledging"
  // the click, but returning home afterward keeps him from permanently
  // parking on top of sidebar text.
  function runTo(rect) {
    if (!roamEffective || open) return
    clearTimers()
    restingRef.current = false

    const target = {
      left: Math.min(rect.left + rect.width + 8, window.innerWidth - SIZE - 8),
      top: Math.max(8, Math.min(rect.top + rect.height / 2 - SIZE / 2, window.innerHeight - SIZE - 8)),
    }
    const from = posRef.current || restPos()
    const goDuration = tripDuration(from, target)

    setMotion('running')
    setPos({ ...target, duration: goDuration })

    after(goDuration, () => {
      setMotion('jumping')
      after(JUMP_MS, () => {
        setMotion('idle')
        after(HOLD_MS, () => {
          if (open) return
          restingRef.current = true
          const home = restPos()
          const backDuration = tripDuration(target, home)
          setMotion('running')
          setPos({ ...home, duration: backDuration })
          after(backDuration, () => setMotion('idle'))
        })
      })
    })
  }

  // Sidebar nav dispatches this on an actual section change (see
  // DashboardShell) — not on every click in the app.
  useEffect(() => {
    function onNav(e) {
      runTo(e.detail.rect)
    }
    window.addEventListener('rex:navigate', onNav)
    return () => window.removeEventListener('rex:navigate', onNav)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roamEffective, open])

  // Opening the chat snaps Rex home instantly — the panel itself is
  // anchored bottom-right, so this keeps it opening next to him rather
  // than wherever he happened to be mid-roam.
  useEffect(() => {
    if (open) goRestNow()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Toggling roaming off (Settings, or reduced-motion kicking in
  // mid-session) cancels any run in progress and snaps home.
  useEffect(() => {
    if (!roamEffective) goRestNow()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roamEffective])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, busy, open])

  const atCap = messages.length >= MAX_MESSAGES

  // Reuses the app's own router state — no separate tracking of "what page
  // is the user on" beyond this.
  const pageContext =
    pathname?.startsWith('/project/') && params?.id ? { type: 'project', projectId: params.id } : null

  function onNavigate(href) {
    setOpen(false)
    router.push(href)
  }

  function newConversation() {
    setMessages([])
    setInput('')
    setRexState('idle')
  }

  async function send() {
    const text = input.trim()
    if (!text || busy || atCap) return

    setInput('')
    setBusy(true)
    setRexState('searching')
    const history = messages.map((m) => ({ role: m.role, text: m.text }))
    setMessages((m) => [...m, { role: 'user', text }])

    const result = await askRex({ message: text, history, pageContext })
    setRexState('writing')

    const pending = result.error
      ? { role: 'assistant', text: `Sorry — ${result.error}`, links: [] }
      : { role: 'assistant', text: result.text, links: result.links }

    if (pending) {
      setRexState('found')
      await wait(550) // let the jaw-drop play out on the working row before it becomes the real reply
      setMessages((m) => [...m, pending])
    }
    setRexState('idle')
    setBusy(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Open Rex, your Proxpex assistant"
        className={[
          'fixed z-40 w-16 h-16 rounded-2xl bg-surface border border-line shadow-card hover:shadow-glow flex items-center justify-center p-4',
          pos ? '' : 'bottom-6 right-6',
        ].join(' ')}
        style={
          pos
            ? {
                left: pos.left,
                top: pos.top,
                transitionProperty: roamEffective ? 'left, top, box-shadow' : 'box-shadow',
                transitionDuration: `${pos.duration}ms, ${pos.duration}ms, 150ms`,
                transitionTimingFunction: 'cubic-bezier(0.3, 0.85, 0.4, 1)',
              }
            : undefined
        }
      >
        <RexIcon variant="compact" state={open ? 'idle' : busy ? rexState : motion} still={!roamEffective} />
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-40 w-[22rem] max-h-[32rem] bg-surface border border-line rounded-card shadow-card flex flex-col overflow-hidden card-pop">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-line flex-shrink-0">
            <div className="w-8 h-8 flex-shrink-0 p-1">
              <RexIcon variant="compact" state="idle" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display text-sm font-semibold text-ink">Rex</div>
              <div className="text-[11px] text-slate-light">Proxpex assistant</div>
            </div>
            <button onClick={newConversation} title="New conversation" className="text-slate-light hover:text-ink">
              <RotateCcw className="w-4 h-4" strokeWidth={1.75} />
            </button>
            <button onClick={() => setOpen(false)} className="text-slate-light hover:text-ink">
              <X className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>

          <div ref={listRef} className="flex-1 min-h-[16rem] overflow-y-auto px-3 py-3 space-y-3">
            {messages.length === 0 && !busy && (
              <Message msg={{ role: 'assistant', text: "Hi, I'm Rex. Ask me to find something in Proxpex, or check on a project's status." }} onNavigate={onNavigate} />
            )}
            {messages.map((msg, i) => (
              <Message key={i} msg={msg} onNavigate={onNavigate} />
            ))}
            {busy && <RexWorking state={rexState} />}
          </div>

          <div className="border-t border-line p-3 flex-shrink-0">
            {atCap ? (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-light">This conversation has reached its limit.</span>
                <button
                  onClick={newConversation}
                  className="text-xs font-semibold text-signal hover:text-signal-dark flex-shrink-0"
                >
                  Start new conversation
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
                  placeholder="Ask Rex anything about Proxpex…"
                  disabled={busy}
                  className="flex-1 min-w-0 text-sm border border-line rounded-lg px-3 py-2 outline-none focus:border-signal bg-paper disabled:opacity-60"
                />
                <button
                  onClick={send}
                  disabled={busy || !input.trim()}
                  className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg bg-signal text-white disabled:opacity-40"
                >
                  <Send className="w-4 h-4" strokeWidth={2} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
