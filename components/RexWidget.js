'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Send, RotateCcw, Lock, ArrowUpRight } from 'lucide-react'
import { auth } from '@/lib/firebase'
import RexIcon from '@/components/RexIcon'

const MAX_MESSAGES = 25

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function streamChat({ message, history, onEvent }) {
  const idToken = await auth.currentUser.getIdToken()
  const res = await fetch('/api/rex/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ message, history }),
  })

  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}))
    onEvent({ type: 'error', message: data.error || 'Something went wrong.' })
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const chunks = buffer.split('\n\n')
    buffer = chunks.pop()
    for (const chunk of chunks) {
      if (!chunk.startsWith('data: ')) continue
      try {
        onEvent(JSON.parse(chunk.slice(6)))
      } catch {
        // ignore malformed chunk
      }
    }
  }
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
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [rexState, setRexState] = useState('idle')
  const [busy, setBusy] = useState(false)
  const listRef = useRef(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, busy, open])

  const atCap = messages.length >= MAX_MESSAGES

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

    let pending = null
    await streamChat({
      message: text,
      history,
      onEvent: (evt) => {
        if (evt.type === 'phase') {
          setRexState(evt.phase)
        } else if (evt.type === 'result') {
          pending = { role: 'assistant', text: evt.text, links: evt.links }
        } else if (evt.type === 'error') {
          pending = { role: 'assistant', text: `Sorry — ${evt.message}`, links: [] }
        }
      },
    })

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
        className="fixed bottom-6 right-6 z-40 w-16 h-16 rounded-2xl bg-surface border border-line shadow-card hover:shadow-glow flex items-center justify-center p-4 transition-shadow"
      >
        <RexIcon variant="compact" state={open ? 'idle' : busy ? rexState : 'idle'} />
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
