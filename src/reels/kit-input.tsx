import type { CSSProperties, ReactNode } from 'react'
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { C, mono } from './primitives'

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

/** Spring 0..1 that starts at frame `from`. */
export function springAt(frame: number, fps: number, from: number, damping = 14, mass = 0.7) {
  return spring({ frame: frame - from, fps, config: { damping, mass } })
}

/** A soft glowing rounded panel that pops in. Good for code and diagrams. */
export function Panel({
  from = 0,
  top,
  left = 70,
  right = 70,
  color = C.dim,
  glow,
  pad = '30px 34px',
  radius = 28,
  style,
  children,
}: {
  from?: number
  top: number
  left?: number
  right?: number
  color?: string
  glow?: string
  pad?: string
  radius?: number
  style?: CSSProperties
  children: ReactNode
}) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const p = springAt(frame, fps, from, 15)
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left,
        right,
        background: '#0A0E13',
        border: `2px solid ${color}`,
        borderRadius: radius,
        padding: pad,
        opacity: p,
        transform: `translateY(${(1 - p) * 34}px) scale(${0.97 + p * 0.03})`,
        boxShadow: glow ? `0 0 60px ${glow}` : '0 20px 60px rgba(0,0,0,0.5)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export type Tok = { t: string; c?: string }

/** One line of code made of coloured tokens. */
export function CodeLine({ toks, style }: { toks: Tok[]; style?: CSSProperties }) {
  return (
    <div style={{ fontFamily: mono, whiteSpace: 'pre-wrap', ...style }}>
      {toks.map((tk, i) => (
        <span key={i} style={{ color: tk.c ?? C.white }}>
          {tk.t}
        </span>
      ))}
    </div>
  )
}

/** A labelled chip that can glow and change colour. */
export function Tag({
  children,
  color,
  solid = false,
  size = 34,
  glow = false,
  style,
}: {
  children: ReactNode
  color: string
  solid?: boolean
  size?: number
  glow?: boolean
  style?: CSSProperties
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 24px',
        borderRadius: 16,
        border: `3px solid ${color}`,
        color: solid ? C.bg : color,
        background: solid ? color : 'rgba(0,0,0,0.55)',
        fontFamily: mono,
        fontWeight: 600,
        fontSize: size,
        boxShadow: glow ? `0 0 34px ${color}66` : 'none',
        transition: 'none',
        ...style,
      }}
    >
      {children}
    </span>
  )
}

/** A verdict box: label on top, TRUE/FALSE resolving in with colour. */
export function Verdict({
  label,
  value,
  reveal,
  frame,
  width = 360,
}: {
  label: ReactNode
  value: boolean
  reveal: number
  frame: number
  width?: number
}) {
  const shown = frame >= reveal
  const p = interpolate(frame, [reveal, reveal + 10], [0, 1], clamp)
  const col = !shown ? C.grey : value ? C.green : C.red
  return (
    <div
      style={{
        width,
        borderRadius: 18,
        border: `3px solid ${col}`,
        background: shown ? (value ? 'rgba(131,193,103,0.12)' : 'rgba(252,98,85,0.12)') : 'transparent',
        boxShadow: shown ? `0 0 34px ${col}44` : 'none',
        padding: '18px 22px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontFamily: mono, fontSize: 32, color: C.white }}>{label}</div>
      <div
        style={{
          fontFamily: mono,
          fontWeight: 700,
          fontSize: 44,
          color: col,
          marginTop: 10,
          opacity: shown ? p : 0.3,
          transform: `scale(${shown ? 0.9 + p * 0.1 : 0.9})`,
        }}
      >
        {shown ? (value ? 'TRUE' : 'FALSE') : '?'}
      </div>
    </div>
  )
}

/** A small browser window chrome with content inside. */
export function BrowserCard({
  x,
  y,
  w,
  h,
  scale = 1,
  color = C.blue,
  glow = false,
  children,
}: {
  x: number
  y: number
  w: number
  h: number
  scale?: number
  color?: string
  glow?: boolean
  children?: ReactNode
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        transform: `scale(${scale})`,
        transformOrigin: 'center',
        background: '#0A0E13',
        border: `3px solid ${color}`,
        borderRadius: 18,
        overflow: 'hidden',
        boxShadow: glow ? `0 0 44px ${color}66` : '0 14px 40px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ height: 34, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 14 }}>
        {[C.red, C.yellow, C.green].map((c) => (
          <div key={c} style={{ width: 11, height: 11, borderRadius: 999, background: c, opacity: 0.8 }} />
        ))}
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  )
}

/** A stylised database cylinder. */
export function DbCylinder({ x, y, w = 150, h = 180, color = C.blue, glow = false }: { x: number; y: number; w?: number; h?: number; color?: string; glow?: boolean }) {
  const ry = w * 0.22
  return (
    <g transform={`translate(${x} ${y})`} filter={glow ? 'url(#kglow)' : undefined}>
      <path d={`M ${-w / 2} ${-h / 2 + ry} v ${h - 2 * ry} a ${w / 2} ${ry} 0 0 0 ${w} 0 v ${-(h - 2 * ry)}`} fill="rgba(88,196,221,0.08)" stroke={color} strokeWidth={4} />
      <ellipse cx={0} cy={-h / 2 + ry} rx={w / 2} ry={ry} fill="#0A0E13" stroke={color} strokeWidth={4} />
      <ellipse cx={0} cy={-h / 2 + ry * 2.1} rx={w / 2} ry={ry} fill="none" stroke={color} strokeWidth={2} opacity={0.5} />
    </g>
  )
}

/** Fades/moves a dot along a straight line between two points as `p` goes 0..1. */
export function travel(ax: number, ay: number, bx: number, by: number, p: number) {
  return { x: ax + (bx - ax) * p, y: ay + (by - ay) * p }
}

/** SVG defs with a reusable glow filter id="kglow". Drop once per <svg>. */
export function GlowDefs({ std = 7 }: { std?: number }) {
  return (
    <defs>
      <filter id="kglow" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation={std} result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  )
}
