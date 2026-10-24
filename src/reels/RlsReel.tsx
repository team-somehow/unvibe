import { Sequence, interpolate, useCurrentFrame } from 'remotion'
import { Captions, ReelAudio, Scene, Sfx, buildTimeline, type Manifest } from './audio'
import manifest from './audio/rls.json'
import {
  BrowserFrame, CheckIcon, Chip, CodeLine, CrossIcon, Heading, KeyIcon, LockIcon, Packet, Panel, UserGlyph, Wire,
  alpha, blend, clamp, cueAt, ramp, useCues, useSpring,
} from './kit-breaches'
import { C, Stage, mono, sans } from './primitives'
import script from './scripts/rls.json'

const T = buildTimeline(script, manifest as unknown as Manifest)
export const RLS_REEL_FRAMES = T.total
const S = T.byId

/* ---------------- hook: every profile, handed out ---------------- */

const COLS = 5
const GRID_ROWS = 4

function Hook() {
  const frame = useCurrentFrame()
  const cue = useCues()
  const appear = cue('supabase', 63)
  const handed = cue('handed', 102)
  const every = cue('every', 113)
  const claude = cue('claude', 198)
  // The table fills in before the narration starts (so the poster frame is a full composition),
  // then turns red as the profiles are handed out
  const count = Math.round(interpolate(frame, [12, 46], [0, 4812], { ...clamp, easing: (t) => 1 - Math.pow(1 - t, 3) }))
  const counter = useSpring(8, 16)
  const exposed = ramp(frame, handed - 2, every + 10)
  const flag = useSpring(claude - 3, 12)
  return (
    <>
      <div style={{ position: 'absolute', top: 150, left: 0, right: 0, textAlign: 'center', fontFamily: mono, fontSize: 28, letterSpacing: 6, color: C.grey, opacity: ramp(frame, 0, 14) }}>
        CASE 0417 · PROFILES TABLE
      </div>
      <Heading from={4} top={210} size={88}>Nobody broke in.</Heading>
      {Array.from({ length: COLS * GRID_ROWS }).map((_, i) => {
        const col = i % COLS
        const row = Math.floor(i / COLS)
        const x = 120 + col * 156 + 78
        const y = 470 + row * 140
        const pop = ramp(frame, Math.min(6, appear - 30) + i * 1.1, Math.min(20, appear - 14) + i * 1.1)
        // red ripple spreads from the top-left as the profiles are handed out
        const d = Math.hypot(col, row)
        const red = ramp(frame, handed + d * 6, handed + d * 6 + 10)
        const fly = ramp(frame, handed + d * 6 + 2, handed + d * 6 + 34)
        return (
          <div key={i}>
            <div style={{ position: 'absolute', left: x - 48, top: y - 48, opacity: pop, transform: `scale(${0.6 + 0.4 * pop})` }}>
              <UserGlyph size={96} color={blend(C.blue, C.red, red)} fill={red} />
            </div>
            {/* a little profile card lifts off each user */}
            {fly > 0 && fly < 1 && (
              <div style={{
                position: 'absolute', left: x - 26, top: y - 30 - fly * 90, width: 52, height: 34, borderRadius: 7,
                border: `3px solid ${C.red}`, background: alpha(C.red, 0.25), opacity: Math.min(1, (1 - fly) * 2),
                boxShadow: `0 0 18px ${alpha(C.red, 0.6)}`,
              }} />
            )}
          </div>
        )
      })}
      <div style={{ position: 'absolute', top: 1040, left: 120, width: 780, textAlign: 'center', opacity: counter, transform: `translateY(${(1 - counter) * 20}px)` }}>
        <div style={{ fontFamily: sans, fontWeight: 600, fontSize: 132, lineHeight: 1, letterSpacing: -4, color: blend(C.blue, C.red, exposed), fontVariantNumeric: 'tabular-nums', textShadow: `0 0 60px ${alpha(exposed > 0.5 ? C.red : C.blue, 0.2 + 0.2 * exposed)}`, transform: `scale(${1 + 0.06 * Math.sin(exposed * Math.PI)})` }}>
          {count.toLocaleString('en-US')}
        </div>
        <div style={{ position: 'relative', height: 50, marginTop: 14, fontFamily: sans, fontSize: 38 }}>
          <div style={{ position: 'absolute', left: 0, right: 0, color: C.grey, opacity: 1 - exposed }}>profiles in your table</div>
          <div style={{ position: 'absolute', left: 0, right: 0, color: C.white, opacity: exposed }}>profiles, readable by <span style={{ color: C.red }}>anyone</span></div>
        </div>
      </div>
      <div style={{ position: 'absolute', top: 1300, left: 120, width: 780, display: 'flex', justifyContent: 'center', opacity: flag, transform: `scale(${0.85 + 0.15 * flag})` }}>
        <Chip color={C.yellow} glow={flag}>
          <span style={{ width: 16, height: 16, borderRadius: 8, background: C.yellow }} />
          Claude caught it: RLS was off
        </Chip>
      </div>
      <Sfx t={T} name="sting" at={6} volume={0.22} />
      <Sfx t={T} name="ding" at={claude - 2} volume={0.9} />
    </>
  )
}

