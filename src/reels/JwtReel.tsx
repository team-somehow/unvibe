import type { ReactNode } from 'react'
import { Sequence, useCurrentFrame } from 'remotion'
import { C, Fade, Stage, Title, mono, serif, usePop } from './primitives'

const PARTS = [
  { text: 'eyJhbGciOiJIUzI1NiJ9', color: C.red, name: 'header' },
  { text: 'eyJzdWIiOiI0MiIsInJvbGUiOiJ1c2VyIn0', color: C.purple, name: 'payload' },
  { text: 'kX3pQ9vT0aZr8mW1bLc6yNf2', color: C.blue, name: 'signature' },
]

function Box({ at, color, label, y, children }: { at: number; color: string; label: string; y: number; children: ReactNode }) {
  const p = usePop(at)
  return (
    <div style={{ position: 'absolute', top: y, left: 90, right: 90, opacity: p, transform: `translateX(${(1 - p) * -40}px)`, border: `3px solid ${color}`, borderRadius: 22, padding: '20px 28px', background: '#000' }}>
      <div style={{ fontSize: 26, color, marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: mono, fontSize: 32, color: C.white }}>{children}</div>
    </div>
  )
}

function Decode() {
  return (
    <>
      <Title from={0} top={170} size={72}>Your login token is signed, not secret</Title>
      <div style={{ position: 'absolute', top: 430, left: 90, right: 90, fontFamily: mono, fontSize: 34, lineHeight: 1.5, wordBreak: 'break-all' }}>
        {PARTS.map((p, i) => (
          <Fade key={p.name} from={20 + i * 12} style={{ position: 'relative' }}>
            <span style={{ color: p.color }}>{p.text}</span>
            {i < 2 && <span style={{ color: C.white }}>.</span>}
          </Fade>
        ))}
      </div>
      <Box at={80} color={C.red} label="header, base64-decoded" y={720}>{'{ "alg": "HS256" }'}</Box>
      <Box at={95} color={C.purple} label="payload, base64-decoded" y={880}>{'{ "sub": "42", "role": "user" }'}</Box>
      <Box at={110} color={C.blue} label="signature" y={1040}>HMAC(header.payload, secret)</Box>
      <Fade from={140} style={{ top: 1250, left: 80, right: 80, textAlign: 'center', fontFamily: serif, fontStyle: 'italic', fontSize: 48, color: C.yellow, lineHeight: 1.2 }}>
        Base64 is an encoding. Anyone holding the token can read it.
      </Fade>
    </>
  )
}

function Tamper() {
  const frame = useCurrentFrame()
  const edited = frame > 60
  const x = usePop(120)
  return (
    <>
      <Title from={0} top={170} size={72} color={C.red}>So what if someone edits it?</Title>
      <div style={{ position: 'absolute', top: 470, left: 90, right: 90, border: `3px solid ${C.purple}`, borderRadius: 22, padding: '26px 30px', fontFamily: mono, fontSize: 34, color: C.white }}>
        {'{ "sub": "42", "role": '}
        {edited ? (
          <>
            <span style={{ color: C.grey, textDecoration: 'line-through' }}>"user"</span> <span style={{ color: C.red }}>"admin"</span>
          </>
        ) : (
          <span>"user"</span>
        )}
        {' }'}
      </div>
      <Fade from={80} style={{ top: 720, left: 90, right: 90, fontSize: 34, color: C.white, lineHeight: 1.6 }}>
        server recomputes <span style={{ fontFamily: mono, color: C.blue }}>HMAC(header.payload, secret)</span>
      </Fade>
      <div style={{ position: 'absolute', top: 880, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: x, transform: `scale(${0.6 + x * 0.4})` }}>
        <div style={{ width: 260, height: 260, borderRadius: '50%', border: `8px solid ${C.red}`, display: 'grid', placeItems: 'center', fontSize: 150, color: C.red, lineHeight: 1 }}>✕</div>
      </div>
      <Fade from={140} style={{ top: 1180, left: 80, right: 80, textAlign: 'center', fontSize: 40, fontWeight: 600, color: C.red }}>
        Signature doesn't match. 401.
      </Fade>
      <Fade from={185} style={{ top: 1290, left: 80, right: 80, textAlign: 'center', fontFamily: serif, fontStyle: 'italic', fontSize: 46, color: C.green, lineHeight: 1.25 }}>
        So Claude verifies the signature on every request, and keeps secrets out of the payload.
      </Fade>
    </>
  )
}

export function JwtReel() {
  return (
    <Stage>
      <Sequence durationInFrames={240}>
        <Decode />
      </Sequence>
      <Sequence from={240} durationInFrames={290}>
        <Tamper />
      </Sequence>
    </Stage>
  )
}

export const JWT_REEL_FRAMES = 530
