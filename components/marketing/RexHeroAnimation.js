'use client'

import { useEffect, useState } from 'react'
import RexIcon from '@/components/RexIcon'

const IDLE_MS = 3200
const FOUND_MS = 520

// The exact same RexIcon component the in-app assistant uses (RexWidget),
// not a redrawn/approximated version. Cycles idle -> a brief "found it"
// flash -> back to idle, reusing states that already exist and animate
// correctly. Deliberately never holds on "found" — that state's CSS
// animation only plays once and its open-jaw rect is tied to state
// staying 'found', so parking on it forever (as the old static /rex hero
// did) leaves Rex stuck looking wrong. Cycling avoids that entirely.
export default function RexHeroAnimation({ className = '' }) {
  const [state, setState] = useState('idle')

  useEffect(() => {
    let timer
    function cycle() {
      timer = setTimeout(() => {
        setState('found')
        timer = setTimeout(() => {
          setState('idle')
          cycle()
        }, FOUND_MS)
      }, IDLE_MS)
    }
    cycle()
    return () => clearTimeout(timer)
  }, [])

  return <RexIcon variant="detailed" state={state} className={className} />
}