/* ---------------- the case: browser, policy gate, profiles table ---------------- */

const BX = 70, BY = 320, BW = 820, BH = 280
const GATE = { x: 90, y: 648, w: 780, h: 132 }
const TX = 70, TY = 910, TW = 820
const ROW_H = 60, ROW_GAP = 8, HEAD_H = 76
const WIRE_X = 480
const PROFILES = ['amara.o@gmail.com', 'ben@kirbylabs.io', 'you@yourapp.com', 'chen.wei@outlook.com', 'd.okafor@proton.me']
const ME = 2
const rowY = (i: number) => TY + HEAD_H + 12 + i * (ROW_H + ROW_GAP)
const rowX = (i: number) => 200 + i * 140

const QUERY = "> supabase.from('profiles').select('*')"
const POLICY = ['create policy "own row" on profiles', 'for select using (auth.uid() = id);']

function Case() {
  const frame = useCurrentFrame()
  const base = S.key.from
  const at = (scene: string, word: string, fb: number, nth = 0) => cueAt(T, scene, word, fb, nth) - base
  const rel = (scene: string) => S[scene].from - base

  // key scene
  const kTable = at('key', 'supabase', 45) - 6
  const kWire = at('key', 'directly', 61)
  const kAnon = at('key', 'anon', 92)
  const kSend = at('key', 'key', 101)
  const kPublic = at('key', 'public', 143)
  const kFine = at('key', 'fine', 192)
  // leak scene
  const lRow = at('leak', 'row', 51)
  const lOff = at('leak', 'off', 97)
  const lType = at('leak', 'one', 130)
  const lRet = at('leak', 'returned', 177)
  const lEvery = at('leak', 'everyone', 191)
  // policy scene
  const pOn = at('policy', 'on', 31)
  const pPolicy = at('policy', 'policy', 56)
  const pUser = at('policy', 'each', 83)
  const pId = at('policy', 'id', 142)
  // filter scene
  const fQuery = at('filter', 'same', 8)
  const fKey = at('filter', 'same', 40, 1)
  const fRet = at('filter', 'returns', 94)
  const fOne = at('filter', 'one', 122)
  const fYours = at('filter', 'yours', 152)
  const end = rel('filter') + S.filter.durationInFrames

  const fadeIn = ramp(frame, 0, 12)
  const fadeOut = 1 - ramp(frame, end, end + 9, (t) => t)
  const browser = useSpring(2, 16)
  const table = useSpring(kTable, 16)
  const wire = ramp(frame, kWire - 8, kWire + 14)

  // RLS state: 0 unknown, then off (red), then on (green)
  const offP = ramp(frame, lOff - 4, lOff + 6)
  const onP = ramp(frame, pOn - 2, pOn + 10)
  const badgeIn = ramp(frame, lRow - 6, lRow + 8)
  const rlsColor = onP > 0 ? blend(C.red, C.green, onP) : blend(C.yellow, C.red, offP)
  const lockPop = useSpring(pOn, 10)

  const leakWave = (i: number) => ramp(frame, lRet + i * 4, lRet + i * 4 + 8) * (1 - onP)
  const gate = useSpring(pPolicy - 4, 15)
  const matchP = ramp(frame, pId - 4, pId + 8)
  const yours = ramp(frame, fYours - 6, fYours + 8)

  // browser body content by phase
  const phaseKey = 1 - ramp(frame, rel('leak') - 4, rel('leak') + 10)
  const leakConsole = ramp(frame, lType - 8, lType) * (1 - ramp(frame, rel('policy') - 2, rel('policy') + 10))
  const filterConsole = ramp(frame, fQuery - 8, fQuery)
  const typed1 = Math.floor((frame - lType) * 2)
  const typed2 = Math.floor((frame - fQuery) * 2.6)
  const result1 = useSpring(lEvery - 6, 14)
  const result2 = useSpring(fOne - 4, 14)
  const signedIn = useSpring(pUser - 4, 14)
  const publicBadge = useSpring(kPublic - 2, 12) * (1 - ramp(frame, lRow, lRow + 12))
  const keyPulse = frame >= fKey - 4 ? Math.max(0, Math.sin(ramp(frame, fKey - 4, fKey + 20) * Math.PI)) : 0

  const tableGlow = Math.max(leakWave(4) * 0.9, yours * 0.3)
  const tableBorder = onP > 0 ? blend(C.red, C.dim, onP) : blend(C.dim, C.red, leakWave(4))

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: fadeIn * fadeOut }}>
      {/* wire from browser to database */}
      <Wire x1={WIRE_X} y1={BY + BH} x2={WIRE_X} y2={TY} p={wire} color={C.grey} width={4} dash="2 14" />

      {/* browser */}
      <div style={{ opacity: browser, transform: `translateY(${(1 - browser) * 30}px)` }}>
        <BrowserFrame x={BX} y={BY} w={BW} h={BH} url={<><span style={{ color: C.white }}>yourapp.com</span><span style={{ marginLeft: 'auto', color: C.grey }}>DevTools · Console</span></>}
          color={result1 > 0.1 && frame < rel('policy') ? C.red : result2 > 0.1 ? blend(C.dim, C.green, result2) : C.dim}
          glow={frame < rel('policy') ? result1 * 0.6 : result2 * 0.5}>
          {/* key phase: the client is created with the anon key */}
          <div style={{ position: 'absolute', left: 30, top: 22, opacity: phaseKey }}>
            <CodeLine text="createClient(SUPABASE_URL, ANON_KEY)" size={32} chars={Math.floor((frame - 6) * 2.2)}
              marks={[{ text: 'ANON_KEY', color: C.yellow, glow: ramp(frame, kAnon - 4, kAnon + 8) }]} />
          </div>
          {/* leak phase: one line in the console */}
          <div style={{ position: 'absolute', left: 30, top: 18, opacity: leakConsole }}>
            <CodeLine text={QUERY} size={32} chars={typed1} />
            <div style={{ fontFamily: mono, fontSize: 32, lineHeight: 1.55, color: C.red, opacity: result1, transform: `translateX(${(1 - result1) * -20}px)`, textShadow: `0 0 18px ${alpha(C.red, 0.6)}` }}>
              ▸ Array(4812) [{'{…}'}, {'{…}'}, {'{…}'}, {'{…}'}, …]
            </div>
          </div>
          {/* policy phase: who is signed in */}
          <div style={{ position: 'absolute', left: 30, top: 18, opacity: ramp(frame, pUser - 10, pUser) * (1 - ramp(frame, fQuery - 10, fQuery)) }}>
            <CodeLine text="// signed in as you@yourapp.com" size={32} chars={Math.floor((frame - pUser + 6) * 2.4)} />
            <CodeLine text="// so auth.uid() returns 3" size={32} chars={Math.floor((frame - pUser - 14) * 2.4)} marks={[{ text: '3', color: C.yellow, glow: matchP }]} />
          </div>
          {/* filter phase: same query, one row */}
          <div style={{ position: 'absolute', left: 30, top: 18, opacity: filterConsole }}>
            <CodeLine text={QUERY} size={32} chars={typed2} />
            <div style={{ fontFamily: mono, fontSize: 32, lineHeight: 1.55, color: C.green, opacity: result2, transform: `translateX(${(1 - result2) * -20}px)`, textShadow: `0 0 18px ${alpha(C.green, 0.6)}` }}>
              ▸ Array(1) [{'{'} id: 3, email: 'you@…' {'}'}]
            </div>
          </div>
          {/* chips row: the same public key throughout */}
          <div style={{ position: 'absolute', left: 30, top: 128, display: 'flex', gap: 18, alignItems: 'center' }}>
            <div style={{ opacity: ramp(frame, kAnon - 6, kAnon + 4), transform: `scale(${1 + keyPulse * 0.08})` }}>
              <Chip color={C.yellow} glow={keyPulse + ramp(frame, kAnon - 4, kAnon + 8) * (1 - ramp(frame, kSend + 20, kSend + 40))}>
                <KeyIcon size={36} /> anon key
              </Chip>
            </div>
            <div style={{ opacity: publicBadge, transform: `scale(${0.8 + 0.2 * publicBadge})` }}>
              <Chip color={C.green}>
                <CheckIcon size={30} p={ramp(frame, kFine - 4, kFine + 10)} /> public, by design
              </Chip>
            </div>
            <div style={{ opacity: signedIn, transform: `scale(${0.8 + 0.2 * signedIn})`, position: 'absolute', left: 290 }}>
              <Chip color={matchP > 0 ? blend(C.blue, C.yellow, matchP) : C.blue} glow={matchP * (1 - ramp(frame, fRet, fRet + 20))}>
                <UserGlyph size={36} color={matchP > 0 ? blend(C.blue, C.yellow, matchP) : C.blue} />
                <span style={{ fontFamily: mono, fontWeight: 500 }}>auth.uid() = 3</span>
              </Chip>
            </div>
          </div>
        </BrowserFrame>
      </div>

      {/* key travels down the wire in the key scene */}
      <Packet x1={WIRE_X} y1={BY + BH + 10} x2={WIRE_X} y2={TY - 10} p={ramp(frame, kSend, kSend + 26)} color={C.yellow}>
        <div style={{ padding: 8, borderRadius: 30, background: '#000', border: `3px solid ${C.yellow}`, boxShadow: `0 0 30px ${alpha(C.yellow, 0.6)}`, display: 'flex' }}>
          <KeyIcon size={34} />
        </div>
      </Packet>

      {/* the leak: every row streams up to the browser */}
      {Array.from({ length: 14 }).map((_, i) => {
        const src = i % PROFILES.length
        const p = ramp(frame, lRet + i * 3, lRet + i * 3 + 22, (t) => t)
        return <Packet key={i} x1={rowX(src)} y1={TY - 6} x2={WIRE_X + (src - 2) * 30} y2={BY + BH + 6} p={p}>
          <div style={{ width: 64, height: 28, borderRadius: 8, border: `3px solid ${C.red}`, background: alpha(C.red, 0.3), boxShadow: `0 0 20px ${alpha(C.red, 0.7)}` }} />
        </Packet>
      })}

      {/* the fix: rows rise, the policy stops everyone else's */}
      {PROFILES.map((_, i) => {
        const mine = i === ME
        const t0 = fRet + Math.abs(i - ME) * 3
        if (mine) {
          const p = ramp(frame, t0, t0 + 30, (t) => t)
          return <Packet key={i} x1={rowX(i)} y1={TY - 6} x2={WIRE_X} y2={BY + BH + 6} p={p}>
            <div style={{ width: 64, height: 28, borderRadius: 8, border: `3px solid ${C.green}`, background: alpha(C.green, 0.35), boxShadow: `0 0 22px ${alpha(C.green, 0.8)}` }} />
          </Packet>
        }
        const rise = ramp(frame, t0, t0 + 12)
        const burst = ramp(frame, t0 + 12, t0 + 26)
        if (rise <= 0 || burst >= 1) return null
        const y = TY - 6 - rise * (TY - 6 - (GATE.y + GATE.h + 22))
        return (
          <div key={i} style={{ position: 'absolute', left: rowX(i), top: y, transform: 'translate(-50%,-50%)' }}>
            {burst <= 0 ? (
              <div style={{ width: 64, height: 28, borderRadius: 8, border: `3px solid ${C.red}`, background: alpha(C.red, 0.3) }} />
            ) : (
              <div style={{ opacity: 1 - burst, transform: `scale(${1 + burst * 0.6})` }}>
                <CrossIcon size={46} p={Math.min(1, burst * 3)} />
              </div>
            )}
          </div>
        )
      })}

      {/* the policy, sitting between the browser and the table */}
      <div style={{ opacity: gate, transform: `scaleX(${0.7 + 0.3 * gate})`, transformOrigin: '50% 50%' }}>
        <Panel x={GATE.x} y={GATE.y} w={GATE.w} h={GATE.h} color={C.green} glow={0.35 + 0.4 * matchP * (1 - yours) + ramp(frame, fRet + 8, fRet + 16) * (1 - ramp(frame, fRet + 30, fRet + 50))} bg="#07120C"
          style={{ padding: '18px 30px' }}>
          {POLICY.map((l, i) => (
            <CodeLine key={l} text={l} size={30} chars={Math.floor((frame - pPolicy - 4 - i * 18) * 2.2)}
              marks={i === 1 ? [{ text: 'auth.uid() = id', color: C.yellow, glow: matchP, bg: matchP }] : []} />
          ))}
        </Panel>
        <div style={{ position: 'absolute', left: GATE.x + 26, top: GATE.y - 22 }}>
          <Chip color={C.green} solid size={28} style={{ padding: '4px 16px' }}><LockIcon size={28} color="#000" /> RLS policy</Chip>
        </div>
      </div>

      {/* profiles table */}
      <div style={{ opacity: table, transform: `translateY(${(1 - table) * 40}px)` }}>
        <Panel x={TX} y={TY} w={TW} h={HEAD_H + 12 + PROFILES.length * (ROW_H + ROW_GAP) + 58} color={tableBorder} glow={tableGlow} style={{ boxShadow: tableGlow > 0 ? `0 0 70px ${alpha(leakWave(4) > yours ? C.red : C.green, 0.35 * tableGlow * 2)}` : 'none' }}>
          <div style={{ height: HEAD_H, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', borderBottom: `2px solid ${C.dim}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontFamily: mono, fontSize: 34, color: C.white }}>
              <span style={{ color: C.grey }}>table</span> profiles
            </div>
            <div style={{ opacity: badgeIn, transform: `scale(${1 + lockPop * 0.06 * (1 - ramp(frame, pOn + 10, pOn + 30))})` }}>
              <Chip color={rlsColor} glow={offP * (1 - onP) * 0.8 + onP * 0.6} size={28} style={{ padding: '6px 18px' }}>
                <LockIcon size={30} color={rlsColor} open={1 - onP} />
                RLS {onP > 0.5 ? 'ON' : offP > 0.5 ? 'OFF' : ''}
              </Chip>
            </div>
          </div>
          {PROFILES.map((email, i) => {
            const mine = i === ME
            const red = leakWave(i)
            const won = mine ? yours : 0
            const dim = !mine ? yours : 0
            const border = won > 0 ? blend(C.dim, C.green, won) : blend(C.dim, C.red, red)
            const idGlow = mine ? matchP * (1 - yours) : 0
            return (
              <div key={email} style={{
                position: 'absolute', left: 18, right: 18, top: rowY(i) - TY, height: ROW_H, borderRadius: 14,
                border: `3px solid ${border}`, background: won > 0 ? alpha(C.green, 0.14 * won) : alpha(C.red, 0.14 * red),
                display: 'flex', alignItems: 'center', padding: '0 22px', gap: 26, fontFamily: mono, fontSize: 31,
                opacity: 1 - dim * 0.55, boxShadow: won > 0 ? `0 0 40px ${alpha(C.green, 0.45 * won)}` : 'none',
              }}>
                <span style={{ color: idGlow > 0 ? blend(C.grey, C.yellow, idGlow) : C.grey, width: 30, textShadow: idGlow > 0 ? `0 0 16px ${alpha(C.yellow, idGlow)}` : 'none' }}>{i + 1}</span>
                <span style={{ color: red > 0.5 ? C.red : C.white, flex: 1 }}>{email}</span>
                {mine && <span style={{ fontFamily: sans, fontWeight: 600, fontSize: 28, color: won > 0.5 ? C.green : C.grey }}>you</span>}
                {!mine && dim > 0 && <LockIcon size={34} color={C.grey} />}
              </div>
            )
          })}
          <div style={{ position: 'absolute', left: 40, bottom: 14, fontFamily: mono, fontSize: 28, color: leakWave(4) > 0.5 ? C.red : C.grey }}>
            + 4,807 more rows
          </div>
        </Panel>
      </div>

      <Sfx t={T} name="error" at={lOff - 2} volume={0.25} />
      <Sfx t={T} name="leak" at={lRet} volume={0.7} />
      <Sfx t={T} name="lock" at={pOn - 2} volume={0.22} />
      <Sfx t={T} name="success" at={fYours - 4} volume={0.35} />
    </div>
  )
}

