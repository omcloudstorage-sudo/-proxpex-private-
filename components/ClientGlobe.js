'use client'

import { useEffect, useMemo, useRef } from 'react'
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

// Admin-dashboard-only widget: an auto-rotating dot globe (cobe — small,
// canvas-based, built for exactly this look) marking countries that have
// at least one client project. Deliberately dark-panelled regardless of
// site theme, echoing the reference "region map" style, with markers in
// the app's current brand-blue accent so an accent-color change (see
// ThemeContext) is picked up without touching this file.
export default function ClientGlobe({ markers }) {
  const canvasRef = useRef(null)

  const globeMarkers = useMemo(
    () => markers.map((m) => ({ location: [m.lat, m.lng], size: 0.06 })),
    [markers]
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const signal = readColorVar('--color-signal', [0.114, 0.306, 0.847])

    let phi = 0
    let width = canvas.offsetWidth

    const onResize = () => {
      if (canvas) width = canvas.offsetWidth
    }
    window.addEventListener('resize', onResize)

    const globe = createGlobe(canvas, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: 0,
      theta: 0.3,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.2, 0.23, 0.29],
      markerColor: signal,
      glowColor: signal,
      markers: globeMarkers,
      onRender: (state) => {
        if (!prefersReducedMotion) phi += 0.0045
        state.phi = phi
        state.width = width * 2
        state.height = width * 2
      },
    })

    return () => {
      globe.destroy()
      window.removeEventListener('resize', onResize)
    }
  }, [globeMarkers])

  return (
    <div className="bg-[rgb(12,19,36)] border border-line rounded-card shadow-card p-6 mb-10 flex flex-col sm:flex-row gap-6 items-center">
      <div className="relative w-[180px] h-[180px] flex-shrink-0 mx-auto sm:mx-0">
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />
      </div>
      <div className="flex-1 min-w-0 w-full">
        <div className="text-xs font-medium text-slate-light uppercase tracking-wide mb-3">Client locations</div>
        {markers.length === 0 ? (
          <p className="text-sm text-slate-light">No client countries recorded yet — set a country on a project to see it here.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5">
            {markers.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 text-sm text-slate-light">
                <span className="truncate">{m.name}</span>
                <span className="text-white font-medium flex-shrink-0">{m.count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
