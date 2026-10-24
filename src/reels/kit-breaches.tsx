// Shared building blocks for the security-breach reels (rls, secrets) and the poll reel.
import type { CSSProperties, ReactNode } from 'react'
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { useScene, type Timeline } from './audio'
import { C, mono, sans, serif } from './primitives'

const FPS = 30
export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
const smooth = Easing.bezier(0.45, 0, 0.2, 1)

/** 0..1 eased progress between two frames */
export function ramp(frame: number, a: number, b: number, easing: (t: number) => number = smooth) {
  return interpolate(frame, [a, b], [0, 1], { ...clamp, easing })
}

export function useSpring(from: number, damping = 14, mass = 0.7) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  return spring({ frame: frame - from, fps, config: { damping, mass } })
}

export const mix = (a: number, b: number, p: number) => a + (b - a) * p

/** Hex colour with alpha, e.g. alpha(C.red, 0.3) */
export function alpha(color: string, a: number) {
  if (color.startsWith('rgb')) {
    const [r, g, b] = color.match(/[\d.]+/g)!.map(Number)
    return `rgba(${r},${g},${b},${a})`
  }
  const n = parseInt(color.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

/** Blend two hex colours, p = 0 gives a, p = 1 gives b */
export function blend(a: string, b: string, p: number) {
  const x = parseInt(a.slice(1), 16)
  const y = parseInt(b.slice(1), 16)
  const ch = (s: number) => Math.round(mix((x >> s) & 255, (y >> s) & 255, Math.min(1, Math.max(0, p))))
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9$%'.-]/g, '')

/** Absolute frame (reel timeline) when the nth occurrence of `word` is spoken in a scene. */
export function cueAt(t: Timeline, sceneId: string, word: string, fallbackRel = 0, nth = 0) {
  const s = t.byId[sceneId]
  const hits = s.words.filter((w) => norm(w.text).startsWith(word.toLowerCase()))
  const w = hits[Math.min(nth, hits.length - 1)]
  return s.from + (w ? Math.round((s.leadIn + w.start) * FPS) : fallbackRel)
}

/** Scene-relative cue lookup with an occurrence index, e.g. cue('vite', 120, 1) for the second "Vite". */
export function useCues() {
  const s = useScene()
  return (word: string, fallback = 0, nth = 0) => {
    const hits = s.words.filter((w) => norm(w.text).startsWith(word.toLowerCase()))
    const w = hits[Math.min(nth, hits.length - 1)]
    return w ? Math.round((s.leadIn + w.start) * FPS) : fallback
  }
}

/* ---------- syntax-coloured code ---------- */

const KW = new Set([
  'create', 'policy', 'on', 'for', 'select', 'using', 'alter', 'table', 'enable', 'row', 'level', 'security',
  'const', 'await', 'import', 'from', 'export', 'return', 'new', 'function', 'async', 'if', 'var', 'let',
])
type Tok = { t: string; c: string }

export function tokenize(code: string): Tok[] {
  const out: Tok[] = []
  const re = /('[^']*'?|"[^"]*"?|`[^`]*`?)|(\/\/.*$|--.*$)|(\b\d[\d,._]*\b)|([A-Za-z_$][\w$]*)|(\s+)|(.)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(code))) {
    const [all, str, cmt, num, id, ws] = m
    if (str) out.push({ t: all, c: C.green })
    else if (cmt) out.push({ t: all, c: C.grey })
    else if (num) out.push({ t: all, c: C.purple })
    else if (id) {
      const next = code[re.lastIndex]
      out.push({ t: all, c: KW.has(id.toLowerCase()) ? C.blue : next === '(' ? C.yellow : C.white })
    } else if (ws) out.push({ t: all, c: C.white })
    else out.push({ t: all, c: C.grey })
  }
  return out
}

/** One line of code, coloured, revealed up to `chars` characters. `marks` paint matching substrings. */
export function CodeLine({ text, chars = Infinity, size = 30, marks = [], style, color }: {
  text: string; chars?: number; size?: number; style?: CSSProperties; color?: string
  marks?: { text: string; color: string; glow?: number; bg?: number; ring?: number; ringColor?: string }[]
}) {
  const toks = tokenize(text)
  let used = 0
  const spans: ReactNode[] = []
  // Split tokens around marked substrings so a mark can span several tokens
  const markAt: ({ color: string; glow?: number; bg?: number; ring?: number; ringColor?: string } | null)[] = Array.from({ length: text.length }, () => null)
  for (const m of marks) {
    const i = text.indexOf(m.text)
    if (i >= 0) for (let k = i; k < i + m.text.length; k++) markAt[k] = m
  }
  let pos = 0
  toks.forEach((tok, ti) => {
    let run = ''
    let runMark: (typeof markAt)[number] = markAt[pos]
    const flush = (key: string) => {
      if (!run) return
      const visible = Math.max(0, Math.min(run.length, chars - used))
      used += run.length
      if (visible > 0) {
        const mk = runMark
        spans.push(
          <span key={key} style={{
            color: mk ? mk.color : color ?? tok.c,
            textShadow: mk?.glow ? `0 0 ${18 * mk.glow}px ${alpha(mk.color, 0.9 * mk.glow)}` : undefined,
            background: mk?.bg ? alpha(mk.color, 0.18 * mk.bg) : undefined,
            borderRadius: 6,
            outline: mk?.ring ? `4px solid ${alpha(mk.ringColor ?? C.yellow, mk.ring)}` : undefined,
            outlineOffset: mk?.ring ? 4 + 10 * (1 - mk.ring) : undefined,
            boxShadow: mk?.ring ? `0 0 ${30 * mk.ring}px ${alpha(mk.ringColor ?? C.yellow, 0.5 * mk.ring)}` : undefined,
          }}>
            {run.slice(0, visible)}
          </span>,
        )
      }
      run = ''
    }
    for (let k = 0; k < tok.t.length; k++) {
      const mk = markAt[pos + k]
      if (mk !== runMark) {
        flush(`${ti}-${k}`)
        runMark = mk
      }
      run += tok.t[k]
    }
    flush(`${ti}-end`)
    pos += tok.t.length
  })
  return <div style={{ fontFamily: mono, fontSize: size, lineHeight: 1.55, whiteSpace: 'pre', ...style }}>{spans}{chars < text.length && chars > 0 ? <span style={{ color: C.blue }}>▍</span> : null}</div>
}

/* ---------- frames and chips ---------- */

export function Panel({ x, y, w, h, color = C.dim, glow = 0, children, style, radius = 26, bg = '#0A0E13' }: {
  x: number; y: number; w: number; h?: number; color?: string; glow?: number; children?: ReactNode; style?: CSSProperties; radius?: number; bg?: string
}) {
  return (
    <div style={{
      position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: radius, background: bg,
      border: `3px solid ${color}`, boxShadow: glow > 0 ? `0 0 ${60 * glow}px ${alpha(color, 0.45 * glow)}` : 'none',
      boxSizing: 'border-box', ...style,
    }}>
      {children}
    </div>
  )
}

export function BrowserFrame({ x, y, w, h, url, color = C.dim, glow = 0, children, style }: {
  x: number; y: number; w: number; h: number; url: ReactNode; color?: string; glow?: number; children?: ReactNode; style?: CSSProperties
}) {
  return (
    <Panel x={x} y={y} w={w} h={h} color={color} glow={glow} style={{ overflow: 'hidden', ...style }}>
      <div style={{ height: 62, display: 'flex', alignItems: 'center', gap: 12, padding: '0 22px', borderBottom: `2px solid ${C.dim}`, background: '#0E141B' }}>
        {[C.red, C.yellow, C.green].map((c) => <span key={c} style={{ width: 16, height: 16, borderRadius: 8, background: c, opacity: 0.75 }} />)}
        <div style={{ marginLeft: 14, flex: 1, height: 38, borderRadius: 19, background: '#161E27', display: 'flex', alignItems: 'center', padding: '0 20px', fontFamily: mono, fontSize: 26, color: C.grey, whiteSpace: 'nowrap', overflow: 'hidden' }}>
          {url}
        </div>
      </div>
      <div style={{ position: 'relative', height: h - 62 - 6 }}>{children}</div>
    </Panel>
  )
}

export function Chip({ color, children, style, glow = 0, solid = false, size = 30 }: { color: string; children: ReactNode; style?: CSSProperties; glow?: number; solid?: boolean; size?: number }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 12, padding: '10px 22px', borderRadius: 999,
      border: `3px solid ${color}`, color: solid ? '#000' : color, background: solid ? color : alpha(color, 0.12),
      fontFamily: sans, fontWeight: 600, fontSize: size, whiteSpace: 'nowrap',
      boxShadow: glow > 0 ? `0 0 ${40 * glow}px ${alpha(color, 0.5 * glow)}` : 'none', ...style,
    }}>
      {children}
    </div>
  )
}

