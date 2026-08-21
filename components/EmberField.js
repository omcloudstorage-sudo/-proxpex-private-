// Ambient background atmosphere, mounted once in the root layout so it runs
// behind every screen in the app. Pure CSS animation (see .ember-field /
// .ember in globals.css) — no canvas, no particle library, negligible cost.
// Particle values are a fixed deterministic pattern (not Math.random) so
// server and client render identically and nothing shifts on hydration.

function seeded(seed) {
  const x = Math.sin(seed * 9973.1) * 10000
  return x - Math.floor(x)
}

const EMBER_COUNT = 18

const EMBERS = Array.from({ length: EMBER_COUNT }, (_, i) => {
  const size = 4 + seeded(i + 1) * 6 // 4–10px
  const duration = 14 + seeded(i + 31) * 11 // 14–25s
  return {
    left: `${(seeded(i + 61) * 100).toFixed(1)}%`,
    size,
    duration,
    delay: -(seeded(i + 91) * duration).toFixed(1),
    opacity: (0.35 + seeded(i + 121) * 0.35).toFixed(2), // visible against both themes, still reads as atmosphere
    drift: `${(seeded(i + 151) * 30 - 15).toFixed(0)}px`,
  }
})

export default function EmberField() {
  return (
    <div className="ember-field" aria-hidden="true">
      {EMBERS.map((e, i) => (
        <span
          key={i}
          className="ember"
          style={{
            left: e.left,
            width: e.size,
            height: e.size,
            animationDuration: `${e.duration}s`,
            animationDelay: `${e.delay}s`,
            '--ember-opacity': e.opacity,
            '--ember-drift': e.drift,
          }}
        />
      ))}
    </div>
  )
}
