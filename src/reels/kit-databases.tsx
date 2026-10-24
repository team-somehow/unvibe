// Shared drawing kit for the database / backend reels (index, nplus1, session).
// Geometric, Manim-flavoured pieces: eased progress helpers, glow filters, an app server,
// a database cylinder, flying packets, syntax-coloured code and big tabular counters.
import type { CSSProperties, ReactNode } from 'react'
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { useScene } from './audio'
import { C, mono, sans, serif } from './primitives'

export const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
export const EASE = Easing.inOut(Easing.cubic)
export const EASE_OUT = Easing.out(Easing.cubic)

/** 0 → 1 between two frames, eased and clamped. */
export function prog(frame: number, from: number, to: number, easing: (t: number) => number = EASE) {
  return interpolate(frame, [from, Math.max(from + 1, to)], [0, 1], { ...CLAMP, easing })
}

export function useProg(from: number, to: number, easing?: (t: number) => number) {
  return prog(useCurrentFrame(), from, to, easing)
}

/** Spring that starts at `from` (0 before it). */
export function useSpringAt(from: number, damping = 14, mass = 0.7) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  return spring({ frame: frame - from, fps, config: { damping, mass } })
}

export function springAt(frame: number, from: number, fps: number, damping = 14, mass = 0.7) {
  return spring({ frame: frame - from, fps, config: { damping, mass } })
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** '#RRGGBB' + alpha → rgba() */
export function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

export const glow = (color: string, r = 40, a = 0.45) => `0 0 ${r}px ${rgba(color, a)}`

/** SVG <defs> with a soft bloom filter (url(#id)). */
export function GlowDefs({ id = 'kglow', std = 7 }: { id?: string; std?: number }) {
  return (
    <defs>
      <filter id={id} x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation={std} result="b" />
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
    <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: 'absolute', inset: 0, overflow: 'visible', ...style }}>
      {children}
    </svg>
  )
}

/** App server glyph: a rack box with three slots and status LEDs. (x, y) is the centre. */
export function AppBox({ x, y, w = 210, h = 170, color = C.blue, label = 'app', lit = 0, opacity = 1, scale = 1 }: { x: number; y: number; w?: number; h?: number; color?: string; label?: string; lit?: number; opacity?: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={22} fill={rgba(color, 0.07 + lit * 0.1)} stroke={color} strokeWidth={4} filter={lit > 0.05 ? 'url(#kglow)' : undefined} />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={-w / 2 + 24} y={-h / 2 + 26 + i * 38} width={w - 92} height={20} rx={6} fill="none" stroke={rgba(color, 0.55)} strokeWidth={2.5} />
          <circle cx={w / 2 - 38} cy={-h / 2 + 36 + i * 38} r={7} fill={i === 0 ? C.green : rgba(color, 0.6)} />
        </g>
      ))}
      <text y={h / 2 + 46} textAnchor="middle" fill={color} style={{ fontFamily: sans, fontSize: 32, fontWeight: 600 }}>{label}</text>
    </g>
  )
}

/** Database cylinder. (x, y) is the centre. */
export function DbCylinder({ x, y, w = 190, h = 190, color = C.blue, label = 'postgres', lit = 0, opacity = 1, scale = 1 }: { x: number; y: number; w?: number; h?: number; color?: string; label?: string; lit?: number; opacity?: number; scale?: number }) {
  const rx = w / 2
  const ry = w * 0.17
  const top = -h / 2 + ry
  const bot = h / 2 - ry
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
      <g filter={lit > 0.05 ? 'url(#kglow)' : undefined}>
        <path d={`M ${-rx} ${top} L ${-rx} ${bot} A ${rx} ${ry} 0 0 0 ${rx} ${bot} L ${rx} ${top}`} fill={rgba(color, 0.07 + lit * 0.1)} stroke={color} strokeWidth={4} />
        <ellipse cx={0} cy={top} rx={rx} ry={ry} fill="#04080B" stroke={color} strokeWidth={4} />
        {[0.36, 0.68].map((t) => (
          <path key={t} d={`M ${-rx} ${top + (bot - top) * t} A ${rx} ${ry} 0 0 0 ${rx} ${top + (bot - top) * t}`} fill="none" stroke={rgba(color, 0.5)} strokeWidth={2.5} />
        ))}
      </g>
      <text y={h / 2 + 46} textAnchor="middle" fill={color} style={{ fontFamily: sans, fontSize: 32, fontWeight: 600 }}>{label}</text>
    </g>
  )
}

