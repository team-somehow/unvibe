import type { CSSProperties, ReactNode } from 'react'
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'

// Manim's palette, so reels read like a 3Blue1Brown explainer
export const C = {
  bg: '#000000',
  white: '#ECEFF3',
  grey: '#6B7785',
  dim: '#3A434E',
  blue: '#58C4DD',
  yellow: '#F4D35E',
  green: '#83C167',
  red: '#FC6255',
  purple: '#9A72AC',
  teal: '#5CD0B3',
}

export const serif = '"Newsreader", Georgia, serif'
export const sans = '"Geist", system-ui, sans-serif'
export const mono = '"Geist Mono", ui-monospace, monospace'

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

export function useFade(from: number, dur = 14) {
  const frame = useCurrentFrame()
  return interpolate(frame, [from, from + dur], [0, 1], clamp)
}

export function useFadeOut(at: number, dur = 12) {
  const frame = useCurrentFrame()
  return interpolate(frame, [at, at + dur], [1, 0], clamp)
}

export function usePop(from: number, damping = 13) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  return spring({ frame: frame - from, fps, config: { damping, mass: 0.6 } })
}

export function useTween(from: number, to: number, a = 0, b = 1) {
  const frame = useCurrentFrame()
  return interpolate(frame, [from, to], [a, b], { ...clamp, easing: Easing.inOut(Easing.cubic) })
}

export function Stage({ children, grid = true }: { children: ReactNode; grid?: boolean }) {
  return (
    <AbsoluteFill
      style={{
        background: C.bg,
        backgroundImage: grid
          ? 'linear-gradient(rgba(88,196,221,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(88,196,221,0.06) 1px, transparent 1px)'
          : undefined,
        backgroundSize: '90px 90px',
        backgroundPosition: '-1px -1px',
        fontFamily: sans,
        color: C.white,
      }}
    >
      {children}
    </AbsoluteFill>
  )
}

// Left-to-right reveal, like Manim's Write()
export function Write({ children, from, dur = 22, style }: { children: ReactNode; from: number; dur?: number; style?: CSSProperties }) {
  const p = useTween(from, from + dur, 0, 100)
  return <div style={{ clipPath: `inset(-20% ${100 - p}% -20% 0)`, ...style }}>{children}</div>
}

export function Title({ children, from = 0, top = 200, size = 78, color = C.white, out }: { children: ReactNode; from?: number; top?: number; size?: number; color?: string; out?: number }) {
  const o = useFadeOut(out ?? 99999)
  return (
    <div style={{ position: 'absolute', top, left: 70, right: 70, opacity: o }}>
      <Write from={from} dur={26}>
        <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: size, lineHeight: 1.08, color, textAlign: 'center', letterSpacing: -0.5 }}>
          {children}
        </div>
      </Write>
    </div>
  )
}

export function Fade({ from, out, children, style }: { from: number; out?: number; children: ReactNode; style?: CSSProperties }) {
  const i = useFade(from)
  const o = useFadeOut(out ?? 99999)
  return <div style={{ position: 'absolute', opacity: i * o, transform: `translateY(${(1 - i) * 16}px)`, ...style }}>{children}</div>
}

export function Typed({ text, from, speed = 1.4, caret = true }: { text: string; from: number; speed?: number; caret?: boolean }) {
  const frame = useCurrentFrame()
  const n = Math.max(0, Math.floor((frame - from) * speed))
  const done = n >= text.length
  return (
    <>
      {text.slice(0, n)}
      {caret && frame >= from && !done && <span style={{ color: C.blue }}>▍</span>}
    </>
  )
}

type Line = { t: string; kind?: 'add' | 'del' | 'ctx' }

// A slice of a Claude Code transcript: the tool call header, then the diff lines typing in
export function TranscriptCard({ from, tool, lines, top = 360, out }: { from: number; tool: string; lines: Line[]; top?: number; out?: number }) {
  const pop = usePop(from, 16)
  const o = useFadeOut(out ?? 99999)
  let start = from + 14
  return (
    <div
      style={{
        position: 'absolute', top, left: 70, right: 70, opacity: pop * o,
        transform: `translateY(${(1 - pop) * 40}px) scale(${0.96 + pop * 0.04})`,
        background: '#0A0E13', border: `2px solid ${C.dim}`, borderRadius: 30, padding: '34px 38px',
        fontFamily: mono, fontSize: 31, lineHeight: 1.55,
      }}
    >
      <div style={{ color: C.white, marginBottom: 14 }}>
        <span style={{ color: C.green }}>⏺</span> {tool}
      </div>
      {lines.map((l, i) => {
        const s = start
        start += Math.ceil(l.t.length / 1.6) + 4
        const color = l.kind === 'add' ? C.green : l.kind === 'del' ? C.red : C.grey
        const bg = l.kind === 'add' ? 'rgba(131,193,103,0.10)' : l.kind === 'del' ? 'rgba(252,98,85,0.10)' : 'transparent'
        return (
          <div key={i} style={{ color, background: bg, borderRadius: 8, padding: '0 10px', whiteSpace: 'pre-wrap' }}>
            <Typed text={l.t} from={s} speed={1.6} caret={false} />
            &nbsp;
          </div>
        )
      })}
    </div>
  )
}

export function Chip({ children, color, style }: { children: ReactNode; color: string; style?: CSSProperties }) {
  return (
    <div
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 14, padding: '14px 26px', borderRadius: 999,
        border: `3px solid ${color}`, color, fontFamily: sans, fontWeight: 600, fontSize: 34, background: 'rgba(0,0,0,0.6)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
