import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion'
import { Captions, ReelAudio, Scene, Sfx, buildTimeline, useCue, type Manifest } from './audio'
import manifest from './audio/session.json'
import { AppBox, CLAMP, EASE_OUT, GlowDefs, Laptop, Packet, Svg, Tag, lerp, prog, rgba, springAt, useNthCue } from './kit-databases'
import { C, Stage, mono, sans, serif } from './primitives'
import script from './scripts/session.json'

export type SessionReelProps = { prompt: string; repo: string; concepts: string[] }

const T = buildTimeline(script, manifest as unknown as Manifest)
export const SESSION_REEL_FRAMES = T.total

const DEFAULT_CONCEPTS = ['Sliding window rate limiting', 'Keying limits by IP and user', 'Returning 429 with Retry-After']
// One accent per idea, used consistently across the reel. Red = blocked, green = allowed / safe.
const ACCENT = [C.blue, C.purple, C.teal]

function Badge({ n, color, size = 64 }: { n: number; color: string; size?: number }) {
  return (
    <span style={{ width: size, height: size, borderRadius: size / 2, border: `4px solid ${color}`, color, display: 'inline-grid', placeItems: 'center', fontFamily: sans, fontWeight: 700, fontSize: size * 0.48, flexShrink: 0, boxShadow: `0 0 30px ${rgba(color, 0.35)}` }}>
      {n}
    </span>
  )
}

/** Numbered concept header used by each idea scene. */
function Header({ n, text, color }: { n: number; text: string; color: string }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const p = springAt(frame, 2, fps, 15)
  const w = prog(frame, 4, 28, EASE_OUT) * 100
  return (
    <div style={{ position: 'absolute', top: 160, left: 70, right: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 26 }}>
      <div style={{ transform: `scale(${p})` }}>
        <Badge n={n} color={color} />
      </div>
      <div style={{ clipPath: `inset(-30% ${100 - w}% -30% 0)`, fontFamily: serif, fontStyle: 'italic', fontSize: text.length > 30 ? 54 : 62, lineHeight: 1.1, color: C.white, letterSpacing: -0.5, maxWidth: 820, textWrap: 'balance' }}>
        {text}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------------------------
// Intro: the user's prompt, then the three ideas
function Intro({ prompt, repo, concepts }: SessionReelProps) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const did = useCue('did', 42)
  const three = useCue('three', 75)
  const clean = (prompt || 'Add rate limiting to /login').trim().replace(/\s+/g, ' ')
  const text = clean.length > 140 ? clean.slice(0, 137).trimEnd() + '…' : clean
  const size = text.length <= 22 ? 66 : text.length <= 44 ? 54 : text.length <= 90 ? 46 : 40
  const speed = Math.max(1, text.length / 38)
  const typed = Math.max(0, Math.floor((frame - 6) * speed))
  const card = springAt(frame, 0, fps, 16)
  const claude = prog(frame, did + 30, did + 44)
  return (
    <>
      <div style={{ position: 'absolute', top: 160, left: 70, width: 820, textAlign: 'center', fontFamily: sans, fontSize: 30, color: C.grey, opacity: prog(frame, 0, 10) }}>
        <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: 7, background: C.green, marginRight: 12, boxShadow: `0 0 14px ${C.green}`, transform: 'translateY(-2px)' }} />
        your session in <span style={{ color: C.white, fontFamily: mono }}>{repo || 'your repo'}</span> · just now
      </div>
      <div style={{ position: 'absolute', top: 236, left: 70, width: 820, boxSizing: 'border-box', opacity: card, transform: `translateY(${(1 - card) * 30}px)`, border: `2px solid ${C.dim}`, borderRadius: 30, background: '#070B10', padding: '30px 40px 38px' }}>
        <div style={{ fontFamily: sans, fontSize: 28, fontWeight: 600, letterSpacing: 3, color: C.grey, marginBottom: 14 }}>YOU ASKED</div>
        <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: size, lineHeight: 1.15, color: C.white, minHeight: size * 1.15, textWrap: 'balance' }}>
          “{text.slice(0, typed)}
          {typed < text.length ? <span style={{ color: C.blue, fontStyle: 'normal' }}>▍</span> : '”'}
        </div>
      </div>
      <div style={{ position: 'absolute', top: 580, left: 110, right: 190, fontFamily: mono, fontSize: 30, lineHeight: 1.75 }}>
        {[
          { k: 'Grep', a: '"rateLimit"', c: C.white },
          { k: 'Update', a: 'middleware/rateLimit.ts', c: C.white },
          { k: 'Bash', a: 'npm test  ✓ 42 passed', c: C.green },
        ].map((l, i) => {
          const p = prog(frame, did - 8 + i * 7, did + 4 + i * 7, EASE_OUT)
          return (
            <div key={i} style={{ opacity: p * (1 - 0.45 * claude * (i < 2 ? 1 : 0)), transform: `translateX(${(1 - p) * -24}px)`, whiteSpace: 'nowrap' }}>
              <span style={{ color: C.green }}>⏺</span> <span style={{ color: C.blue }}>{l.k}</span>
              <span style={{ color: C.grey }}>(</span>
              <span style={{ color: l.c }}>{l.a}</span>
              <span style={{ color: C.grey }}>)</span>
            </div>
          )
        })}
      </div>
      <Tag color={C.yellow} style={{ top: 830, left: 70, right: 190, textAlign: 'center', opacity: prog(frame, three - 6, three + 6) }}>3 ideas worth knowing</Tag>
      <div style={{ position: 'absolute', top: 892, left: 70, width: 820, display: 'flex', flexDirection: 'column', gap: 28 }}>
        {[0, 1, 2].map((i) => {
          const p = springAt(frame, three + 2 + i * 8, fps, 14)
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 26, padding: '22px 30px', borderRadius: 24, border: `3px solid ${rgba(ACCENT[i], 0.8)}`, background: rgba(ACCENT[i], 0.06), opacity: Math.min(1, p * 1.5), transform: `translateX(${(1 - p) * 80}px)` }}>
              <Badge n={i + 1} color={ACCENT[i]} size={58} />
              <span style={{ fontFamily: sans, fontSize: 38, fontWeight: 500, color: C.white, lineHeight: 1.2 }}>{concepts[i] ?? DEFAULT_CONCEPTS[i]}</span>
            </div>
          )
        })}
      </div>
      <Sfx t={T} name="typing" at={4} volume={0.18} />
      <Sfx t={T} name="pop" at={three + 2} volume={0.3} />
    </>
  )
}