/** A laptop glyph for "a client machine". (x, y) is the centre of the screen. */
export function Laptop({ x, y, color = C.blue, scale = 1, opacity = 1 }: { x: number; y: number; color?: string; scale?: number; opacity?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
      <rect x={-46} y={-32} width={92} height={60} rx={8} fill={rgba(color, 0.08)} stroke={color} strokeWidth={4} />
      <path d="M -62 34 L 62 34 L 54 46 L -54 46 Z" fill={rgba(color, 0.25)} stroke={color} strokeWidth={3.5} strokeLinejoin="round" />
    </g>
  )
}

/** A glowing dot with a short fading trail travelling from a to b as p goes 0 → 1. */
export function Packet({ ax, ay, bx, by, p, color = C.yellow, r = 13, trail = 5, arc = 0 }: { ax: number; ay: number; bx: number; by: number; p: number; color?: string; r?: number; trail?: number; arc?: number }) {
  if (p <= 0 || p >= 1) return null
  const pt = (t: number) => {
    const x = lerp(ax, bx, t)
    const y = lerp(ay, by, t) - Math.sin(Math.PI * t) * arc
    return [x, y] as const
  }
  return (
    <g filter="url(#kglow)">
      {Array.from({ length: trail }).map((_, i) => {
        const t = Math.max(0, p - (i + 1) * 0.045)
        const [x, y] = pt(t)
        return <circle key={i} cx={x} cy={y} r={r * (1 - (i + 1) / (trail + 2))} fill={color} opacity={0.5 * (1 - i / trail)} />
      })}
      <circle cx={pt(p)[0]} cy={pt(p)[1]} r={r} fill={color} />
    </g>
  )
}

// --- syntax-coloured code ---------------------------------------------------------------

const TOKEN = /(\/\/.*$|`[^`]*`|'[^']*'|"[^"]*"|\b(?:SELECT|FROM|WHERE|IN|JOIN|ON|LIMIT|AND|ORDER|BY|const|let|for|of|await|return|async|function|if|new)\b|\b\d+\b|[A-Za-z_$][\w$]*(?=\()|=>)/g

function colorFor(tok: string) {
  if (tok.startsWith('//')) return C.grey
  if (/^[`'"]/.test(tok)) return C.teal
  if (/^\d+$/.test(tok)) return C.purple
  if (tok === '=>') return C.blue
  if (/^(SELECT|FROM|WHERE|IN|JOIN|ON|LIMIT|AND|ORDER|BY|const|let|for|of|await|return|async|function|if|new)$/.test(tok)) return C.blue
  return C.white
}

export function CodeLine({ text, dim = false, base = C.white }: { text: string; dim?: boolean; base?: string }) {
  const parts: ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(TOKEN)) {
    const i = m.index ?? 0
    if (i > last) parts.push(<span key={`p${i}`} style={{ color: base }}>{text.slice(last, i)}</span>)
    parts.push(<span key={`t${i}`} style={{ color: colorFor(m[0]) }}>{m[0]}</span>)
    last = i + m[0].length
  }
  if (last < text.length) parts.push(<span key="end" style={{ color: base }}>{text.slice(last)}</span>)
  return <span style={{ opacity: dim ? 0.38 : 1, whiteSpace: 'pre' }}>{parts}</span>
}

export type CodeRow = { t: string; hl?: number; hlColor?: string; reveal?: number; dim?: boolean; mark?: '+' | '-' }

