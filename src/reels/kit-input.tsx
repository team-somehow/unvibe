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
  trueColor = C.green,
  falseColor = C.red,
}: {
  label: ReactNode
  value: boolean
  reveal: number
  frame: number
  width?: number
  trueColor?: string
  falseColor?: string
}) {
  const shown = frame >= reveal
  const p = interpolate(frame, [reveal, reveal + 10], [0, 1], clamp)
  const col = !shown ? C.dim : value ? trueColor : falseColor
  return (
    <div
      style={{
        width,
        borderRadius: 18,
        border: `3px solid ${col}`,
        background: shown ? `${col}1f` : 'transparent',
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

// --- Drawn glyphs (no emoji: they render differently per platform and break the Manim look) ---------

/** Padlock centred on (x, y). closed: 0 = open shackle, 1 = shut. */
export function Padlock({ x, y, size = 64, closed, color, glow = 0, opacity = 1 }: { x: number; y: number; size?: number; closed: number; color: string; glow?: number; opacity?: number }) {
  const lift = (1 - closed) * 20
  return (
    <svg
      viewBox="0 0 100 110"
      style={{ position: 'absolute', left: x - size / 2, top: y - (size * 1.1) / 2, width: size, height: size * 1.1, overflow: 'visible', opacity, filter: glow ? `drop-shadow(0 0 ${14 * glow}px ${color})` : undefined }}
    >
      <path d="M 29 54 V 36 a 21 21 0 0 1 42 0 V 54" transform={`translate(0 ${-lift}) rotate(${(1 - closed) * -14} 29 54)`} fill="none" stroke={color} strokeWidth={10} strokeLinecap="round" />
      <rect x={12} y={50} width={76} height={58} rx={14} fill={color} />
      <circle cx={50} cy={74} r={8} fill="#000" />
      <rect x={46.5} y={76} width={7} height={16} rx={3.5} fill="#000" />
    </svg>
  )
}

/** Inline-SVG icon box: positions a 100x100 drawing at (x, y) centre with the given pixel size. */
function IconBox({ x, y, size, opacity = 1, glow, children, style }: { x?: number; y?: number; size: number; opacity?: number; glow?: string; children: ReactNode; style?: CSSProperties }) {
  const pos: CSSProperties = x !== undefined && y !== undefined ? { position: 'absolute', left: x - size / 2, top: y - size / 2 } : { display: 'inline-block', verticalAlign: 'middle' }
  return (
    <svg viewBox="0 0 100 100" style={{ ...pos, width: size, height: size, overflow: 'visible', opacity, filter: glow ? `drop-shadow(0 0 12px ${glow})` : undefined, ...style }}>
      {children}
    </svg>
  )
}

/** A session cookie: round biscuit with chips. */
export function CookieIcon({ x, y, size = 60, color = C.yellow, opacity, glow, style }: { x?: number; y?: number; size?: number; color?: string; opacity?: number; glow?: boolean; style?: CSSProperties }) {
  return (
    <IconBox x={x} y={y} size={size} opacity={opacity} glow={glow ? color : undefined} style={style}>
      <path d="M 50 8 A 42 42 0 1 0 92 52 A 14 14 0 0 1 74 36 A 14 14 0 0 1 60 18 A 12 12 0 0 1 50 8 Z" fill="rgba(244,211,94,0.12)" stroke={color} strokeWidth={7} strokeLinejoin="round" />
      {[[34, 40], [56, 62], [32, 68], [66, 44]].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={6} fill={color} />
      ))}
    </IconBox>
  )
}

/** Shield outline with an optional check mark. */
export function ShieldIcon({ x, y, size = 70, color = C.green, check = 1, fill = 0.12, opacity, glow, style }: { x?: number; y?: number; size?: number; color?: string; check?: number; fill?: number; opacity?: number; glow?: boolean; style?: CSSProperties }) {
  return (
    <IconBox x={x} y={y} size={size} opacity={opacity} glow={glow ? color : undefined} style={style}>
      <path d="M 50 6 C 64 15 78 18 90 18 C 90 52 78 78 50 94 C 22 78 10 52 10 18 C 22 18 36 15 50 6 Z" fill={`${color}${Math.round(fill * 255).toString(16).padStart(2, '0')}`} stroke={color} strokeWidth={7} strokeLinejoin="round" />
      {check > 0 && <path d="M 32 50 L 45 63 L 69 37" fill="none" stroke={color} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${check} 1`} />}
    </IconBox>
  )
}

/** Hooded attacker. */
export function AttackerIcon({ x, y, size = 80, color = C.red, opacity, glow, style }: { x?: number; y?: number; size?: number; color?: string; opacity?: number; glow?: boolean; style?: CSSProperties }) {
  return (
    <IconBox x={x} y={y} size={size} opacity={opacity} glow={glow ? color : undefined} style={style}>
      <path d="M 50 6 C 26 6 16 26 16 46 L 16 70 C 16 78 10 86 6 94 L 94 94 C 90 86 84 78 84 70 L 84 46 C 84 26 74 6 50 6 Z" fill="rgba(252,98,85,0.14)" stroke={color} strokeWidth={6} strokeLinejoin="round" />
      <path d="M 30 50 C 30 34 38 26 50 26 C 62 26 70 34 70 50 C 70 64 62 72 50 72 C 38 72 30 64 30 50 Z" fill="#000" stroke={color} strokeWidth={4} />
      <circle cx={41} cy={50} r={4.5} fill={color} />
      <circle cx={59} cy={50} r={4.5} fill={color} />
    </IconBox>
  )
}

/** Simple person bust (head + shoulders). */
export function PersonIcon({ x, y, size = 70, color = C.white, opacity, glow, style }: { x?: number; y?: number; size?: number; color?: string; opacity?: number; glow?: boolean; style?: CSSProperties }) {
  return (
    <IconBox x={x} y={y} size={size} opacity={opacity} glow={glow ? color : undefined} style={style}>
      <circle cx={50} cy={34} r={18} fill="none" stroke={color} strokeWidth={6} />
      <path d="M 16 90 C 16 68 32 58 50 58 C 68 58 84 68 84 90" fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" />
    </IconBox>
  )
}

/** Lightning bolt: "this code runs". */
export function BoltIcon({ x, y, size = 50, color = C.red, opacity, glow, style }: { x?: number; y?: number; size?: number; color?: string; opacity?: number; glow?: boolean; style?: CSSProperties }) {
  return (
    <IconBox x={x} y={y} size={size} opacity={opacity} glow={glow ? color : undefined} style={style}>
      <path d="M 58 4 L 20 56 L 46 56 L 38 96 L 80 40 L 54 40 Z" fill={color} stroke={color} strokeWidth={3} strokeLinejoin="round" />
    </IconBox>
  )
}

/** Cross in a circle: "blocked". */
export function BlockedIcon({ x, y, size = 44, color = C.red, opacity, style }: { x?: number; y?: number; size?: number; color?: string; opacity?: number; style?: CSSProperties }) {
  return (
    <IconBox x={x} y={y} size={size} opacity={opacity} style={style}>
      <circle cx={50} cy={50} r={40} fill="rgba(252,98,85,0.15)" stroke={color} strokeWidth={8} />
      <path d="M 34 34 L 66 66 M 66 34 L 34 66" stroke={color} strokeWidth={9} strokeLinecap="round" />
    </IconBox>
  )
}

/** "⏺ Claude caught this in …" pill, same look as the other reels' hook chips. */
export function ClaudeChip({ top, children, p, left = 70, width = 820 }: { top: number; children: ReactNode; p: number; left?: number; width?: number }) {
  return (
    <div style={{ position: 'absolute', top, left, width, display: 'flex', justifyContent: 'center', opacity: Math.min(1, p), transform: `translateY(${(1 - p) * 20}px)` }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14, padding: '14px 28px', borderRadius: 999, border: `2px solid ${C.dim}`, background: '#0A0E13', fontFamily: 'Geist, system-ui, sans-serif', fontSize: 32, color: C.white, whiteSpace: 'nowrap' }}>
        <span style={{ color: C.green }}>⏺</span> {children}
      </div>
    </div>
  )
}
