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

// cobe places a marker at 0.8 (sphere radius) + markerElevation (default
// 0.05) above the surface — mirrored here so the label-projection math
// below lands on the exact same point cobe itself draws the dot at.
const MARKER_RADIUS = 0.85

// Re-derivation of cobe's internal camera-projection math (the library
// doesn't expose it), so labels can track their marker's true current
// screen position every frame — mid-rotation, mid-drag, or settled —
// instead of assuming a fixed position. Returns fractions (0–1) of the
// canvas box, plus whether the point is on the near (visible) side.
function projectMarker(phi, theta, lat, lng) {
  const rlat = (lat * Math.PI) / 180
  const rlng = (lng * Math.PI) / 180 - Math.PI
  const cosRlat = Math.cos(rlat)
  const t0 = -cosRlat * Math.cos(rlng) * MARKER_RADIUS
  const t1 = Math.sin(rlat) * MARKER_RADIUS
  const t2 = cosRlat * Math.sin(rlng) * MARKER_RADIUS

  const cosPhi = Math.cos(phi)
  const sinPhi = Math.sin(phi)
  const cosTheta = Math.cos(theta)
  const sinTheta = Math.sin(theta)

  const c = cosPhi * t0 + sinPhi * t2
  const s = sinPhi * sinTheta * t0 + cosTheta * t1 - cosPhi * sinTheta * t2
  const depth = -sinPhi * cosTheta * t0 + sinTheta * t1 + cosPhi * cosTheta * t2

  return { x: (c + 1) / 2, y: (-s + 1) / 2, visible: depth >= 0 }
}

const THETA_LIMIT = 1.3 // radians — keeps drag from flipping the globe past its poles
const DRAG_ROTATE_SPEED = 1 / 200
const RESUME_DELAY_MS = 1200 // idle time after drag before auto-rotate/focus resumes

