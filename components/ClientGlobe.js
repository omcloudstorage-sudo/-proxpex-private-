'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import createGlobe from 'cobe'

// Reads a "r g b" CSS custom property (as used throughout globals.css) and
// returns it as a [0-1, 0-1, 0-1] triple for cobe, which wants fractional
// RGB rather than 0-255. Falls back to the brand blue if the var is unset
// (e.g. during SSR) so the globe never renders with garbage color.
function readColorVar(name, fallback) {
  if (typeof window === 'undefined') return fallback
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  const parts = raw.split(/\s+/).map(Number)
  if (parts.length !== 3 || parts.some(Number.isNaN)) return fallback
  return parts.map((v) => v / 255)
}

// cobe's own "focus" recipe: converts a lat/lng into the [phi, theta]
// rotation that puts that point facing the camera.
function locationToAngles(lat, lng) {
  return [Math.PI - ((lng * Math.PI) / 180 - Math.PI / 2), (lat * Math.PI) / 180]
}

// Admin-dashboard-only widget: an auto-rotating dot globe (cobe — small,
// canvas-based, built for exactly this look) marking countries that have
// at least one client project. Deliberately dark-panelled regardless of
// site theme, echoing the reference "region map" style, with markers in
// the app's current brand-blue accent so an accent-color change (see
// ThemeContext) is picked up without touching this file.
//
// `focusedId` (a marker id) rotates the globe to face that marker and
// highlights it; pass null to resume free auto-rotation.
export default function ClientGlobe({ markers, focusedId = null }) {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const globeRef = useRef(null)
  const rotationRef = useRef({ phi: 0, theta: 0.3, targetPhi: null, targetTheta: 0.3 })
  const [ready, setReady] = useState(false)

  const globeMarkers = useMemo(
    () =>
      markers.map((m) => ({
        location: [m.lat, m.lng],
        size: m.id === focusedId ? 0.11 : 0.055,
      })),
    [markers, focusedId]
  )

  // Create the globe once and keep it alive across marker/focus changes —
  // recreating it on every selection would snap rotation back to zero
  // instead of animating smoothly to the newly focused marker.
  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const signal = readColorVar('--color-signal', [0.114, 0.306, 0.847])
    const rotation = rotationRef.current
    let width = 0

    function createOrResize() {
      width = wrap.offsetWidth
      if (!width) return
      if (globeRef.current) globeRef.current.destroy()
      globeRef.current = createGlobe(canvas, {
        devicePixelRatio: 2,
        width: width * 2,
        height: width * 2,
        phi: rotation.phi,
        theta: rotation.theta,
        dark: 1,
        diffuse: 1.2,
        mapSamples: 18000,
        mapBrightness: 7,
        baseColor: [0.25, 0.29, 0.36],
        markerColor: signal,
        glowColor: signal,
        markers: globeMarkers,
        onRender: (state) => {
          if (rotation.targetPhi !== null) {
            rotation.phi += (rotation.targetPhi - rotation.phi) * 0.06
            rotation.theta += (rotation.targetTheta - rotation.theta) * 0.06
          } else if (!prefersReducedMotion) {
            rotation.phi += 0.0035
          }
          state.phi = rotation.phi
          state.theta = rotation.theta
          state.width = width * 2
          state.height = width * 2
        },
      })
      setReady(true)
    }

    const ro = new ResizeObserver(() => createOrResize())
    ro.observe(wrap)

    return () => {
      ro.disconnect()
      if (globeRef.current) {
        globeRef.current.destroy()
        globeRef.current = null
      }
    }
    // Intentionally created once — marker/focus updates below patch the
    // live globe instead of tearing it down.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Push marker and focus-target updates into the live globe without
  // recreating it.
  useEffect(() => {
    const focusEntry = focusedId ? markers.find((m) => m.id === focusedId) : null
    if (focusEntry) {
      const [p, t] = locationToAngles(focusEntry.lat, focusEntry.lng)
      rotationRef.current.targetPhi = p
      rotationRef.current.targetTheta = t
    } else {
      rotationRef.current.targetPhi = null
    }
    globeRef.current?.update({ markers: globeMarkers })
  }, [globeMarkers, focusedId, markers])

  return (
    <div
      ref={wrapRef}
      className="relative w-full max-w-[520px] aspect-square mx-auto"
      style={{ opacity: ready ? 1 : 0, transition: 'opacity 400ms ease-out' }}
    >
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />
    </div>
  )
}
