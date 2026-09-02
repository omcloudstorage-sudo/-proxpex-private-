'use client'

import { useEffect, useRef } from 'react'
import { useScroll, useMotionValue, useTransform, useSpring, useReducedMotion, motion } from 'framer-motion'

// Replaces the old standalone intro splash: the hero's "planet horizon"
// arc (a big circle whose top rim shows low in the first screen) is now
// itself the transition. Scrolling one viewport height down continuously
// morphs it — travelling upward, shrinking, crossfading — into a small
// glow that then follows the cursor for the rest of the page. It's driven
// directly by scroll position (a spring-smoothed 0-1 progress value), so
// it's inherently reversible: scroll back to the top and it grows back
// into the arc. Rendered fixed at the HomePage root (not nested inside
// any transformed/filtered ancestor, which would break position:fixed).
const COLLAPSE_DISTANCE_VH = 1 // scroll one full viewport height to fully collapse
const BIG_RADIUS = 750 // half of the arc's 1500px diameter

export default function ScrollHorizon() {
  const reduceMotion = useReducedMotion()
  const { scrollY } = useScroll()
  const anchorRef = useRef({ x: 700, y: 650 })

  const mouseX = useMotionValue(700)
  const mouseY = useMotionValue(500)

  useEffect(() => {
    function setAnchor() {
      anchorRef.current = { x: window.innerWidth / 2, y: window.innerHeight * 0.72 }
    }
    setAnchor()
    mouseX.set(window.innerWidth / 2)
    mouseY.set(window.innerHeight / 2)

    function onResize() {
      setAnchor()
    }
    function onMove(e) {
      mouseX.set(e.clientX)
      mouseY.set(e.clientY)
    }
    window.addEventListener('resize', onResize)
    if (!reduceMotion) window.addEventListener('mousemove', onMove, { passive: true })
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('mousemove', onMove)
    }
  }, [mouseX, mouseY, reduceMotion])

  const rawProgress = useTransform(scrollY, (v) => {
    const h = window.innerHeight * COLLAPSE_DISTANCE_VH
    return Math.min(1, Math.max(0, v / h))
  })
  const progress = useSpring(rawProgress, { stiffness: 120, damping: 26, mass: 0.4 })

  const arcX = useTransform([progress, mouseX], ([p, mx]) => anchorRef.current.x + (mx - anchorRef.current.x) * p)
  const arcY = useTransform([progress, mouseY], ([p, my]) => {
    const startY = anchorRef.current.y + BIG_RADIUS
    return startY + (my - startY) * p
  })
  const arcScale = useTransform(progress, [0, 1], [1, 0.02])
  const arcOpacity = useTransform(progress, [0, 0.65, 1], [1, 0.35, 0])

  const dotOpacity = useTransform(progress, [0.45, 1], [0, 1])
  const dotScale = useTransform(progress, [0.45, 1], [0.4, 1])

  if (reduceMotion) {
    // Static fallback — same resting look as the animated version at
    // progress 0, no scroll-linking or cursor tracking.
    return (
      <div className="scroll-horizon-stage" aria-hidden="true" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 5, overflow: 'hidden' }}>
        <div
          className="arc-shape-static"
          style={{
            position: 'absolute',
            left: '50%',
            top: '72%',
            width: 1500,
            height: 1500,
            marginLeft: -BIG_RADIUS,
            marginTop: -BIG_RADIUS,
            borderRadius: '50%',
            borderTop: '1.5px solid rgb(var(--color-signal) / 0.35)',
            boxShadow: '0 0 60px 6px rgb(var(--color-signal) / 0.18), 0 0 140px 26px rgb(var(--color-signal) / 0.1)',
          }}
        />
      </div>
    )
  }

  // styled-jsx only auto-scopes plain intrinsic elements (div, span, ...)
  // — it does not attach its generated class to custom components like
  // motion.div, so the arc/dot's shape styling has to be inline here
  // rather than in a `<style jsx>` block (that silently produced
  // unstyled, zero-height divs).
  return (
    <div
      className="scroll-horizon-stage"
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 5, overflow: 'hidden' }}
    >
      <motion.div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: BIG_RADIUS * 2,
          height: BIG_RADIUS * 2,
          marginLeft: -BIG_RADIUS,
          marginTop: -BIG_RADIUS,
          borderRadius: '50%',
          borderTop: '1.5px solid rgb(var(--color-signal) / 0.35)',
          boxShadow: '0 0 60px 6px rgb(var(--color-signal) / 0.18), 0 0 140px 26px rgb(var(--color-signal) / 0.1)',
          willChange: 'transform, opacity',
          x: arcX,
          y: arcY,
          scale: arcScale,
          opacity: arcOpacity,
        }}
      />
      <motion.div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 220,
          height: 220,
          marginLeft: -110,
          marginTop: -110,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgb(var(--color-signal) / 0.35) 0%, rgb(var(--color-signal) / 0) 70%)',
          filter: 'blur(6px)',
          willChange: 'transform, opacity',
          x: mouseX,
          y: mouseY,
          scale: dotScale,
          opacity: dotOpacity,
        }}
      />
    </div>
  )
}