/** A code card. Each row can carry a highlight amount (0-1) and a left-to-right reveal (0-1). */
export function CodeCard({ rows, x = 70, y, w = 940, size = 31, title, opacity = 1, style }: { rows: CodeRow[]; x?: number; y: number; w?: number; size?: number; title?: string; opacity?: number; style?: CSSProperties }) {
  return (
    <div
      style={{
        position: 'absolute', left: x, top: y, width: w, opacity, background: '#070B10', border: `2px solid ${C.dim}`, borderRadius: 26,
        padding: '22px 0 24px', fontFamily: mono, fontSize: size, lineHeight: 1.62, boxShadow: '0 30px 80px rgba(0,0,0,0.6)', ...style,
      }}
    >
      {title && <div style={{ fontFamily: mono, fontSize: 28, color: C.grey, padding: '0 30px 10px' }}>{title}</div>}
      {rows.map((r, i) => {
        const hl = r.hl ?? 0
        const col = r.hlColor ?? C.yellow
        const markColor = r.mark === '+' ? C.green : r.mark === '-' ? C.red : undefined
        return (
          <div
            key={i}
            style={{
              position: 'relative', padding: '0 30px', background: rgba(col, 0.13 * hl),
              boxShadow: hl > 0.02 ? `inset 6px 0 0 ${rgba(col, hl)}` : undefined,
              clipPath: r.reveal !== undefined ? `inset(-10% ${100 - r.reveal * 100}% -10% 0)` : undefined,
            }}
          >
            {markColor && <span style={{ color: markColor, marginRight: 10 }}>{r.mark}</span>}
            <CodeLine text={r.t} dim={r.dim} />
          </div>
        )
      })}
    </div>
  )
}

/** Big tabular number with a small label underneath. */
export function BigNum({ value, label, color = C.white, size = 150, x = 0, y, w = 1080, glowA = 0.35, opacity = 1, labelColor = C.grey, style }: { value: ReactNode; label?: ReactNode; color?: string; size?: number; x?: number; y: number; w?: number; glowA?: number; opacity?: number; labelColor?: string; style?: CSSProperties }) {
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, textAlign: 'center', fontFamily: sans, opacity, ...style }}>
      <div style={{ fontSize: size, fontWeight: 600, lineHeight: 1, letterSpacing: -size * 0.03, color, fontVariantNumeric: 'tabular-nums', textShadow: glowA ? `0 0 ${size * 0.4}px ${rgba(color.startsWith('#') ? color : C.white, glowA)}` : undefined }}>
        {value}
      </div>
      {label && <div style={{ marginTop: 14, fontSize: 34, color: labelColor }}>{label}</div>}
    </div>
  )
}

/** Small caps label. */
export function Tag({ children, color = C.grey, style }: { children: ReactNode; color?: string; style?: CSSProperties }) {
  return <div style={{ position: 'absolute', fontFamily: sans, fontSize: 28, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', color, ...style }}>{children}</div>
}

/** Serif italic line that writes on left-to-right and can fade out. */
export function Say({ children, from, out, top, size = 70, color = C.white, left = 70, right = 70, dur = 24, align = 'center' }: { children: ReactNode; from: number; out?: number; top: number; size?: number; color?: string; left?: number; right?: number; dur?: number; align?: 'center' | 'left' }) {
  const frame = useCurrentFrame()
  const p = prog(frame, from, from + dur, EASE_OUT) * 100
  const o = out === undefined ? 1 : 1 - prog(frame, out, out + 12)
  return (
    <div style={{ position: 'absolute', top, left, right, opacity: o, clipPath: `inset(-30% ${100 - p}% -30% 0)` }}>
      <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: size, lineHeight: 1.1, color, textAlign: align, letterSpacing: -0.5, textWrap: 'balance' }}>{children}</div>
    </div>
  )
}

/** Thousands separators without locale surprises. */
export const fmt = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')

/** Like useCue, but returns the frame of the nth (0-based) occurrence of a word in the current scene. */
export function useNthCue(word: string, nth: number, fallback = 0) {
  const s = useScene()
  const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9$%'-]/g, '')
  const hits = s.words.filter((w) => norm(w.text).startsWith(word.toLowerCase()))
  const w = hits[nth]
  return w ? Math.round((s.leadIn + w.start) * 30) : fallback
}
