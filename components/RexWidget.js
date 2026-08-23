'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname, useParams } from 'next/navigation'
import { X, Send, RotateCcw, Lock, ArrowUpRight } from 'lucide-react'
import { auth } from '@/lib/firebase'
import RexIcon from '@/components/RexIcon'
import { useRexPreferences } from '@/contexts/RexPreferencesContext'

const MAX_MESSAGES = 25

// "Peek" sequence, triggered once per real route change (not free-roaming
// — Rex lives permanently in the bottom-right corner). Three short phases
// chained by plain timers: slide partway into view, run-in-place + a jump
// while sliding the rest of the way in, then settle to idle. Kept quick —
// under a second of actual motion — so it reads as a glance, not a show.
const RUN_MS = 300
const JUMP_MS = 380
const RUN_AFTER_MS = 270
const PEEK_SLIDE_MS = RUN_MS + JUMP_MS + RUN_AFTER_MS

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

  // Peek sequence state: `motion` drives the icon (idle/running/jumping),
  // `peeking` adds the slide-in-from-the-corner class. `peekKey` is bumped
  // on every trigger and used as a React key on the sliding element so the
  // CSS animation restarts cleanly even if the previous peek hadn't
  // finished yet (a fresh key forces a remount instead of reusing a
  // still-running animation).
  const [motion, setMotion] = useState('idle')
  const [peeking, setPeeking] = useState(false)
  const [peekKey, setPeekKey] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(false)
  const timersRef = useRef([])
  const prevPathnameRef = useRef(pathname)

  const peekEffective = roamEnabled && !reducedMotion

  function clearTimers() {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }
  function after(ms, fn) {
    timersRef.current.push(setTimeout(fn, ms))
  }

  // Track the OS-level reduced-motion preference live (it can change
  // without a reload).
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const onMq = (e) => setReducedMotion(e.matches)
    mq.addEventListener('change', onMq)
    return () => {
      mq.removeEventListener('change', onMq)
      clearTimers()
    }
  }, [])

  function playPeek() {
    clearTimers()
    setPeekKey((k) => k + 1)
    setPeeking(true)
    setMotion('running')
    after(RUN_MS, () => setMotion('jumping'))
    after(RUN_MS + JUMP_MS, () => setMotion('running'))
    after(PEEK_SLIDE_MS, () => {
      setMotion('idle')
      setPeeking(false)
    })
  }

  // Fires once per actual route change — not on mount, not on every
  // render. Skipped entirely while the chat is open or roaming is off.
  useEffect(() => {
    if (prevPathnameRef.current === pathname) return
    prevPathnameRef.current = pathname
    if (!peekEffective || open) return
    playPeek()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // Toggling roaming off (Settings, or reduced-motion kicking in
  // mid-session) cancels any peek in progress.
  useEffect(() => {
    if (!peekEffective) {
      clearTimers()
      setMotion('idle')
      setPeeking(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peekEffective])

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
      {/* Fixed in the corner, permanently — no free-roaming. The outer box
          is pointer-events: none and fully transparent (no card/background
          behind Rex); only the tight inner button, matching the sprite
          itself, is clickable. */}
      <div className="fixed bottom-6 right-6 z-40 w-11 h-11 pointer-events-none overflow-visible">
        <div
          key={peekKey}
          className={peeking ? 'rex-peek' : ''}
          style={peeking ? { animationDuration: `${PEEK_SLIDE_MS}ms` } : undefined}
        >
          <button
            data-rex-launcher
            onClick={() => setOpen((o) => !o)}
            aria-label="Open Rex, your Proxpex assistant"
            className="pointer-events-auto w-11 h-11 flex items-center justify-center"
          >
            <RexIcon variant="compact" state={open ? 'idle' : busy ? rexState : motion} still={!peekEffective} />
          </button>
        </div>
      </div>

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