// ---------------------------------------------------------------------------------------------
// 1. Sliding window: the last 60 seconds glide along the clock; a burst gets blocked
const AX_L = 110
const AX_R = 870
const AX_Y = 800
const DOMAIN = 125
const tx = (t: number) => AX_L + (t / DOMAIN) * (AX_R - AX_L)
const LIMIT = 5
const REQS = [
  { t: 42, s: 0 }, { t: 50, s: 0 }, { t: 61, s: 0 }, { t: 70, s: 0 }, { t: 95, s: 0 },
  { t: 113, s: 0 }, { t: 113.4, s: 1 }, { t: 113.8, s: 2 }, { t: 114.2, s: 3 },
]
// Sliding-log decision for each request: allowed if fewer than LIMIT allowed requests in the last 60 s
const ALLOWED = (() => {
  const ok: boolean[] = []
  REQS.forEach((r, i) => {
    const inWin = REQS.slice(0, i).filter((q, j) => ok[j] && q.t > r.t - 60).length
    ok.push(inWin < LIMIT)
  })
  return ok
})()

function Window({ concepts }: SessionReelProps) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const sliding = useCue('sliding', 35)
  const count = useCue('Count', 80)
  const seconds = useCue('seconds', 155)
  const moves = useCue('moves', 200)
  const clock = useCue('clock', 218)
  const no = useCue('no', 244)
  const through = useCue('through', 275)
  const now = interpolate(frame, [0, count - 8, seconds + 4, moves - 14, clock + 16, no + 2, through + 4, through + 40], [40, 40, 75, 75, 112, 112, 115, 116], CLAMP)
  const winIn = prog(frame, sliding - 4, sliding + 16, EASE_OUT)
  const axisIn = prog(frame, 4, 26)
  const left = Math.max(AX_L, tx(now - 60))
  const right = tx(now)
  const arrived = REQS.map((r) => now >= r.t)
  const inWindow = REQS.map((r, i) => arrived[i] && ALLOWED[i] && r.t > now - 60).filter(Boolean).length
  const firstBlocked = REQS.findIndex((_, i) => !ALLOWED[i])
  const blockedNow = firstBlocked >= 0 && arrived[firstBlocked]
  // frame at which `now` reaches a time (for sfx)
  const frameOf = (t: number) => {
    for (let f = 0; f < 400; f++) if (interpolate(f, [0, count - 8, seconds + 4, moves - 14, clock + 16, no + 2, through + 4, through + 40], [40, 40, 75, 75, 112, 112, 115, 116], CLAMP) >= t) return f
    return 400
  }
  const blockF = firstBlocked >= 0 ? frameOf(REQS[firstBlocked].t) : 999
  const numColor = blockedNow ? C.red : inWindow >= LIMIT ? C.yellow : C.white
  const ruleIn = prog(frame, count - 10, count + 4)
  return (
    <>
      <Header n={1} text={concepts[0] ?? DEFAULT_CONCEPTS[0]} color={ACCENT[0]} />
      <div style={{ position: 'absolute', top: 330, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: ruleIn }}>
        <div style={{ fontFamily: sans, fontSize: 34, color: C.white, padding: '14px 30px', border: `2px solid ${C.dim}`, borderRadius: 999 }}>
          limit: <b style={{ color: C.yellow }}>5 requests</b> per <b style={{ color: C.blue }}>60 s</b>, per client
        </div>
      </div>
      <Svg>
        <GlowDefs />
        {/* the window */}
        <g opacity={winIn}>
          <rect x={left} y={520} width={Math.max(0, right - left) * winIn} height={AX_Y - 520 + 10} rx={20} fill={rgba(C.blue, 0.1)} stroke={C.blue} strokeWidth={4} filter="url(#kglow)" />
          <text x={(left + right) / 2} y={500} textAnchor="middle" fill={C.blue} style={{ fontFamily: sans, fontSize: 30, fontWeight: 600 }}>last 60 s</text>
        </g>
        {/* axis */}
        <rect x={AX_L} y={AX_Y - 2} width={(AX_R - AX_L) * axisIn} height={4} fill={C.grey} />
        <path d={`M ${AX_R + 2} ${AX_Y} l -18 -11 l 0 22 z`} fill={C.grey} opacity={axisIn} />
        <text x={AX_L} y={AX_Y + 50} fill={C.grey} opacity={axisIn} style={{ fontFamily: sans, fontSize: 28 }}>older</text>
        {/* now marker */}
        <g opacity={winIn}>
          <line x1={right} y1={500 - 40} x2={right} y2={AX_Y + 22} stroke={C.yellow} strokeWidth={3} strokeDasharray="6 6" />
          <text x={right} y={AX_Y + 50} textAnchor="middle" fill={C.yellow} style={{ fontFamily: sans, fontSize: 28, fontWeight: 600 }}>now</text>
        </g>
        {/* requests */}
        {REQS.map((r, i) => {
          if (!arrived[i]) return null
          const at = frameOf(r.t)
          const p = springAt(frame, at, fps, 12)
          const x = tx(r.t)
          const y = AX_Y - 52 - r.s * 52
          const inside = r.t > now - 60
          const ok = ALLOWED[i]
          const color = !ok ? C.red : inside ? C.white : C.dim
          return (
            <g key={i} transform={`translate(${x} ${lerp(y - 60, y, p)})`} opacity={Math.min(1, p * 1.5)}>
              {r.s === 0 && <line x1={0} y1={18} x2={0} y2={50} stroke={color} strokeWidth={3} />}
              {ok ? (
                <circle r={17} fill={inside ? rgba(C.white, 0.9) : 'none'} stroke={color} strokeWidth={4} />
              ) : (
                <g filter="url(#kglow)">
                  <circle r={19} fill={rgba(C.red, 0.18)} stroke={C.red} strokeWidth={4} />
                  <path d="M -8 -8 L 8 8 M 8 -8 L -8 8" stroke={C.red} strokeWidth={4} strokeLinecap="round" />
                </g>
              )}
            </g>
          )
        })}
      </Svg>
      <div style={{ position: 'absolute', top: 920, left: 70, width: 820, textAlign: 'center', fontFamily: sans, opacity: prog(frame, count - 4, count + 8) }}>
        <div style={{ fontSize: 150, fontWeight: 600, lineHeight: 1, letterSpacing: -4, color: numColor, fontVariantNumeric: 'tabular-nums', textShadow: `0 0 60px ${rgba(numColor, 0.3)}` }}>
          {inWindow}
          <span style={{ color: C.grey, fontSize: 90 }}> / {LIMIT}</span>
        </div>
        <div style={{ fontSize: 34, color: C.grey, marginTop: 14 }}>requests in the window</div>
      </div>
      <div style={{ position: 'absolute', top: 1250, left: 70, width: 820, textAlign: 'center', fontFamily: sans, fontSize: 38, fontWeight: 600, color: C.red, opacity: prog(frame, blockF, blockF + 8) }}>
        burst over the limit → blocked
      </div>
      <Sfx t={T} name="slide" at={moves - 12} volume={0.4} />
      <Sfx t={T} name="block" at={blockF} volume={0.5} />
    </>
  )
}

