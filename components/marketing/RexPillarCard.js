'use client'

import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Sparkles, ArrowRight } from 'lucide-react'
import RexIcon from '@/components/RexIcon'
import TiltCard from '@/components/marketing/TiltCard'

// A short scripted conversation, revealed one exchange at a time by
// clicking through — not auto-played — so it reads as something the
// visitor is driving, not a video.
const CHAT_TURNS = [
  {
    question: 'What’s overdue on Aurora Retail?',
    answer:
      'Two things: the payment provider keys (due Tue) and the homepage copy review (due yesterday). Everything else on Requirement Gathering is signed off.',
  },
  {
    question: 'Who signed off on the last stage?',
    answer: 'Priya Nair approved Requirement Gathering on Aug 14 — the sign-off is locked in the permanent record.',
  },
  {
    question: 'Is there a contract on file for this client?',
    answer: 'Yes — the signed SOW is attached under Kickoff, uploaded Aug 4.',
  },
]

const TYPING_MS = 900

// Same peek mechanic as the old nav-tab Rex: hidden in a clipped window
// until the card is hovered, then springs up to peek over the top edge —
// applied here via variant propagation from a hover-tracking wrapper,
// rather than the always-visible bob the card used before.
const REX_PEEK_VARIANTS = {
  rest: { y: '100%' },
  hover: { y: '0%' },
}
const PEEK_SPRING = { type: 'spring', stiffness: 340, damping: 16, mass: 0.7 }

// Fixed, hand-placed positions rather than random — keeps the drifting
// pixel dust identical between server and client renders.
const PIXELS = [
  { top: '10%', left: '8%', size: 6, delay: 0 },
  { top: '22%', left: '86%', size: 5, delay: 0.4 },
  { top: '68%', left: '14%', size: 4, delay: 0.9 },
  { top: '78%', left: '90%', size: 6, delay: 1.3 },
  { top: '40%', left: '92%', size: 4, delay: 1.7 },
  { top: '85%', left: '48%', size: 5, delay: 2.1 },
]

