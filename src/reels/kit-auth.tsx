// Shared drawing kit for the auth reels (jwt, hashing): eased progress, glows, scramble-decode text,
// code cards, drawn arrows and pills. Everything is frame-driven so it renders identically in Player and stills.
import type { CSSProperties, ReactNode } from 'react'
import { Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { C, mono, sans, serif } from './primitives'

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
export const EASE = Easing.bezier(0.45, 0, 0.15, 1)

/** Eased 0 -> 1 progress over [from, from + dur]. */
export function useP(from: number, dur = 20, easing = EASE) {
  const f = useCurrentFrame()
  return interpolate(f, [from, from + dur], [0, 1], { ...clamp, easing })
}

/** Spring 0 -> 1 starting at `from` (overshoots slightly, settles). */
export function useSpr(from: number, damping = 14, mass = 0.7) {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  return spring({ frame: f - from, fps, config: { damping, mass } })
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function hexToRgb(hex: string) {
  const h = hex.replace('#', '')
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number]
}

export function rgba(hex: string, a: number) {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r},${g},${b},${a})`
}

export function mixColor(a: string, b: string, t: number) {
  const x = hexToRgb(a)
  const y = hexToRgb(b)
  const k = Math.max(0, Math.min(1, t))
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * k)).join(',')})`
}

export const textGlow = (c: string, s = 1) => (s <= 0 ? 'none' : `0 0 ${18 * s}px ${rgba(c, 0.55 * Math.min(1, s))}, 0 0 ${48 * s}px ${rgba(c, 0.28 * Math.min(1, s))}`)
export const boxGlow = (c: string, s = 1) => (s <= 0 ? 'none' : `0 0 ${36 * s}px ${rgba(c, 0.38 * Math.min(1, s))}, inset 0 0 ${24 * s}px ${rgba(c, 0.1 * Math.min(1, s))}`)

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'

/** Left-to-right decode: characters resolve from `source` into `text` through a band of flickering glyphs. */
export function scrambleText(source: string, text: string, p: number, frame: number, seed = 's') {
  if (p <= 0) return source
  if (p >= 1) return text
  const n = Math.round(lerp(source.length, text.length, Math.min(1, p * 1.4)))
  const band = 7
  const cut = p * (n + band)
  let out = ''
  for (let i = 0; i < n; i++) {
    if (i < cut - band) out += text[i] ?? ''
    else if (i < cut) out += GLYPHS[Math.floor(random(`${seed}-${i}-${Math.floor(frame / 2)}`) * GLYPHS.length)]
    else out += source[i] ?? GLYPHS[Math.floor(random(`${seed}-r${i}`) * GLYPHS.length)]
  }
  return out
}

export function Scramble({ source, text, at, dur = 24, seed, style }: { source: string; text: string; at: number; dur?: number; seed?: string; style?: CSSProperties }) {
  const frame = useCurrentFrame()
  const p = interpolate(frame, [at, at + dur], [0, 1], clamp)
  return <span style={style}>{scrambleText(source, text, p, frame, seed ?? text)}</span>
}

/** Absolutely positioned element that springs in (fade + rise + slight scale) and can fade out. */
export function Pop({ at, out, children, style, rise = 26, from = 0.94 }: { at: number; out?: number; children: ReactNode; style?: CSSProperties; rise?: number; from?: number }) {
  const p = useSpr(at)
  const o = useP(out ?? 99999, 12)
  return (
    <div style={{ position: 'absolute', opacity: Math.min(1, p) * (1 - o), transform: `translateY(${(1 - p) * rise}px) scale(${from + (1 - from) * p})`, ...style }}>
      {children}
    </div>
  )
}