/** Big serif line used for takeaways */
export function Serif({ children, size = 72, color = C.white, style }: { children: ReactNode; size?: number; color?: string; style?: CSSProperties }) {
  return <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: size, lineHeight: 1.12, color, letterSpacing: -0.5, textAlign: 'center', ...style }}>{children}</div>
}

/* ---------- icons (stroke style, Manim-ish) ---------- */

type IconProps = { size?: number; color?: string; stroke?: number; style?: CSSProperties }

export function KeyIcon({ size = 40, color = C.yellow, stroke = 3.2, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={style} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13" cy="20" r="7" />
      <path d="M20 20h16M30 20v6M35 20v4" />
    </svg>
  )
}

export function LockIcon({ size = 40, color = C.green, open = 0, stroke = 3.2, style }: IconProps & { open?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={style} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="18" width="24" height="17" rx="4" />
      <path d={`M13 18v-5a7 7 0 0 1 14 0${open > 0.5 ? 'v-1' : 'v5'}`} transform={`translate(${open * 8} ${-open * 4})`} />
    </svg>
  )
}

export function UserGlyph({ size = 80, color = C.blue, fill = 0, style }: IconProps & { fill?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" style={style}>
      <circle cx="40" cy="27" r="14" fill={alpha(color, 0.2 * fill)} stroke={color} strokeWidth={4} />
      <path d="M14 70c2-15 13-23 26-23s24 8 26 23" fill={alpha(color, 0.2 * fill)} stroke={color} strokeWidth={4} strokeLinecap="round" />
    </svg>
  )
}