// ---------------------------------------------------------------------------------------------
// 2. Keys: count per IP *and* per user, each catches a different attack
const PANEL = [
  { x: 90, w: 380, key: 'IP' },
  { x: 510, w: 380, key: 'user' },
]
const BAR_TOP = 760
const BAR_BOT = 1120
const PER = (BAR_BOT - BAR_TOP) / 6 // height of one request; limit line at 5

type Phase = { from: number; sources: { x: number; label: string }[]; ip: string[]; user: string[]; reqs: { src: number; ip: number; user: number }[]; caption: string; catches: 0 | 1 }

function Keys({ concepts }: SessionReelProps) {
  const frame = useCurrentFrame()
  const ip = useCue('IP', 45)
  const user = useCue('user', 75)
  const ip2 = useNthCue('ip', 1, 100)
  const user2 = useNthCue('user', 1, 198)
  const swap = prog(frame, user2 - 16, user2 - 2)
  const phases: Phase[] = [
    {
      from: ip2 + 8,
      sources: [{ x: 540, label: '203.0.113.7' }],
      ip: ['203.0.113.7'],
      user: ['ana', 'bo', 'cy', 'dee', 'eli'],
      reqs: [0, 1, 2, 3, 4, 0].map((u) => ({ src: 0, ip: 0, user: u })),
      caption: 'one machine, many accounts',
      catches: 0,
    },
    {
      from: user2 + 8,
      sources: [170, 355, 540, 725, 910].map((x, i) => ({ x, label: ['.7', '.22', '.91', '.4', '.58'][i] })),
      ip: ['.7', '.22', '.91', '.4', '.58'],
      user: ['ana'],
      reqs: [0, 1, 2, 3, 4, 2].map((s) => ({ src: s, ip: s, user: 0 })),
      caption: 'many machines, one account',
      catches: 1,
    },
  ]
  const STEP = 10
  const FLY = 12
  const phase = swap < 0.5 ? phases[0] : phases[1]
  const pi = swap < 0.5 ? 0 : 1
  const phaseO = pi === 0 ? 1 - prog(frame, user2 - 16, user2 - 8) : prog(frame, user2 - 8, user2)
  const blockAt = phase.from + (phase.reqs.length - 1) * STEP + FLY

  // counts as of now
  const landed = phase.reqs.filter((_, k) => frame >= phase.from + k * STEP + FLY)
  const counts = [phase.ip.map((_, j) => landed.filter((r) => r.ip === j).length), phase.user.map((_, j) => landed.filter((r) => r.user === j).length)]

  return (
    <>
      <Header n={2} text={concepts[1] ?? DEFAULT_CONCEPTS[1]} color={ACCENT[1]} />
      <Svg>
        <GlowDefs />
        {/* sources */}
        <g opacity={phaseO * prog(frame, ip2 - 10, ip2 + 4)}>
          {phase.sources.map((s, i) => (
            <g key={`${pi}-${i}`}>
              <Laptop x={s.x} y={440} color={C.white} scale={phase.sources.length > 1 ? 0.95 : 1.25} />
              <text x={s.x} y={535} textAnchor="middle" fill={C.grey} style={{ fontFamily: mono, fontSize: 28 }}>{s.label}</text>
            </g>
          ))}
        </g>
        {/* panels */}
        {PANEL.map((pnl, side) => {
          const appear = prog(frame, (side === 0 ? ip : user) - 6, (side === 0 ? ip : user) + 10, EASE_OUT)
          const keys = side === 0 ? phase.ip : phase.user
          const slot = pnl.w / Math.max(keys.length, 1)
          const bw = Math.min(110, slot * 0.62)
          const caught = phase.catches === side && frame >= blockAt
          const col = side === 0 ? C.blue : C.purple
          return (
            <g key={side} opacity={appear}>
              <rect x={pnl.x} y={640} width={pnl.w} height={560} rx={26} fill={rgba(caught ? C.red : col, caught ? 0.08 : 0.04)} stroke={caught ? C.red : rgba(col, 0.6)} strokeWidth={3} />
              <text x={pnl.x + pnl.w / 2} y={700} textAnchor="middle" fill={col} style={{ fontFamily: sans, fontSize: 32, fontWeight: 700 }}>
                count per {pnl.key}
              </text>
              {/* limit line */}
              <line x1={pnl.x + 24} x2={pnl.x + pnl.w - 24} y1={BAR_BOT - LIMIT * PER} y2={BAR_BOT - LIMIT * PER} stroke={rgba(C.red, 0.7)} strokeWidth={3} strokeDasharray="10 8" />
              <text x={pnl.x + pnl.w - 26} y={BAR_BOT - LIMIT * PER - 12} textAnchor="end" fill={rgba(C.red, 0.9)} style={{ fontFamily: sans, fontSize: 28 }}>limit</text>
              <g opacity={phaseO}>
                {keys.map((k, j) => {
                  const n = counts[side][j]
                  const h = Math.min(n, LIMIT) * PER
                  const cx = pnl.x + slot * (j + 0.5)
                  const full = n >= LIMIT
                  const barCol = caught && full ? C.red : full ? C.yellow : col
                  return (
                    <g key={`${pi}-${j}`}>
                      <rect x={cx - bw / 2} y={BAR_BOT - h} width={bw} height={Math.max(0, h)} rx={8} fill={rgba(barCol, 0.85)} filter={full ? 'url(#kglow)' : undefined} />
                      <line x1={cx - bw / 2 - 6} x2={cx + bw / 2 + 6} y1={BAR_BOT} y2={BAR_BOT} stroke={C.grey} strokeWidth={3} />
                      <text x={cx} y={BAR_BOT + 44} textAnchor="middle" fill={C.white} style={{ fontFamily: mono, fontSize: keys.length > 1 ? 28 : 30 }}>{k}</text>
                    </g>
                  )
                })}
              </g>
            </g>
          )
        })}
        {/* request particles: every request lands in both panels */}
        {phase.reqs.map((r, k) => {
          const a = phase.from + k * STEP
          const p = prog(frame, a, a + FLY, EASE_OUT)
          const blocked = k === phase.reqs.length - 1
          const sx = phase.sources[r.src].x
          return [0, 1].map((side) => {
            const keys = side === 0 ? phase.ip : phase.user
            const slot = PANEL[side].w / keys.length
            const idx = side === 0 ? r.ip : r.user
            const cx = PANEL[side].x + slot * (idx + 0.5)
            const n = phase.reqs.slice(0, k).filter((q) => (side === 0 ? q.ip : q.user) === idx).length
            const ty = BAR_BOT - Math.min(n + 1, LIMIT + 0.6) * PER + PER / 2
            return <Packet key={`${pi}-${k}-${side}`} ax={sx} ay={480} bx={cx} by={ty} p={p} r={12} color={blocked ? C.red : C.white} trail={4} />
          })
        })}
        {/* the blocked request */}
        {frame >= blockAt && (
          <g opacity={prog(frame, blockAt, blockAt + 6)} filter="url(#kglow)">
            {(() => {
              const side = phase.catches
              const keys = side === 0 ? phase.ip : phase.user
              const cx = PANEL[side].x + (PANEL[side].w / keys.length) * 0.5
              const cy = BAR_BOT - LIMIT * PER - 44
              return (
                <g transform={`translate(${cx} ${cy})`}>
                  <circle r={30} fill={rgba(C.red, 0.2)} stroke={C.red} strokeWidth={4} />
                  <path d="M -12 -12 L 12 12 M 12 -12 L -12 12" stroke={C.red} strokeWidth={5} strokeLinecap="round" />
                </g>
              )
            })()}
          </g>
        )}
      </Svg>
      <div style={{ position: 'absolute', top: 1250, left: 70, width: 820, textAlign: 'center', fontFamily: sans, fontSize: 36, opacity: phaseO * prog(frame, phase.from, phase.from + 10) }}>
        <span style={{ color: C.white }}>{phase.caption}</span>
        <span style={{ color: C.grey }}> → </span>
        <span style={{ color: C.red, fontWeight: 600, opacity: prog(frame, blockAt, blockAt + 8) }}>caught by {phase.catches === 0 ? 'IP' : 'user'}</span>
      </div>
      <Sfx t={T} name="block" at={phases[0].from + 5 * STEP + FLY} volume={0.45} />
      <Sfx t={T} name="block" at={phases[1].from + 5 * STEP + FLY} volume={0.45} />
    </>
  )
}

