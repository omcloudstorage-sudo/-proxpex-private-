'use client'

// Rex — Proxpex's pixel-art AI assistant mascot (a small T-Rex, named for
// the Rx logo). Drawn entirely as SVG rects, no image assets, filled with
// rgb(var(--color-signal)) — the same brand-accent token every other
// button/highlight in the app uses — so Rex tracks accent + light/dark
// theme automatically with zero extra wiring.
//
// Two variants, not one shape scaled two ways: at small sizes (the
// floating launcher button, the chat panel header) fine detail just reads
// as muddy noise, so `variant="compact"` is a bolder, fewer-piece
// silhouette on integer grid coordinates (crisp at small integer pixel
// scales). `variant="detailed"` — held props, thinner limbs — is for
// where there's actual room to read it, e.g. the chat panel's empty state.
//
// States map to real agent activity (see RexWidget): idle = at rest,
// searching = a tool call is actually running, writing = Gemini's answer
// is being generated, found = a result just landed (brief, two-frame).
// Every state gets its own whole-body motion (see globals.css) — a side-
// to-side scanning tilt for searching, a quick focused bob for writing —
// shared by both variants; only the held-prop detail (magnifying glass /
// pencil) is detailed-only, layered on top of that same body motion.

const FILL = 'rgb(var(--color-signal))'

function DetailedBody() {
  // 18x16 grid — deliberately close to the Chrome offline-dino silhouette
  // (blocky T-Rex, tail low-left, head raised top-right, one small arm,
  // one leg stepping forward) since that's the reference this should read
  // as at a glance.
  return (
    <>
      <rect x="0" y="11" width="2" height="1" />
      <rect x="1" y="10" width="2" height="2" />
      <rect x="3" y="7" width="6" height="5" />
      <rect x="4" y="12" width="2" height="3" />
      <rect x="3.3" y="14.6" width="2.7" height="0.8" />
      <rect x="7" y="12" width="2" height="2" />
      <rect x="8" y="13.6" width="2.6" height="1" />
      <rect x="8.5" y="8" width="1.5" height="1" />
      <rect x="9" y="5" width="3" height="3" />
      <rect x="11" y="2" width="4" height="4" />
      <rect x="11" y="6" width="4" height="1" />
    </>
  )
}

const DETAILED_EYE = { x: 13.3, y: 3, w: 1, h: 1 }

function MagnifyingGlass() {
  return (
    <g className="rex-prop rex-prop-sway" fill={FILL} opacity="0.85">
      <rect x="14.5" y="8" width="3" height="3" fill="none" stroke={FILL} strokeWidth="0.9" />
      <rect x="17" y="10.6" width="1.6" height="1" transform="rotate(40 17 10.6)" />
    </g>
  )
}

function Pencil() {
  return (
    <g className="rex-prop rex-prop-write">
      <rect x="13.2" y="6.3" width="4.5" height="1.3" transform="rotate(-32 13.2 6.3)" fill={FILL} />
      <rect x="12.2" y="8.4" width="1" height="1" fill="var(--color-amber)" className="rex-scribble" />
      <rect x="13.5" y="8.9" width="0.8" height="0.8" fill="var(--color-amber)" className="rex-scribble rex-scribble-delay" />
    </g>
  )
}

function DetailedSvg({ state }) {
  const jawOpen = state === 'found'
  return (
    <svg
      viewBox="0 0 18 16"
      width="100%"
      height="100%"
      shapeRendering="crispEdges"
      style={{ imageRendering: 'pixelated', overflow: 'visible' }}
    >
      <g fill={FILL}>
        <DetailedBody />
        {jawOpen && <rect x="11" y="7" width="4" height="1.4" />}
      </g>
      <rect className="rex-eye" x={DETAILED_EYE.x} y={DETAILED_EYE.y} width={DETAILED_EYE.w} height={DETAILED_EYE.h} fill="rgb(var(--color-paper))" />
      {state === 'searching' && <MagnifyingGlass />}
      {state === 'writing' && <Pencil />}
    </svg>
  )
}

// Bold, few-piece silhouette on whole-number grid coordinates only — no
// thin slivers, no sub-unit fractions — so it stays crisp once scaled down
// to a ~24-32px on-screen box. Never carries the held props; at this size
// they'd just be noise.
function CompactBody() {
  return (
    <>
      <rect x="0" y="9" width="3" height="2" />
      <rect x="3" y="6" width="6" height="5" />
      <rect x="4" y="11" width="2" height="3" />
      <rect x="7" y="11" width="3" height="2" />
      <rect x="9" y="2" width="6" height="6" />
    </>
  )
}

const COMPACT_EYE = { x: 12, y: 3, w: 2, h: 2 }

function CompactSvg({ state }) {
  const jawOpen = state === 'found'
  return (
    <svg
      viewBox="0 0 16 15"
      width="100%"
      height="100%"
      shapeRendering="crispEdges"
      style={{ imageRendering: 'pixelated', overflow: 'visible' }}
    >
      <g fill={FILL}>
        <CompactBody />
        {jawOpen && <rect x="10" y="8" width="4" height="1" />}
      </g>
      <rect className="rex-eye" x={COMPACT_EYE.x} y={COMPACT_EYE.y} width={COMPACT_EYE.w} height={COMPACT_EYE.h} fill="rgb(var(--color-paper))" />
    </svg>
  )
}

export default function RexIcon({ state = 'idle', variant = 'compact', className = '' }) {
  return (
    <div className={`rex-icon rex-icon-${state} rex-icon-${variant} ${className}`}>
      {variant === 'detailed' ? <DetailedSvg state={state} /> : <CompactSvg state={state} />}
    </div>
  )
}