export function GlobeIcon({ size = 120, color = C.blue, spin = 0, style }: IconProps & { spin?: number }) {
  const r = 50
  return (
    <svg width={size} height={size} viewBox="-60 -60 120 120" style={style} fill="none" stroke={color} strokeWidth={3.5}>
      <circle r={r} />
      <path d={`M-${r} 0h${2 * r}`} />
      <path d="M-44 -24h88M-44 24h88" opacity={0.7} />
      {[0, 1, 2].map((i) => {
        const a = ((spin + i / 3) % 1) * Math.PI
        const rx = Math.abs(Math.cos(a)) * r
        return <ellipse key={i} rx={rx} ry={r} opacity={0.8} />
      })}
    </svg>
  )
}

export function GearIcon({ size = 70, color = C.blue, angle = 0, style }: IconProps & { angle?: number }) {
  const teeth = Array.from({ length: 8 }, (_, i) => i * 45)
  return (
    <svg width={size} height={size} viewBox="-40 -40 80 80" style={style} fill="none" stroke={color} strokeWidth={4} strokeLinejoin="round">
      <g transform={`rotate(${angle})`}>
        {teeth.map((a) => <rect key={a} x={-5} y={-34} width={10} height={10} rx={2} transform={`rotate(${a})`} fill={color} stroke="none" />)}
        <circle r={25} />
        <circle r={9} />
      </g>
    </svg>
  )
}

export function CheckIcon({ size = 40, color = C.green, p = 1, style }: IconProps & { p?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={style} fill="none" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21l8 8 16-17" strokeDasharray={40} strokeDashoffset={40 * (1 - p)} />
    </svg>
  )
}

