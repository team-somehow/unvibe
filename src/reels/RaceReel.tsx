import type { ReactNode } from 'react'
import { Sequence, useCurrentFrame } from 'remotion'
import { C, Fade, Stage, Title, TranscriptCard, sans, serif, usePop } from './primitives'

function Step({ at, x, y, color = C.white, children }: { at: number; x: number; y: number; color?: string; children: ReactNode }) {
  const p = usePop(at)
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: 400, opacity: p, transform: `translateY(${(1 - p) * 24}px)`, border: `3px solid ${color}`, borderRadius: 18, padding: '18px 22px', fontSize: 30, color, background: '#000', fontFamily: sans, lineHeight: 1.35 }}>
      {children}
    </div>
  )
}

function Balance({ value, flash }: { value: string; flash?: boolean }) {
  return (
    <div style={{ position: 'absolute', top: 400, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
      <div style={{ border: `4px solid ${flash ? C.red : C.yellow}`, borderRadius: 24, padding: '20px 48px', textAlign: 'center', background: flash ? 'rgba(252,98,85,0.12)' : 'transparent' }}>
        <div style={{ fontSize: 30, color: C.grey }}>wallet balance</div>
        <div style={{ fontSize: 88, fontWeight: 600, color: flash ? C.red : C.yellow, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      </div>
    </div>
  )
}

function Lanes() {
  return (
    <>
      <div style={{ position: 'absolute', top: 650, left: 90, width: 400, textAlign: 'center', fontSize: 34, fontWeight: 600, color: C.blue }}>Request A</div>
      <div style={{ position: 'absolute', top: 650, left: 590, width: 400, textAlign: 'center', fontSize: 34, fontWeight: 600, color: C.purple }}>Request B</div>
      <div style={{ position: 'absolute', top: 710, left: 289, width: 3, height: 640, background: C.dim }} />
      <div style={{ position: 'absolute', top: 710, left: 789, width: 3, height: 640, background: C.dim }} />
    </>
  )
}

function Bug() {
  const frame = useCurrentFrame()
  const value = frame < 110 ? '$100' : '$20'
  return (
    <>
      <Title from={0} top={170} size={70}>Two taps on "Pay $80". One $100 wallet.</Title>
      <Balance value={value} flash={frame > 200} />
      <Lanes />
      <Step at={40} x={90} y={740}>reads balance: $100</Step>
      <Step at={65} x={590} y={850}>reads balance: $100</Step>
      <Step at={100} x={90} y={960} color={C.yellow}>writes 100 − 80 = $20</Step>
      <Step at={135} x={590} y={1070} color={C.yellow}>writes 100 − 80 = $20</Step>
      <Step at={165} x={90} y={1180} color={C.green}>charged $80</Step>
      <Step at={175} x={590} y={1180} color={C.green}>charged $80</Step>
      <Fade from={205} style={{ top: 1400, left: 70, right: 70, textAlign: 'center', fontSize: 44, fontWeight: 600, color: C.red }}>
        $160 spent from $100
      </Fade>
    </>
  )
}

function Fix() {
  const frame = useCurrentFrame()
  const value = frame < 150 ? '$100' : '$20'
  const waiting = frame > 120 && frame < 185
  return (
    <>
      <Title from={0} top={170} size={70} color={C.green}>Claude's fix: lock the row first</Title>
      <TranscriptCard from={6} top={370} out={92} tool="Update(src/payments/charge.ts)"
        lines={[{ t: '+ SELECT balance FROM wallets', kind: 'add' }, { t: '+   WHERE id = $1 FOR UPDATE', kind: 'add' }]} />
      <Sequence from={100}>
        <Balance value={value} />
        <Lanes />
        <Step at={10} x={90} y={740} color={C.yellow}>🔒 locks row, reads $100</Step>
        <Step at={20} x={590} y={740} color={C.grey}>
          {waiting ? `waiting for lock${'.'.repeat(1 + (Math.floor(frame / 8) % 3))}` : 'got the lock'}
        </Step>
        <Step at={45} x={90} y={870} color={C.green}>writes $20, unlocks</Step>
        <Step at={90} x={590} y={870} color={C.yellow}>reads $20</Step>
        <Step at={110} x={590} y={1000} color={C.red}>declined: not enough funds</Step>
      </Sequence>
      <Fade from={235} style={{ top: 1380, left: 70, right: 70, textAlign: 'center', fontFamily: serif, fontStyle: 'italic', fontSize: 50, color: C.white, lineHeight: 1.2 }}>
        One request wins. The other waits, then sees the real balance.
      </Fade>
    </>
  )
}

export function RaceReel() {
  return (
    <Stage>
      <Sequence durationInFrames={265}>
        <Bug />
      </Sequence>
      <Sequence from={265} durationInFrames={320}>
        <Fix />
      </Sequence>
    </Stage>
  )
}

export const RACE_REEL_FRAMES = 585