function KeyTitle() {
  return <Heading from={2} top={150} size={76}>The anon key is <span style={{ color: C.yellow }}>public</span></Heading>
}
function LeakTitle() {
  return <Heading from={2} top={150} size={76}>But <span style={{ color: C.red }}>RLS</span> was switched off</Heading>
}
function PolicyTitle() {
  return <Heading from={2} top={150} size={76}>Claude added a <span style={{ color: C.green }}>policy</span></Heading>
}
function FilterTitle() {
  return <Heading from={2} top={150} size={76}>Same query. <span style={{ color: C.green }}>One row.</span></Heading>
}

/* ---------------- takeaway ---------------- */

function Takeaway() {
  const frame = useCurrentFrame()
  const cue = useCues()
  const second = cue('that', 53)
  const pol = cue('policy', 80)
  const a = useSpring(cue('browser', 16) - 4, 15)
  const b = useSpring(cue('table', 39) - 4, 15)
  const shield = useSpring(pol - 8, 11)
  const code = useSpring(pol + 4, 16)
  return (
    <div>
      <Heading from={4} top={220} size={80}>If the browser<br />can reach a table,</Heading>
      <Heading from={second - 4} top={410} size={80} color={C.green}>that table<br />needs a policy.</Heading>
      {/* browser -> policy -> table */}
      <div style={{ position: 'absolute', top: 690, left: 90, width: 780, height: 220 }}>
        <div style={{ position: 'absolute', left: 0, top: 30, width: 200, height: 150, borderRadius: 18, border: `3px solid ${C.blue}`, opacity: a, transform: `scale(${0.8 + 0.2 * a})` }}>
          <div style={{ height: 34, borderBottom: `3px solid ${C.blue}`, display: 'flex', gap: 8, alignItems: 'center', paddingLeft: 14 }}>
            {[0, 1, 2].map((i) => <span key={i} style={{ width: 10, height: 10, borderRadius: 5, background: C.blue }} />)}
          </div>
          <div style={{ textAlign: 'center', fontFamily: sans, fontSize: 28, color: C.blue, marginTop: 30 }}>browser</div>
        </div>
        <Wire x1={210} y1={105} x2={300} y2={105} p={a} color={C.grey} />
        <div style={{ position: 'absolute', left: 310, top: 10, width: 160, height: 190, display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: shield, transform: `scale(${0.6 + 0.4 * shield})` }}>
          <svg width={130} height={150} viewBox="0 0 130 150" style={{ filter: `drop-shadow(0 0 ${24 * shield}px ${alpha(C.green, 0.7)})` }}>
            <path d="M65 8l50 18v42c0 36-22 60-50 74C37 128 15 104 15 68V26z" fill={alpha(C.green, 0.15)} stroke={C.green} strokeWidth={5} strokeLinejoin="round" />
            <path d="M42 76l16 16 32-34" fill="none" stroke={C.green} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={70} strokeDashoffset={70 * (1 - ramp(frame, pol, pol + 14))} />
          </svg>
          <div style={{ fontFamily: sans, fontSize: 28, color: C.green }}>policy</div>
        </div>
        <Wire x1={480} y1={105} x2={570} y2={105} p={b} color={C.grey} />
        <div style={{ position: 'absolute', left: 580, top: 30, width: 200, height: 150, borderRadius: 18, border: `3px solid ${C.blue}`, opacity: b, transform: `scale(${0.8 + 0.2 * b})`, overflow: 'hidden' }}>
          {[0, 1, 2, 3].map((i) => <div key={i} style={{ height: 37, borderBottom: i < 3 ? `2px solid ${alpha(C.blue, 0.5)}` : 'none', background: i === 0 ? alpha(C.blue, 0.18) : 'none' }} />)}
        </div>
        <div style={{ position: 'absolute', left: 580, top: 190, width: 200, textAlign: 'center', fontFamily: sans, fontSize: 28, color: C.blue, opacity: b }}>table</div>
      </div>
      <div style={{ opacity: code, transform: `translateY(${(1 - code) * 24}px)` }}>
        <Panel x={90} y={1010} w={780} style={{ padding: '24px 34px' }}>
          <CodeLine text="alter table profiles" size={32} />
          <CodeLine text="  enable row level security;" size={32} />
        </Panel>
      </div>
    </div>
  )
}

export function RlsReel() {
  return (
    <Stage>
      <ReelAudio t={T} voiceVolume={2.08} musicVolume={0.31} duck={0.42} />
      <Scene t={T} id="hook"><Hook /></Scene>
      <Sequence from={S.key.from} durationInFrames={S.filter.from + S.filter.durationInFrames - S.key.from + 9} name="case">
        <Case />
      </Sequence>
      <Scene t={T} id="key"><KeyTitle /></Scene>
      <Scene t={T} id="leak"><LeakTitle /></Scene>
      <Scene t={T} id="policy"><PolicyTitle /></Scene>
      <Scene t={T} id="filter"><FilterTitle /></Scene>
      <Scene t={T} id="takeaway"><Takeaway /></Scene>
      {/* documentary vignette */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 75% 60% at 50% 45%, transparent 60%, rgba(0,0,0,0.55) 100%)' }} />
      <Captions t={T} />
    </Stage>
  )
}