// ---------------------------------------------------------------------------------------------
// 3. 429 + Retry-After: the server says no, and exactly when to come back
function Retry({ concepts }: SessionReelProps) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const over = useCue('over', 27)
  const replies = useCue('replies', 58)
  const four = useCue('four', 74)
  const too = useCue('Too', 105)
  const retry = useCue('Retry-After', 150)
  const saying = useCue('saying', 182)
  const back = useCue('back', 203)
  const goOut = prog(frame, over - 6, over + 14)
  const goBack = prog(frame, replies - 4, four + 2)
  const card = springAt(frame, four - 4, fps, 13)
  const tooIn = prog(frame, too - 4, too + 8)
  const hdr = prog(frame, retry - 4, retry + 8)
  const ring = prog(frame, retry + 6, retry + 18)
  const countdown = interpolate(frame, [saying - 6, back + 6], [30, 0], { ...CLAMP, easing: (t) => t })
  const done = frame >= back + 6
  const okIn = springAt(frame, back + 6, fps, 12)
  const R = 120
  const circ = 2 * Math.PI * R
  const retryGo = prog(frame, back + 6, back + 22)
  return (
    <>
      <Header n={3} text={concepts[2] ?? DEFAULT_CONCEPTS[2]} color={ACCENT[2]} />
      <Svg>
        <GlowDefs />
        <Laptop x={190} y={420} color={C.white} scale={1.3} />
        <text x={190} y={520} textAnchor="middle" fill={C.grey} style={{ fontFamily: sans, fontSize: 28 }}>client</text>
        <AppBox x={850} y={420} w={180} h={150} label="api" color={done ? C.green : C.blue} lit={goOut >= 1 && goBack <= 0 ? 0.8 : 0} />
        <line x1={290} y1={400} x2={750} y2={400} stroke={C.dim} strokeWidth={3} strokeDasharray="10 10" />
        <line x1={290} y1={444} x2={750} y2={444} stroke={C.dim} strokeWidth={3} strokeDasharray="10 10" />
        <Packet ax={290} ay={400} bx={750} by={400} p={goOut} color={C.yellow} r={14} />
        <Packet ax={750} ay={444} bx={290} by={444} p={goBack} color={C.red} r={16} />
        <Packet ax={290} ay={400} bx={750} by={400} p={retryGo} color={C.green} r={14} />
        {/* countdown ring */}
        <g opacity={ring}>
          <circle cx={490} cy={1150} r={R} fill="none" stroke={C.dim} strokeWidth={10} />
          <circle cx={490} cy={1150} r={R} fill="none" stroke={done ? C.green : C.teal} strokeWidth={10} strokeLinecap="round" strokeDasharray={`${circ * (countdown / 30)} ${circ}`} transform="rotate(-90 490 1150)" filter="url(#kglow)" />
        </g>
      </Svg>
      {/* response card */}
      <div style={{ position: 'absolute', top: 600, left: 110, width: 760, opacity: Math.min(1, card * 1.4) * (1 - 0.55 * prog(frame, back + 6, back + 16)), transform: `translateY(${(1 - card) * 30}px) scale(${0.94 + 0.06 * card})`, border: `3px solid ${rgba(C.red, 0.8)}`, borderRadius: 28, background: '#0B0606', padding: '26px 36px 30px', boxShadow: `0 0 60px ${rgba(C.red, 0.18)}` }}>
        <div style={{ fontFamily: mono, fontSize: 28, color: C.grey }}>HTTP/1.1</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 24 }}>
          <span style={{ fontFamily: sans, fontWeight: 700, fontSize: 130, lineHeight: 1.05, letterSpacing: -4, color: C.red, textShadow: `0 0 50px ${rgba(C.red, 0.45)}` }}>429</span>
          <span style={{ fontFamily: sans, fontSize: 40, color: C.white, opacity: tooIn }}>Too Many Requests</span>
        </div>
        <div style={{ marginTop: 12, fontFamily: mono, fontSize: 36, padding: '8px 14px', borderRadius: 12, background: rgba(C.teal, 0.14 * hdr), boxShadow: hdr > 0.02 ? `inset 6px 0 0 ${rgba(C.teal, hdr)}` : undefined, opacity: hdr }}>
          <span style={{ color: C.teal }}>Retry-After:</span> <span style={{ color: C.white }}>30</span>
        </div>
      </div>
      <div style={{ position: 'absolute', top: 1150 - 60, left: 290, width: 400, textAlign: 'center', fontFamily: sans, opacity: ring * (1 - prog(frame, back + 4, back + 10)) }}>
        <div style={{ fontSize: 90, fontWeight: 600, lineHeight: '96px', color: C.white, fontVariantNumeric: 'tabular-nums' }}>{Math.ceil(countdown)}</div>
        <div style={{ fontSize: 28, color: C.grey }}>{Math.ceil(countdown) === 1 ? 'second' : 'seconds'}</div>
      </div>
      <div style={{ position: 'absolute', top: 1150 - 40, left: 290, width: 400, textAlign: 'center', fontFamily: sans, fontSize: 64, fontWeight: 700, color: C.green, opacity: Math.min(1, okIn * 1.4), transform: `scale(${0.7 + 0.3 * okIn})`, textShadow: `0 0 40px ${rgba(C.green, 0.5)}` }}>
        200
        <div style={{ fontSize: 30, fontWeight: 500 }}>OK</div>
      </div>
      <Sfx t={T} name="error" at={replies + 8} volume={0.25} />
      <Sfx t={T} name="chime" at={back + 6} volume={0.5} />
    </>
  )
}