export default function RexPillarCard({ tint }) {
  const [open, setOpen] = useState(false)
  const [completed, setCompleted] = useState(0)
  const [typing, setTyping] = useState(false)
  const reduceMotion = useReducedMotion()

  function startTurn(index) {
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      setCompleted(index + 1)
    }, TYPING_MS)
  }

  function handleOpen() {
    setOpen(true)
    setCompleted(0)
    startTurn(0)
  }

  function handleClose() {
    setOpen(false)
    setCompleted(0)
    setTyping(false)
  }

  function handleNext() {
    startTurn(completed)
  }

  const hasMore = completed < CHAT_TURNS.length

  return (
    <TiltCard>
      <motion.div initial="rest" whileHover="hover" animate="rest" className="relative h-full">
        {/* Rex, hidden behind the card until hover: a sibling painted
            BEFORE the card (not nested inside it, and with no z-index of
            its own) so the card's opaque background covers his lower half
            once he's revealed — the same "peeking from behind" illusion
            as the old nav-tab treatment, just with a card instead of a
            tab sitting in front of him. */}
        <div
          className="absolute left-8 md:left-10 -top-8 md:-top-10 w-16 h-16 md:w-20 md:h-20 pointer-events-none"
          aria-hidden="true"
        >
          <motion.div
            variants={REX_PEEK_VARIANTS}
            transition={reduceMotion ? { duration: 0 } : PEEK_SPRING}
            className="w-full h-full"
          >
            <RexIcon variant="compact" state="idle" className="w-full h-full drop-shadow-lg" />
          </motion.div>
        </div>

        <div className={`relative h-full ${tint.bg} rounded-card p-8 md:p-10 pt-16 md:pt-20 overflow-hidden`}>
          {!reduceMotion &&
            PIXELS.map((p, i) => (
              <span
                key={i}
                className="rex-pixel"
                style={{ top: p.top, left: p.left, width: p.size, height: p.size, animationDelay: `${p.delay}s` }}
              />
            ))}

          <div className="absolute top-6 right-6 md:top-7 md:right-7 w-10 h-10 md:w-11 md:h-11 rounded-full bg-surface text-amber flex items-center justify-center shadow-card">
            <Sparkles className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2} />
          </div>

          <div className="relative z-10">
            <h3 className="font-display text-xl md:text-2xl font-bold text-ink tracking-tight mb-2.5">Rex, always on hand.</h3>
            <p className="text-sm md:text-base text-slate leading-relaxed max-w-xl">
              An assistant that already knows your projects &mdash; ask him to find a document or check what&rsquo;s
              overdue, instead of hunting for it yourself.
            </p>

            {!open ? (
              <button
                type="button"
                onClick={handleOpen}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-signal mt-4"
              >
                Try asking Rex <Sparkles className="w-3.5 h-3.5" strokeWidth={2.5} />
              </button>
            ) : (
              <button type="button" onClick={handleClose} className="inline-flex items-center gap-1.5 text-sm font-semibold text-signal mt-4">
                Close <Sparkles className="w-3.5 h-3.5" strokeWidth={2.5} />
              </button>
            )}

            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="mt-5 pt-5 border-t border-ink/10 space-y-3">
                    {CHAT_TURNS.slice(0, completed).map((turn) => (
                      <div key={turn.question} className="space-y-3">
                        <div className="flex justify-end">
                          <span className="bg-surface text-ink text-sm rounded-2xl rounded-br-sm px-4 py-2 shadow-card max-w-[85%]">
                            {turn.question}
                          </span>
                        </div>
                        <div className="flex items-end gap-2">
                          <div className="w-6 h-6 flex-shrink-0">
                            <RexIcon variant="compact" state="idle" className="w-full h-full" />
                          </div>
                          <span className="bg-ink/5 text-ink text-sm rounded-2xl rounded-bl-sm px-4 py-2.5 max-w-[85%]">
                            {turn.answer}
                          </span>
                        </div>
                      </div>
                    ))}

                    {typing && (
                      <div className="space-y-3">
                        <div className="flex justify-end">
                          <span className="bg-surface text-ink text-sm rounded-2xl rounded-br-sm px-4 py-2 shadow-card max-w-[85%]">
                            {CHAT_TURNS[completed].question}
                          </span>
                        </div>
                        <div className="flex items-end gap-2">
                          <div className="w-6 h-6 flex-shrink-0">
                            <RexIcon variant="compact" state="searching" className="w-full h-full" />
                          </div>
                          <span className="bg-ink/5 text-slate text-sm rounded-2xl rounded-bl-sm px-4 py-2.5 flex gap-1 items-center">
                            <span className="rex-typing-dot" />
                            <span className="rex-typing-dot" style={{ animationDelay: '0.15s' }} />
                            <span className="rex-typing-dot" style={{ animationDelay: '0.3s' }} />
                          </span>
                        </div>
                      </div>
                    )}

                    {!typing && hasMore && (
                      <button
                        type="button"
                        onClick={handleNext}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-signal pt-1"
                      >
                        Ask Rex something else <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      <style jsx>{`
        .rex-pixel {
          position: absolute;
          background: rgb(var(--color-signal));
          opacity: 0.2;
          border-radius: 1px;
          animation: rex-pixel-float 3.6s ease-in-out infinite;
        }
        @keyframes rex-pixel-float {
          0%, 100% { transform: translateY(0); opacity: 0.18; }
          50% { transform: translateY(-8px); opacity: 0.5; }
        }
        .rex-typing-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: rgb(var(--color-slate-light));
          animation: rex-typing-bounce 1s ease-in-out infinite;
        }
        @keyframes rex-typing-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-3px); opacity: 1; }
        }
      `}</style>
    </TiltCard>
  )
}