// Admin-dashboard-only widget: an auto-rotating dot globe (cobe — small,
// canvas-based, built for exactly this look) marking countries that have
// at least one client project. Deliberately dark-panelled regardless of
// site theme, echoing the reference "region map" style, with markers in
// the app's current brand-blue accent so an accent-color change (see
// ThemeContext) is picked up without touching this file.
//
// The `cobe` version pinned here (2.0.1) has no `onRender` animation-loop
// hook — that option only exists in cobe's README example for an older
// major version. Its `createGlobe` draws once per call to `update()` and
// otherwise sits still, so rotation (auto and drag-driven) is handled here
// with our own requestAnimationFrame loop.
//
// `focusedId` (a marker id) rotates the globe to face that marker and
// highlights it; pass null to resume free auto-rotation. `focusedLabel`
// (e.g. "Project name · 62%") renders as a prominent pointer/label pill
// that tracks that marker's actual projected screen position every frame.
// Every other marker gets a faint "ambient" label at all times, so the
// globe reads as "these are all our clients" at rest — hovering (or
// tapping, for touch) any one of them brings just that label to full
// opacity without changing the app's selection state.
export default function ClientGlobe({ markers, focusedId = null, focusedLabel = null }) {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const globeRef = useRef(null)
  const labelPosRef = useRef(null)
  const ambientElsRef = useRef({})
  const markersRef = useRef(markers)
  const rotationRef = useRef({ phi: 0, theta: 0.3, targetPhi: null, targetTheta: 0.3 })
  const focusedMarkerRef = useRef(null)
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, startPhi: 0, startTheta: 0, lastInteractionAt: 0 })
  const [ready, setReady] = useState(false)
  const [hoveredId, setHoveredId] = useState(null)

  markersRef.current = markers

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
    const drag = dragRef.current
    let raf = null
    let disposed = false

    function start(width) {
      if (disposed) return
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
      })
      setReady(true)

      const tick = () => {
        if (drag.dragging) {
          // rotation.phi/theta are being driven directly by the pointer handlers below
        } else if (drag.lastInteractionAt && Date.now() - drag.lastInteractionAt < RESUME_DELAY_MS) {
          // just stopped dragging — hold still for a beat before resuming
        } else if (rotation.targetPhi !== null) {
          rotation.phi += (rotation.targetPhi - rotation.phi) * 0.06
          rotation.theta += (rotation.targetTheta - rotation.theta) * 0.06
        } else if (!prefersReducedMotion) {
          rotation.phi += 0.0035
        }
        globeRef.current?.update({ phi: rotation.phi, theta: rotation.theta })

        const label = labelPosRef.current
        const fm = focusedMarkerRef.current
        if (label && fm) {
          const { x, y, visible } = projectMarker(rotation.phi, rotation.theta, fm.lat, fm.lng)
          label.style.left = `${x * 100}%`
          label.style.top = `${y * 100}%`
          label.style.opacity = visible ? '1' : '0'
        }

        for (const m of markersRef.current) {
          const el = ambientElsRef.current[m.id]
          if (!el) continue
          const { x, y, visible } = projectMarker(rotation.phi, rotation.theta, m.lat, m.lng)
          el.style.left = `${x * 100}%`
          el.style.top = `${y * 100}%`
          el.style.opacity = visible ? '' : '0'
          el.style.pointerEvents = visible ? 'auto' : 'none'
        }

        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }

    // Live-resize the existing globe instead of tearing it down — cobe's
    // update() accepts new width/height directly.
    const ro = new ResizeObserver(() => {
      const width = wrap.offsetWidth
      if (!width) return
      if (!globeRef.current) start(width)
      else globeRef.current.update({ width: width * 2, height: width * 2 })
    })
    ro.observe(wrap)

    // --- Drag-to-rotate (mouse + touch, via the unified Pointer Events API) ---
    function onPointerMove(e) {
      if (!drag.dragging) return
      const dx = e.clientX - drag.startX
      const dy = e.clientY - drag.startY
      rotation.phi = drag.startPhi + dx * DRAG_ROTATE_SPEED
      rotation.theta = Math.max(-THETA_LIMIT, Math.min(THETA_LIMIT, drag.startTheta - dy * DRAG_ROTATE_SPEED))
      drag.lastInteractionAt = Date.now()
    }
    function onPointerUp() {
      drag.dragging = false
      drag.lastInteractionAt = Date.now()
      canvas.style.cursor = 'grab'
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
    }
    function onPointerDown(e) {
      drag.dragging = true
      drag.startX = e.clientX
      drag.startY = e.clientY
      drag.startPhi = rotation.phi
      drag.startTheta = rotation.theta
      drag.lastInteractionAt = Date.now()
      canvas.style.cursor = 'grabbing'
      window.addEventListener('pointermove', onPointerMove)
      window.addEventListener('pointerup', onPointerUp)
      window.addEventListener('pointercancel', onPointerUp)
    }
    wrap.addEventListener('pointerdown', onPointerDown)

    return () => {
      disposed = true
      if (raf) cancelAnimationFrame(raf)
      ro.disconnect()
      wrap.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
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
  // recreating it. A fresh focus selection always takes effect immediately,
  // even if the user was just dragging (rather than waiting out the resume
  // delay), since it's a deliberate new instruction.
  useEffect(() => {
    const focusEntry = focusedId ? markers.find((m) => m.id === focusedId) : null
    if (focusEntry) {
      const [p, t] = locationToAngles(focusEntry.lat, focusEntry.lng)
      rotationRef.current.targetPhi = p
      rotationRef.current.targetTheta = t
      focusedMarkerRef.current = { lat: focusEntry.lat, lng: focusEntry.lng }
      dragRef.current.lastInteractionAt = 0
    } else {
      rotationRef.current.targetPhi = null
      focusedMarkerRef.current = null
    }
    globeRef.current?.update({ markers: globeMarkers })
  }, [globeMarkers, focusedId, markers])

  return (
    <div
      ref={wrapRef}
      className="relative w-full max-w-[520px] aspect-square mx-auto touch-none select-none"
      style={{ opacity: ready ? 1 : 0, transition: 'opacity 400ms ease-out' }}
    >
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />

      {markers
        .filter((m) => m.id !== focusedId)
        .map((m) => (
          <div
            key={m.id}
            ref={(el) => {
              if (el) ambientElsRef.current[m.id] = el
              else delete ambientElsRef.current[m.id]
            }}
            onMouseEnter={() => setHoveredId(m.id)}
            onMouseLeave={() => setHoveredId((cur) => (cur === m.id ? null : cur))}
            onClick={() => setHoveredId((cur) => (cur === m.id ? null : m.id))}
            className="absolute z-[5] cursor-pointer"
            style={{ transform: 'translate(-50%, calc(-100% - 6px))' }}
          >
            <div
              className={[
                'bg-white/90 text-[rgb(12,19,36)] text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap transition-opacity duration-200',
                hoveredId === m.id ? 'opacity-100' : 'opacity-35',
              ].join(' ')}
            >
              {m.name}
            </div>
          </div>
        ))}

      {focusedId && focusedLabel && (
        <div
          ref={labelPosRef}
          className="pointer-events-none absolute z-10"
          style={{ transform: 'translate(-50%, calc(-100% - 10px))' }}
        >
          <div key={focusedId + focusedLabel} className="card-pop flex flex-col items-center">
            <div className="bg-white text-[rgb(12,19,36)] text-xs font-semibold px-2.5 py-1 rounded-full shadow-lg whitespace-nowrap max-w-[220px] truncate">
              {focusedLabel}
            </div>
            <svg width="12" height="7" viewBox="0 0 12 7" className="flex-shrink-0 -mt-px drop-shadow-sm">
              <path d="M0 0 H12 L6 7 Z" fill="white" />
            </svg>
          </div>
        </div>
      )}
    </div>
  )
}
