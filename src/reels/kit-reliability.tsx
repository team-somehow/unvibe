// Helpers for the reliability reels (race, backoff): eased progress, glowing pills, arrows,
// a syntax-coloured code card with timed highlights, a padlock, and a load meter.
import type { CSSProperties, ReactNode } from 'react'
import { Easing, interpolate, interpolateColors, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { C, mono, sans } from './primitives'

export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
export const easeInOut = Easing.inOut(Easing.cubic)
export const easeOut = Easing.out(Easing.cubic)

export function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

/** Eased 0 -> 1 between two frames (clamped). */
export function prog(frame: number, from: number, to: number, easing: (t: number) => number = easeInOut) {
  return interpolate(frame, [from, Math.max(from + 1, to)], [0, 1], { ...clamp, easing })
}

export function useSpr(from: number, damping = 14, mass = 0.6) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  return spring({ frame: frame - from, fps, config: { damping, mass } })
}

export const glowText = (color: string, r = 34, a = 0.55) => `0 0 ${r}px ${rgba(color, a)}`

/** Shared SVG glow filter; put once inside any <svg>. */
export function GlowDefs() {
  return (
    <defs>
      <filter id="kglow" filterUnits="userSpaceOnUse" x={-200} y={-200} width={1480} height={2320}>
        <feGaussianBlur stdDeviation="7" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  )
}

/** Full-frame SVG layer in composition coordinates. */
export function Svg({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 1080 1920" style={{ position: 'absolute', inset: 0, width: 1080, height: 1920, overflow: 'visible', ...style }}>
      <GlowDefs />
      {children}
    </svg>
  )
}

/** A straight arrow that draws itself (p: 0..1). Use inside <Svg>. */
export function Arrow({ x1, y1, x2, y2, p, color, width = 4, dashed, glow, head = 16 }: {
  x1: number; y1: number; x2: number; y2: number; p: number; color: string; width?: number; dashed?: boolean; glow?: boolean; head?: number
}) {
  if (p <= 0.001) return null
  const x = x1 + (x2 - x1) * p
  const y = y1 + (y2 - y1) * p
  const a = Math.atan2(y2 - y1, x2 - x1)
  const hx = (da: number) => x - head * Math.cos(a + da)
  const hy = (da: number) => y - head * Math.sin(a + da)
  return (
    <g filter={glow ? 'url(#kglow)' : undefined}>
      <line x1={x1} y1={y1} x2={x - Math.cos(a) * head * 0.6} y2={y - Math.sin(a) * head * 0.6} stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={dashed ? '12 12' : undefined} />
      {head > 0 && <path d={`M ${x} ${y} L ${hx(0.5)} ${hy(0.5)} L ${hx(-0.5)} ${hy(-0.5)} Z`} fill={color} />}
    </g>
  )
}