export function Pill({ color, children, style, glow = 0, fill = 0.08 }: { color: string; children: ReactNode; style?: CSSProperties; glow?: number; fill?: number }) {
  return (
    <div
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 14, padding: '12px 26px', borderRadius: 999,
        border: `3px solid ${color}`, color, fontFamily: sans, fontWeight: 600, fontSize: 34,
        background: `linear-gradient(${rgba(color, fill)}, ${rgba(color, fill)}), #05080C`, boxShadow: boxGlow(color, glow), whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

/** Small uppercase label used above boxes. */
export function Label({ color = C.grey, children, style }: { color?: string; children: ReactNode; style?: CSSProperties }) {
  return <div style={{ fontFamily: sans, fontWeight: 600, fontSize: 28, letterSpacing: 2.4, textTransform: 'uppercase', color, ...style }}>{children}</div>
}

/** A serif line that writes itself left-to-right, like Manim's Write(). */
export function SerifLine({ at, children, style, size = 64, color = C.white, dur = 22 }: { at: number; children: ReactNode; style?: CSSProperties; size?: number; color?: string; dur?: number }) {
  const p = useP(at, dur, Easing.inOut(Easing.cubic))
  return (
    <div style={{ position: 'absolute', fontFamily: serif, fontStyle: 'italic', fontSize: size, lineHeight: 1.12, color, letterSpacing: -0.5, clipPath: `inset(-30% ${(1 - p) * 100}% -30% 0)`, ...style }}>
      {children}
    </div>
  )
}

/** A line or gentle curve that draws itself, ending in an arrowhead. Coordinates are in composition space. */
export function Arrow({ x1, y1, x2, y2, at, dur = 16, color = C.grey, width = 4, bend = 0, head = 18, glow = 0, dash }: {
  x1: number; y1: number; x2: number; y2: number; at: number; dur?: number; color?: string; width?: number; bend?: number; head?: number; glow?: number; dash?: string
}) {
  const p = useP(at, dur)
  if (p <= 0) return null
  const mx = (x1 + x2) / 2 - (y2 - y1) * bend
  const my = (y1 + y2) / 2 + (x2 - x1) * bend
  const d = `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`
  const ang = Math.atan2(y2 - my, x2 - mx)
  const hp = interpolate(p, [0.75, 1], [0, 1], clamp)
  const hx = (a: number) => x2 - head * Math.cos(ang + a)
  const hy = (a: number) => y2 - head * Math.sin(ang + a)
  return (
    <svg viewBox="0 0 1080 1920" style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none', filter: glow ? `drop-shadow(0 0 ${10 * glow}px ${rgba(color, 0.7)})` : undefined }}>
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" pathLength={1} strokeDasharray={dash ? undefined : 1} strokeDashoffset={dash ? undefined : 1 - p} style={dash ? { strokeDasharray: dash, opacity: p } : undefined} />
      <path d={`M ${hx(0.45)} ${hy(0.45)} L ${x2} ${y2} L ${hx(-0.45)} ${hy(-0.45)}`} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" opacity={hp} />
    </svg>
  )
}

export type Seg = { t: string; c?: string }
export type CodeLine = { segs: Seg[]; kind?: 'add' | 'del' | 'ctx'; at: number; hl?: number; hlColor?: string; strike?: number }

// Light syntax colouring kept away from the semantic red/green: keywords purple, calls blue, strings warm white.
export const kw = (t: string): Seg => ({ t, c: C.purple })
export const fn = (t: string): Seg => ({ t, c: C.blue })
export const str = (t: string): Seg => ({ t, c: '#E8D9B0' })
export const pl = (t: string): Seg => ({ t, c: C.white })
export const dim = (t: string): Seg => ({ t, c: C.grey })

function CodeRow({ line }: { line: CodeLine }) {
  const frame = useCurrentFrame()
  const p = useP(line.at, 16)
  const hl = useP(line.hl ?? 1e6, 10, Easing.out(Easing.quad))
  const strike = useP(line.strike ?? 1e6, 14)
  const tone = line.kind === 'add' ? C.green : line.kind === 'del' ? C.red : null
  const hc = line.hlColor ?? C.yellow
  const sign = line.kind === 'add' ? '+' : line.kind === 'del' ? '-' : ' '
  return (
    <div
      style={{
        position: 'relative', whiteSpace: 'pre', borderRadius: 10, padding: '2px 14px', marginLeft: -14, marginRight: -14,
        background: tone ? rgba(tone, 0.12) : hl > 0 ? rgba(hc, 0.13 * hl) : 'transparent',
        boxShadow: hl > 0 ? `inset 5px 0 0 ${rgba(hc, hl)}, 0 0 ${30 * hl}px ${rgba(hc, 0.18 * hl)}` : 'none',
        clipPath: `inset(-10% ${(1 - p) * 100}% -10% 0)`,
        opacity: frame >= line.at ? 1 : 0,
      }}
    >
      <span style={{ color: tone ?? C.dim }}>{sign} </span>
      {line.segs.map((s, i) => (
        <span key={i} style={{ color: tone ? (s.c === C.grey ? rgba(tone, 0.7) : tone) : s.c ?? C.white }}>{s.t}</span>
      ))}
      {strike > 0 && <div style={{ position: 'absolute', left: 40, top: '52%', height: 4, width: `calc(${strike * 100}% - 60px)`, background: C.red, borderRadius: 2, boxShadow: `0 0 12px ${rgba(C.red, 0.8)}` }} />}
    </div>
  )
}

/** A slice of a Claude Code transcript: tool header, then code lines that wipe in at their own frames. */
export function CodeCard({ at, out, y, x = 70, w = 820, tool, lines, size = 29, glow }: { at: number; out?: number; y: number; x?: number; w?: number; tool: string; lines: CodeLine[]; size?: number; glow?: string }) {
  const p = useSpr(at, 16)
  const o = useP(out ?? 99999, 12)
  return (
    <div
      style={{
        position: 'absolute', top: y, left: x, width: w, opacity: Math.min(1, p) * (1 - o), transform: `translateY(${(1 - p) * 34}px) scale(${0.96 + 0.04 * p})`,
        background: '#090D12', border: `2px solid ${glow ?? C.dim}`, borderRadius: 26, padding: '26px 32px 24px', boxShadow: glow ? boxGlow(glow, 0.7) : '0 20px 60px rgba(0,0,0,0.6)',
        fontFamily: mono, fontSize: size, lineHeight: 1.55, overflow: 'hidden',
      }}
    >
      <div style={{ color: C.white, marginBottom: 10, fontSize: size - 3, whiteSpace: 'nowrap' }}>
        <span style={{ color: C.green }}>⏺</span> <span style={{ color: C.white }}>{tool}</span>
      </div>
      {lines.map((l, i) => (
        <CodeRow key={i} line={l} />
      ))}
    </div>
  )
}

/** Ticking number with thousands separators. */
export function fmt(n: number) {
  return Math.round(n).toLocaleString('en-US')
}

/** Tiny deterministic jitter, for glitch moments. */
export function jitter(frame: number, seed: string, amp: number) {
  return (random(`${seed}-${frame}`) - 0.5) * 2 * amp
}

export { C, mono, sans, serif }