export function CrossIcon({ size = 40, color = C.red, p = 1, style }: IconProps & { p?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={style} fill="none" stroke={color} strokeWidth={5} strokeLinecap="round">
      <path d="M10 10l20 20" strokeDasharray={29} strokeDashoffset={29 * (1 - Math.min(1, p * 2))} />
      <path d="M30 10l-20 20" strokeDasharray={29} strokeDashoffset={29 * (1 - Math.max(0, p * 2 - 1))} />
    </svg>
  )
}

/** Circular countdown ring; `left` is the fraction remaining */
export function TimerRing({ size = 56, color = C.teal, left = 1, style }: IconProps & { left?: number }) {
  const r = 22
  const len = 2 * Math.PI * r
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" style={style}>
      <circle cx="28" cy="28" r={r} fill="none" stroke={C.dim} strokeWidth={5} />
      <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth={5} strokeLinecap="round"
        strokeDasharray={len} strokeDashoffset={len * (1 - Math.max(0, left))} transform="rotate(-90 28 28)" />
    </svg>
  )
}

/* ---------- motion ---------- */

/** A glowing dot moving from (x1,y1) to (x2,y2) with eased progress p; fades at both ends */
export function Packet({ x1, y1, x2, y2, p, color = C.blue, size = 22, children }: { x1: number; y1: number; x2: number; y2: number; p: number; color?: string; size?: number; children?: ReactNode }) {
  if (p <= 0 || p >= 1) return null
  const e = Easing.inOut(Easing.cubic)(p)
  const x = mix(x1, x2, e)
  const y = mix(y1, y2, e)
  const o = Math.min(1, p * 6, (1 - p) * 6)
  return (
    <div style={{ position: 'absolute', left: x, top: y, transform: 'translate(-50%,-50%)', opacity: o }}>
      {children ?? <div style={{ width: size, height: size, borderRadius: size, background: color, boxShadow: `0 0 24px ${alpha(color, 0.9)}, 0 0 60px ${alpha(color, 0.5)}` }} />}
    </div>
  )
}

/** Straight connector drawn from a to b as p goes 0..1, with an optional arrow head */
export function Wire({ x1, y1, x2, y2, p = 1, color = C.grey, width = 4, dash, arrow = false, glow = 0 }: {
  x1: number; y1: number; x2: number; y2: number; p?: number; color?: string; width?: number; dash?: string; arrow?: boolean; glow?: number
}) {
  const len = Math.hypot(x2 - x1, y2 - y1)
  const ang = Math.atan2(y2 - y1, x2 - x1)
  const ex = mix(x1, x2, p)
  const ey = mix(y1, y2, p)
  const minX = Math.min(x1, x2) - 30
  const minY = Math.min(y1, y2) - 30
  const w = Math.abs(x2 - x1) + 60
  const h = Math.abs(y2 - y1) + 60
  return (
    <svg style={{ position: 'absolute', left: minX, top: minY, overflow: 'visible', filter: glow ? `drop-shadow(0 0 ${10 * glow}px ${alpha(color, 0.8)})` : undefined }} width={w} height={h}>
      <line x1={x1 - minX} y1={y1 - minY} x2={ex - minX} y2={ey - minY} stroke={color} strokeWidth={width} strokeLinecap="round"
        strokeDasharray={dash} opacity={p > 0 ? 1 : 0} />
      {arrow && p > 0.98 && (
        <path d="M0 0l-18 -10v20z" fill={color} transform={`translate(${x2 - minX} ${y2 - minY}) rotate(${(ang * 180) / Math.PI})`} />
      )}
      {len === 0 ? null : null}
    </svg>
  )
}

/** Scene title with a soft write-on, positioned in the top band */
export function Heading({ children, from = 0, top = 170, size = 70, color = C.white, out }: { children: ReactNode; from?: number; top?: number; size?: number; color?: string; out?: number }) {
  const frame = useCurrentFrame()
  const p = ramp(frame, from, from + 24)
  const o = out === undefined ? 1 : 1 - ramp(frame, out, out + 12)
  return (
    <div style={{ position: 'absolute', top, left: 80, right: 80, opacity: o, clipPath: `inset(-30% ${100 - p * 100}% -30% 0)` }}>
      <Serif size={size} color={color}>{children}</Serif>
    </div>
  )
}