/** A rounded label that springs in at `at`, centred on (x, y). */
export function Pill({ x, y, w, h = 84, color, at, children, glow = 0, font = 34, family = sans, weight = 600, fill, out, style, radius = 20 }: {
  x: number; y: number; w: number; h?: number; color: string; at: number; children: ReactNode; glow?: number; font?: number; family?: string; weight?: number
  fill?: string; out?: number; style?: CSSProperties; radius?: number
}) {
  const frame = useCurrentFrame()
  const p = useSpr(at, 15)
  const o = out !== undefined ? 1 - prog(frame, out, out + 10) : 1
  if (frame < at) return null
  return (
    <div
      style={{
        position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, boxSizing: 'border-box',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, borderRadius: radius,
        border: `3px solid ${color}`, color, background: fill ?? `linear-gradient(${rgba(color, 0.1 + glow * 0.08)}, ${rgba(color, 0.1 + glow * 0.08)}), #05080B`,
        boxShadow: glow > 0 ? `0 0 ${46 * glow}px ${rgba(color, 0.42 * glow)}` : 'none',
        fontFamily: family, fontSize: font, fontWeight: weight, whiteSpace: 'nowrap', letterSpacing: -0.3,
        opacity: Math.min(1, p) * o, transform: `scale(${0.82 + 0.18 * p})`,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

/** A small value token that travels from one point to another (centred), with a slight arc. */
export function Token({ x1, y1, x2, y2, from, dur = 18, color, children, arc = 0, linger = 6, font = 30 }: {
  x1: number; y1: number; x2: number; y2: number; from: number; dur?: number; color: string; children: ReactNode; arc?: number; linger?: number; font?: number
}) {
  const frame = useCurrentFrame()
  if (frame < from || frame > from + dur + linger + 8) return null
  const p = prog(frame, from, from + dur)
  const x = x1 + (x2 - x1) * p
  const y = y1 + (y2 - y1) * p - Math.sin(p * Math.PI) * arc
  const o = interpolate(frame, [from, from + 4, from + dur + linger, from + dur + linger + 8], [0, 1, 1, 0], clamp)
  return (
    <div
      style={{
        position: 'absolute', left: x, top: y, transform: `translate(-50%, -50%) scale(${0.9 + 0.1 * Math.sin(p * Math.PI)})`, opacity: o,
        padding: '6px 16px', borderRadius: 999, background: '#000', border: `3px solid ${color}`, color,
        fontFamily: mono, fontSize: font, fontWeight: 600, whiteSpace: 'nowrap', boxShadow: `0 0 28px ${rgba(color, 0.55)}`,
      }}
    >
      {children}
    </div>
  )
}

// ---------- Code card with syntax colours ----------

const KW = new Set([
  'async', 'function', 'while', 'true', 'false', 'try', 'return', 'await', 'catch', 'for', 'let', 'const', 'throw', 'new', 'if', 'else',
  'SELECT', 'FROM', 'WHERE', 'FOR', 'UPDATE', 'BEGIN', 'COMMIT', 'INSERT', 'INTO', 'VALUES', 'ON', 'CONFLICT', 'DO', 'NOTHING', 'AND',
])
const PUNCT = '#9AA6B4'

type Tok = { t: string; c: string; s: number }

function tokenize(line: string): Tok[] {
  const out: Tok[] = []
  const re = /(\/\/.*$|\/\*.*?\*\/|--.*$)|('[^']*'|"[^"]*")|(\b\d+\b)|([A-Za-z_$][\w$]*)|(\s+)|(.)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(line))) {
    const [t, com, str, num, id] = m
    let c = PUNCT
    if (com) c = C.grey
    else if (str) c = C.green
    else if (num) c = C.yellow
    else if (id) {
      const rest = line.slice(m.index + t.length)
      if (t.startsWith('$')) c = C.yellow
      else if (KW.has(t)) c = C.blue
      else if (/^\s*\(/.test(rest)) c = C.teal
      else c = C.white
    } else if (/\s/.test(t)) c = C.white
    out.push({ t, c, s: m.index })
  }
  return out
}

export type CodeHl = { line: number; text?: string; at: number; color: string; until?: number }

function renderLine(line: string, ranges: { s: number; e: number; color: string; p: number }[]) {
  const toks = tokenize(line)
  const cuts = new Set<number>()
  ranges.forEach((r) => { cuts.add(r.s); cuts.add(r.e) })
  const pieces: Tok[] = []
  for (const tk of toks) {
    let a = tk.s
    const end = tk.s + tk.t.length
    const inner = [...cuts].filter((x) => x > a && x < end).sort((x, y) => x - y)
    for (const cut of [...inner, end]) {
      pieces.push({ t: line.slice(a, cut), c: tk.c, s: a })
      a = cut
    }
  }
  const out: ReactNode[] = []
  let i = 0
  while (i < pieces.length) {
    const r = ranges.find((rg) => pieces[i].s >= rg.s && pieces[i].s < rg.e)
    if (!r) {
      out.push(<span key={i} style={{ color: pieces[i].c }}>{pieces[i].t}</span>)
      i++
      continue
    }
    const group: Tok[] = []
    const k = i
    while (i < pieces.length && pieces[i].s >= r.s && pieces[i].s < r.e) group.push(pieces[i++])
    out.push(
      <span
        key={`h${k}`}
        style={{
          borderRadius: 8, background: rgba(r.color, 0.2 * r.p), boxShadow: `0 0 ${26 * r.p}px ${rgba(r.color, 0.45 * r.p)}, inset 0 0 0 2px ${rgba(r.color, 0.85 * r.p)}`,
          padding: '3px 0', margin: '-3px 0',
        }}
      >
        {group.map((g, j) => (
          <span key={j} style={{ color: r.p > 0.5 && g.c !== C.grey ? interpolateColors(r.p, [0.5, 1], [g.c, C.white]) : g.c }}>{g.t}</span>
        ))}
      </span>,
    )
  }
  return out
}

/** A Claude Code style card: tool header, then code lines revealed left to right, with timed glowing highlights. */
export function CodeCard({ top, left = 70, width = 820, from, header, lines, hl = [], size = 31, lineH = 1.52, stagger = 5, out, dim }: {
  top: number; left?: number; width?: number; from: number; header?: string; lines: string[]; hl?: CodeHl[]; size?: number; lineH?: number; stagger?: number; out?: number
  /** lines to dim after a frame, to focus the rest */
  dim?: { at: number; keep: number[] }
}) {
  const frame = useCurrentFrame()
  const pop = useSpr(from, 16)
  const o = out !== undefined ? 1 - prog(frame, out, out + 12) : 1
  if (frame < from) return null
  const dimP = dim ? prog(frame, dim.at, dim.at + 12) : 0
  return (
    <div
      style={{
        position: 'absolute', top, left, width, boxSizing: 'border-box', opacity: Math.min(1, pop) * o,
        transform: `translateY(${(1 - pop) * 36}px) scale(${0.96 + pop * 0.04})`,
        background: '#0A0E13', border: `2px solid ${C.dim}`, borderRadius: 28, padding: '26px 30px',
        fontFamily: mono, fontSize: size, lineHeight: lineH, boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
      }}
    >
      {header && (
        <div style={{ color: C.white, fontSize: size - 3, marginBottom: 12, whiteSpace: 'nowrap', overflow: 'hidden' }}>
          <span style={{ color: C.green }}>⏺</span> {header}
        </div>
      )}
      {lines.map((ln, i) => {
        const start = from + 10 + i * stagger
        const reveal = prog(frame, start, start + 12, easeOut) * 100
        const ranges = hl
          .filter((h) => h.line === i)
          .map((h) => {
            const s = h.text ? ln.indexOf(h.text) : ln.search(/\S/)
            const e = h.text ? s + h.text.length : ln.length
            const p = prog(frame, h.at, h.at + 8) * (h.until !== undefined ? 1 - prog(frame, h.until, h.until + 10) : 1)
            return { s, e, color: h.color, p }
          })
          .filter((r) => r.s >= 0 && r.p > 0)
        const dimmed = dim && !dim.keep.includes(i) ? 1 - 0.6 * dimP : 1
        return (
          <div key={i} style={{ whiteSpace: 'pre', clipPath: `inset(-30% ${100 - reveal}% -30% 0)`, opacity: dimmed }}>
            {renderLine(ln, ranges)}
            {ln.length === 0 ? ' ' : ''}
          </div>
        )
      })}
    </div>
  )
}

/** Padlock icon centred on (x, y). closed: 0 = open shackle, 1 = shut. */
export function Padlock({ x, y, size = 64, closed, color, glow = 0, opacity = 1 }: { x: number; y: number; size?: number; closed: number; color: string; glow?: number; opacity?: number }) {
  const lift = (1 - closed) * 20
  return (
    <svg
      viewBox="0 0 100 110"
      style={{ position: 'absolute', left: x - size / 2, top: y - (size * 1.1) / 2, width: size, height: size * 1.1, overflow: 'visible', opacity, filter: glow ? `drop-shadow(0 0 ${14 * glow}px ${rgba(color, 0.8)})` : undefined }}
    >
      <path d="M 29 54 V 36 a 21 21 0 0 1 42 0 V 54" transform={`translate(0 ${-lift}) rotate(${(1 - closed) * -14} 29 54)`} fill="none" stroke={color} strokeWidth={10} strokeLinecap="round" />
      <rect x={12} y={50} width={76} height={58} rx={14} fill={color} />
      <circle cx={50} cy={74} r={8} fill="#000" />
      <rect x={46.5} y={76} width={7} height={16} rx={3.5} fill="#000" />
    </svg>
  )
}

/** Horizontal load meter. value and capacity are fractions of the bar width. */
export function Meter({ x, y, w, h = 30, value, capacity, label = 'load', text }: { x: number; y: number; w: number; h?: number; value: number; capacity: number; label?: string; text?: string }) {
  const v = Math.max(0, Math.min(1, value))
  const color = interpolateColors(value / capacity, [0.6, 0.9, 1.05], [C.green, C.yellow, C.red])
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: sans, fontSize: 28, color: C.grey, marginBottom: 10 }}>
        <span>{label}</span>
        <span style={{ color, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{text ?? `${Math.round((value / capacity) * 100)}%`}</span>
      </div>
      <div style={{ position: 'relative', height: h, borderRadius: h / 2, background: rgba(C.white, 0.06), border: `2px solid ${C.dim}`, overflow: 'visible' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${v * 100}%`, borderRadius: h / 2, background: color, filter: `drop-shadow(0 0 12px ${color})` }} />
        <div style={{ position: 'absolute', left: `${capacity * 100}%`, top: -10, bottom: -10, width: 3, background: C.white, opacity: 0.7 }} />
      </div>
    </div>
  )
}