// ---------------------------------------------------------------------------------------------
// Outro: the three ideas lock together into a shield around the API
function Outro() {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const three = useCue('Three', 8)
  const api = useCue('API', 55)
  const harder = useCue('harder', 92)
  const join = prog(frame, api - 14, api + 14)
  const shieldDraw = prog(frame, api - 6, api + 22)
  const hit = (k: number) => harder - 18 + k * 7
  const greenGlow = prog(frame, harder, harder + 14)
  const SX = 540
  const SY = 820
  const shield = `M ${SX} ${SY - 230} C ${SX + 120} ${SY - 170} ${SX + 210} ${SY - 175} ${SX + 230} ${SY - 160} C ${SX + 235} ${SY + 20} ${SX + 160} ${SY + 170} ${SX} ${SY + 250} C ${SX - 160} ${SY + 170} ${SX - 235} ${SY + 20} ${SX - 230} ${SY - 160} C ${SX - 210} ${SY - 175} ${SX - 120} ${SY - 170} ${SX} ${SY - 230} Z`
  const icons = [
    { from: [230, 560], to: [SX - 230, SY - 60], label: '60 s' },
    { from: [540, 560], to: [SX, SY - 235], label: 'IP · user' },
    { from: [850, 560], to: [SX + 230, SY - 60], label: '429' },
  ]
  const attackers = [
    { x: 90, y: 330 }, { x: 120, y: 1050 }, { x: 990, y: 360 }, { x: 260, y: 230 }, { x: 820, y: 250 },
  ]
  return (
    <>
      <Svg>
        <GlowDefs />
        <path d={shield} fill={rgba(C.green, 0.06 * greenGlow)} stroke={greenGlow > 0 ? C.green : C.blue} strokeWidth={6} pathLength={1} style={{ strokeDasharray: `${shieldDraw} 1` }} filter="url(#kglow)" />
        {attackers.map((a, k) => {
          const at = hit(k)
          const p = prog(frame, at, at + 12, (t) => t)
          const bounce = prog(frame, at + 12, at + 26, EASE_OUT)
          if (p <= 0) return null
          const dx = SX - a.x
          const dy = SY - a.y
          const d = Math.hypot(dx, dy)
          const stop = 1 - 260 / d
          const x = lerp(a.x, a.x + dx * stop, p) - (dx / d) * 120 * bounce
          const y = lerp(a.y, a.y + dy * stop, p) - (dy / d) * 120 * bounce
          return <circle key={k} cx={x} cy={y} r={14} fill={C.red} opacity={1 - bounce} filter="url(#kglow)" />
        })}
      </Svg>
      <div style={{ position: 'absolute', top: SY - 70, left: 0, right: 0, textAlign: 'center', opacity: prog(frame, api - 4, api + 10) }}>
        <div style={{ fontFamily: mono, fontSize: 56, fontWeight: 600, color: C.white }}>your API</div>
      </div>
      {icons.map((ic, i) => {
        const p = springAt(frame, three + i * 7, fps, 14)
        const x = lerp(ic.from[0], ic.to[0], join)
        const y = lerp(ic.from[1], ic.to[1], join)
        return (
          <div key={i} style={{ position: 'absolute', left: x - 80, top: y - 50, width: 160, height: 100, borderRadius: 24, border: `4px solid ${ACCENT[i]}`, background: '#000', display: 'grid', placeItems: 'center', opacity: Math.min(1, p * 1.4), transform: `scale(${(0.6 + 0.4 * p) * lerp(1.35, 0.95, join)})`, boxShadow: `0 0 34px ${rgba(ACCENT[i], 0.4)}` }}>
            <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 32, color: ACCENT[i], whiteSpace: 'nowrap' }}>{ic.label}</div>
          </div>
        )
      })}
      <div style={{ position: 'absolute', top: 1200, left: 70, width: 820, textAlign: 'center', fontFamily: serif, fontStyle: 'italic', fontSize: 84, lineHeight: 1.05, color: C.green, opacity: greenGlow, transform: `translateY(${(1 - greenGlow) * 20}px)`, textShadow: `0 0 50px ${rgba(C.green, 0.35)}` }}>
        Harder to abuse.
      </div>
      <Sfx t={T} name="success" at={harder + 2} volume={0.35} />
    </>
  )
}

export function SessionReel(props: SessionReelProps) {
  const p: SessionReelProps = { prompt: props.prompt ?? '', repo: props.repo ?? '', concepts: props.concepts?.length ? props.concepts : DEFAULT_CONCEPTS }
  return (
    <Stage>
      <ReelAudio t={T} musicVolume={0.17} />
      <Scene t={T} id="intro"><Intro {...p} /></Scene>
      <Scene t={T} id="window"><Window {...p} /></Scene>
      <Scene t={T} id="keys"><Keys {...p} /></Scene>
      <Scene t={T} id="retry"><Retry {...p} /></Scene>
      <Scene t={T} id="outro"><Outro /></Scene>
      <Captions t={T} />
    </Stage>
  )
}
