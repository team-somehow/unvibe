import type { CSSProperties } from 'react'
import { Easing, interpolate, useCurrentFrame } from 'remotion'
import { Captions, ReelAudio, Scene, Sfx, buildTimeline, type Manifest } from './audio'
import manifest from './audio/secrets.json'
import {
  BrowserFrame, Chip, CodeLine, GearIcon, GlobeIcon, Heading, KeyIcon, LockIcon, Packet, Panel, Wire,
  alpha, blend, clamp, mix, ramp, useCues, useSpring,
} from './kit-breaches'
import { C, Stage, mono, sans } from './primitives'
import script from './scripts/secrets.json'

const T = buildTimeline(script, manifest as unknown as Manifest)
export const SECRETS_REEL_FRAMES = T.total

const KEY = 'sk_live_51Hx…REDACTED'
const KEY_SHORT = 'sk_live_51Hx…'

// A slice of the minified production bundle. Line 9 carries the leaked key.
const WALL = [
  '!function(){"use strict";var e=window,t=',
  'document;function n(r){return r&&r.__esM',
  'odule?r.default:r}var o=n(require("react',
  '")),a={exports:{}};function i(e,t){for(v',
  'ar n=0;n<t.length;n++){var r=t[n];r.enum',
  'erable=r.enumerable||!1}}const c="https:',
  '//api.yourapp.com",l=async e=>{const t=a',
  'wait fetch(c+"/cart",{method:"POST",body',
  ':JSON.stringify(e)});return t.json()};co',
  `nst s=Stripe("${KEY}"),u=`,
  's.charges.create;function d(e){return u(',
  '{amount:e.total,currency:"usd",source:e.',
  'token})}var f=document.getElementById("r',
  'oot");o.render(o.createElement(App,null)',
  ',f);var p=e.localStorage,m=p.getItem("ca',
  'rt")||"[]";export{d as checkout,l as syn',
]
const KEY_LINE = 9
const FS = 30 // wall font size
const CW = FS * 0.6 // Geist Mono advance
const LH = FS * 1.55
const keyCol = WALL[KEY_LINE].indexOf('sk_live')

function Wall({ keyGlow = 0, keyColor = C.red, tint, ring = 0, style }: { keyGlow?: number; keyColor?: string; tint?: string; ring?: number; style?: CSSProperties }) {
  return (
    <div style={{ position: 'absolute', ...style }}>
      {WALL.map((l, i) => (
        <CodeLine key={i} text={l} size={FS} color={tint}
          marks={i === KEY_LINE ? [{ text: KEY, color: keyColor, glow: keyGlow, bg: keyGlow, ring, ringColor: C.yellow }] : []} />
      ))}
    </div>
  )
}

/* ---------------- hook: a spotlight finds the key ---------------- */

const HOOK_PANEL = { x: 90, y: 330, w: 780, h: 62 + 30 + WALL.length * LH + 24 }
const WALL_X = HOOK_PANEL.x + 30
const WALL_Y = HOOK_PANEL.y + 62 + 26
const keyCx = WALL_X + (keyCol + KEY.length / 2) * CW
const keyCy = WALL_Y + KEY_LINE * LH + LH / 2

function Hook() {
  const frame = useCurrentFrame()
  const cue = useCues()
  const panel = useSpring(4, 16)
  const sight = cue('sight', 96)
  const claude = cue('claude', 185)
  // the spotlight sweeps the code like a searchlight, then settles on the key
  // it brushes past the key around the poster frame (45), moves on, then comes back and locks on
  const keys = [10, 30, 48, 68, Math.max(80, sight - 8)]
  const xs = [WALL_X + 140, WALL_X + 600, keyCx - 40, WALL_X + 200, keyCx]
  const ys = [WALL_Y + 90, WALL_Y + 230, keyCy, WALL_Y + 620, keyCy]
  const sx = interpolate(frame, keys, xs, { ...clamp, easing: Easing.inOut(Easing.sin) })
  const sy = interpolate(frame, keys, ys, { ...clamp, easing: Easing.inOut(Easing.sin) })
  const light = ramp(frame, 4, 16)
  const found = ramp(frame, sight - 10, sight + 4)
  const box = ramp(frame, claude - 8, claude + 8)
  const chip = useSpring(claude - 6, 12)
  // the beam widens into an ellipse once it lands, so the whole key is lit
  const mask = `radial-gradient(ellipse ${160 + found * 210}px ${160 + found * 20}px at ${sx}px ${sy}px, #000 60%, transparent 100%)`
  return (
    <>
      <Heading from={2} top={150} size={76}>Hiding in plain sight</Heading>
      <div style={{ opacity: panel, transform: `translateY(${(1 - panel) * 30}px)` }}>
        <BrowserFrame x={HOOK_PANEL.x} y={HOOK_PANEL.y} w={HOOK_PANEL.w} h={HOOK_PANEL.h} url={<span>yourapp.com/assets/<span style={{ color: C.white }}>index-4f9a.js</span></span>} />
        {/* dark copy of the code */}
        <Wall tint="#353D47" keyColor="#353D47" ring={box} style={{ left: WALL_X, top: WALL_Y }} />
        {/* lit copy, visible only inside the spotlight */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, opacity: light, WebkitMaskImage: mask, maskImage: mask }}>
          <Wall keyGlow={found} keyColor={blend(C.green, C.red, found)} ring={box} style={{ left: WALL_X, top: WALL_Y }} />
        </div>
        <div style={{ position: 'absolute', left: sx - 190, top: sy - 190, width: 380, height: 380, borderRadius: 190, opacity: light * 0.5, background: `radial-gradient(circle, ${alpha(found > 0.5 ? C.red : C.yellow, 0.12)} 0%, transparent 60%)` }} />
      </div>
      <div style={{ position: 'absolute', top: HOOK_PANEL.y + HOOK_PANEL.h + 40, left: 90, width: 780, display: 'flex', justifyContent: 'center', opacity: chip, transform: `scale(${0.85 + 0.15 * chip})` }}>
        <Chip color={C.yellow} glow={chip}><KeyIcon size={34} /> Claude spotted a live secret key</Chip>
      </div>
      <Sfx t={T} name="ding" at={claude - 4} volume={0.9} />
    </>
  )
}

/* ---------------- prefix: how the key got into the bundle ---------------- */

const ENV = { x: 90, y: 330, w: 780 }
const BUNDLE = { x: 90, y: 880, w: 780 }
const GEAR = { x: 480, y: 700 }

function Prefix() {
  const frame = useCurrentFrame()
  const cue = useCues()
  const env = useSpring(2, 16)
  const vite = cue('vite', 71)
  const vite2 = cue('vite', 125, 1)
  const pastes = cue('pastes', 137)
  const bundleW = cue('bundle', 209)
  const browserW = cue('browser', 196)
  const prefixGlow = ramp(frame, vite - 4, vite + 8)
  // the pipeline is on stage from the start; the build lights up when the narration reaches it
  const machine = useSpring(14, 14)
  const bundle = useSpring(24, 16)
  const machineOn = ramp(frame, vite2 - 6, vite2 + 6)
  // the value is copied out of .env, through the build, into the bundle
  const leg1 = ramp(frame, pastes - 4, pastes + 18)
  const leg2 = ramp(frame, pastes + 26, bundleW - 2)
  const landed = ramp(frame, bundleW - 4, bundleW + 6)
  const spin = interpolate(frame, [0, pastes, pastes + 30, 400], [0, 60, 400, 600], clamp)
  const busy = ramp(frame, pastes + 10, pastes + 20) * (1 - ramp(frame, pastes + 34, pastes + 44))
  const globe = useSpring(browserW + 6, 14)
  const stays = ramp(frame, pastes - 10, pastes + 4)

  const valX = ENV.x + 30 + 'VITE_STRIPE_SECRET='.length * 18 + (KEY_SHORT.length * 18) / 2
  const valY = ENV.y + 70 + 20 + 46 * 1 + 23
  const slotX = BUNDLE.x + 30 + 'const s=Stripe("'.length * 18 + (KEY_SHORT.length * 18) / 2
  const slotY = BUNDLE.y + 70 + 20 + 46 * 1 + 23
  const tx = leg2 > 0 ? mix(GEAR.x, slotX, Easing.inOut(Easing.cubic)(leg2)) : mix(valX, GEAR.x, Easing.inOut(Easing.cubic)(leg1))
  const ty = leg2 > 0 ? mix(GEAR.y, slotY, Easing.inOut(Easing.cubic)(leg2)) : mix(valY, GEAR.y, Easing.inOut(Easing.cubic)(leg1))
  const flying = leg1 > 0 && landed < 1

  return (
    <>
      <Heading from={2} top={150} size={76}>How it got there</Heading>
      {/* .env */}
      <div style={{ opacity: env, transform: `translateY(${(1 - env) * 30}px)` }}>
        <Panel x={ENV.x} y={ENV.y} w={ENV.w} style={{ padding: '0 30px 20px' }}>
          <div style={{ height: 70, display: 'flex', alignItems: 'center', fontFamily: mono, fontSize: 30, color: C.grey }}>.env</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <CodeLine text="DATABASE_URL=postgres://…" size={30} style={{ opacity: 1 - stays * 0.45 }} />
            <span style={{ fontFamily: sans, fontSize: 28, color: C.grey, opacity: stays }}>stays on the server</span>
          </div>
          <CodeLine text={`VITE_STRIPE_SECRET=${KEY_SHORT}`} size={30}
            marks={[{ text: 'VITE_', color: C.yellow, glow: prefixGlow, bg: prefixGlow }, { text: KEY_SHORT, color: C.red }]} />
        </Panel>
      </div>
      {/* the build */}
      <Wire x1={480} y1={ENV.y + 214} x2={480} y2={GEAR.y - 62} p={machine} color={C.grey} dash="2 14" />
      <Wire x1={480} y1={GEAR.y + 62} x2={480} y2={BUNDLE.y} p={bundle} color={C.grey} dash="2 14" />
      {/* bundle.js */}
      <div style={{ opacity: bundle, transform: `translateY(${(1 - bundle) * 30}px)` }}>
        <Panel x={BUNDLE.x} y={BUNDLE.y} w={BUNDLE.w} color={landed > 0 ? blend(C.dim, C.red, landed) : C.dim} glow={landed * 0.7} style={{ padding: '0 30px 20px' }}>
          <div style={{ height: 70, display: 'flex', alignItems: 'center', fontFamily: mono, fontSize: 30, color: C.grey }}>
            assets/<span style={{ color: C.white }}>index-4f9a.js</span>
          </div>
          <CodeLine text='const c="https://api.yourapp.com";' size={30} />
          <div style={{ display: 'flex' }}>
            <CodeLine text='const s=Stripe("' size={30} />
            <span style={{ display: 'inline-block', fontFamily: mono, fontSize: 30, width: `${KEY_SHORT.length}ch`, height: 40, marginTop: 4, borderRadius: 8, border: `2px dashed ${alpha(C.grey, 0.7 * (1 - landed))}`, position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0, top: -4, opacity: landed }}>
                <CodeLine text={KEY_SHORT} size={30} marks={[{ text: KEY_SHORT, color: C.red, glow: landed }]} />
              </span>
            </span>
            <CodeLine text='");' size={30} />
          </div>
          <CodeLine text="s.charges.create({amount:e.total…" size={30} />
        </Panel>
      </div>
      {/* the flying copy of the value (drawn under the build machine, so it passes through it) */}
      {flying && (
        <div style={{ position: 'absolute', left: tx, top: ty, transform: 'translate(-50%,-50%)', padding: '2px 10px', borderRadius: 10, border: `3px solid ${C.red}`, background: '#140808', boxShadow: `0 0 30px ${alpha(C.red, 0.7)}` }}>
          <CodeLine text={KEY_SHORT} size={30} color={C.red} />
        </div>
      )}
      <div style={{
        position: 'absolute', left: GEAR.x - 230, top: GEAR.y - 60, width: 460, height: 120, borderRadius: 30,
        border: `3px solid ${busy > 0 ? blend(C.blue, C.yellow, busy) : blend(C.dim, C.blue, machineOn)}`, background: '#0A0E13', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18,
        opacity: machine, transform: `scale(${(0.8 + 0.2 * machine) * (1 + busy * 0.04)})`, boxShadow: `0 0 ${50 * busy}px ${alpha(C.yellow, 0.4)}`,
      }}>
        <GearIcon size={72} angle={spin} color={busy > 0 ? blend(C.blue, C.yellow, busy) : blend(C.grey, C.blue, machineOn)} />
        <span style={{ fontFamily: mono, fontSize: 38, color: C.white }}>vite build</span>
      </div>
      {/* served to everyone */}
      <div style={{ position: 'absolute', top: BUNDLE.y + 300, left: 90, width: 780, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22, opacity: globe, transform: `translateY(${(1 - globe) * 20}px)` }}>
        <GlobeIcon size={84} color={C.red} spin={frame / 90} />
        <span style={{ fontFamily: sans, fontSize: 36, color: C.white }}>served to <span style={{ color: C.red }}>every visitor</span></span>
      </div>
      <Sfx t={T} name="build" at={pastes} volume={0.4} />
    </>
  )
}

/* ---------------- find: view source + magnifying glass ---------------- */

const FIND_FRAME = { x: 70, y: 320, w: 820, h: 62 + 30 + WALL.length * LH + 30 }
const FW_X = FIND_FRAME.x + 40
const FW_Y = FIND_FRAME.y + 62 + 28
const fKeyCx = FW_X + (keyCol + 3.5) * CW
const fKeyCy = FW_Y + KEY_LINE * LH + LH / 2
const LENS = 150
const ZOOM = 1.6

function Find() {
  const frame = useCurrentFrame()
  const cue = useCues()
  const win = useSpring(2, 16)
  const view = cue('view', 52)
  const search = cue('search', 84)
  const code = cue('code', 119)
  const walk = cue('walk', 149)
  const account = cue('account', 194)
  const lens = useSpring(search - 10, 14)
  const kf = [search - 6, search + 12, search + 26, code + 8]
  const lx = interpolate(frame, kf, [FW_X + 160, FW_X + 560, FW_X + 220, fKeyCx], { ...clamp, easing: Easing.inOut(Easing.sin) })
  const ly = interpolate(frame, kf, [FW_Y + 100, FW_Y + 200, FW_Y + 300, fKeyCy], { ...clamp, easing: Easing.inOut(Easing.sin) })
  const hit = ramp(frame, code + 4, code + 14)
  const bar = useSpring(search - 14, 15)
  const typed = Math.max(0, Math.floor((frame - search + 8) / 2.5))
  const stolen = ramp(frame, walk - 4, walk + 8)
  const items = ['charges', 'refunds', 'customer data']
  return (
    <>
      <Heading from={2} top={150} size={76}>Anyone can <span style={{ color: C.red }}>view source</span></Heading>
      <div style={{ opacity: win, transform: `translateY(${(1 - win) * 30}px)` }}>
        <BrowserFrame x={FIND_FRAME.x} y={FIND_FRAME.y} w={FIND_FRAME.w} h={FIND_FRAME.h}
          color={stolen > 0 ? blend(C.dim, C.red, stolen) : C.dim} glow={stolen * 0.6}
          url={<span><span style={{ color: ramp(frame, view - 4, view + 6) > 0.5 ? C.yellow : C.grey }}>view-source:</span>yourapp.com/…/index-4f9a.js</span>} />
        <div style={{ opacity: 0.7 }}><Wall keyGlow={hit * 0.7} keyColor={blend(C.green, C.red, hit)} style={{ left: FW_X, top: FW_Y }} /></div>
      </div>
      {/* Ctrl+F */}
      <div style={{
        position: 'absolute', left: FIND_FRAME.x + FIND_FRAME.w - 360, top: FIND_FRAME.y + 74, width: 330, height: 64, borderRadius: 14,
        background: '#161E27', border: `3px solid ${hit > 0.5 ? C.red : C.yellow}`, display: 'flex', alignItems: 'center', gap: 12, padding: '0 18px',
        fontFamily: mono, fontSize: 30, opacity: bar, transform: `translateY(${(1 - bar) * -16}px)`, boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
      }}>
        <span style={{ color: C.white, flex: 1 }}>{'sk_live'.slice(0, typed)}<span style={{ color: C.blue, opacity: typed < 7 ? 1 : 0 }}>▍</span></span>
        <span style={{ color: hit > 0.5 ? C.red : C.grey, fontSize: 28 }}>{hit > 0.5 ? '1 of 1' : '0 of 0'}</span>
      </div>
      {/* magnifying glass */}
      <div style={{ position: 'absolute', left: lx - LENS, top: ly - LENS, width: LENS * 2, height: LENS * 2, opacity: lens, transform: `scale(${0.6 + 0.4 * lens})` }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: LENS, overflow: 'hidden', background: '#06090D' }}>
          <div style={{ position: 'absolute', left: LENS - lx * ZOOM, top: LENS - ly * ZOOM, width: 1080, height: 1920, transform: `scale(${ZOOM})`, transformOrigin: '0 0' }}>
            <Wall keyGlow={hit} keyColor={blend(C.green, C.red, hit)} style={{ left: FW_X, top: FW_Y }} />
          </div>
        </div>
        <div style={{ position: 'absolute', inset: -6, borderRadius: LENS + 6, border: `8px solid ${hit > 0.5 ? C.red : C.white}`, boxShadow: `0 0 40px ${alpha(hit > 0.5 ? C.red : C.white, 0.35)}` }} />
        <div style={{ position: 'absolute', left: LENS * 2 - 26, top: LENS * 2 - 26, width: 110, height: 26, borderRadius: 13, background: hit > 0.5 ? C.red : C.white, transform: 'rotate(45deg)', transformOrigin: '0 50%' }} />
      </div>
      {/* what the key unlocks */}
      <div style={{ position: 'absolute', top: FIND_FRAME.y + FIND_FRAME.h + 36, left: 90, width: 780, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
        <div style={{ fontFamily: sans, fontSize: 36, color: C.white, opacity: stolen, transform: `translateY(${(1 - stolen) * 14}px)` }}>
          <span style={{ fontFamily: mono, color: C.red }}>sk_live</span> = full access to
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          {items.map((t, i) => {
            const p = ramp(frame, walk + 8 + i * 7, walk + 18 + i * 7)
            return <div key={t} style={{ opacity: p, transform: `scale(${0.8 + 0.2 * p})` }}><Chip color={C.red} glow={ramp(frame, account - 4, account + 6) * 0.8}>{t}</Chip></div>
          })}
        </div>
      </div>
      <Sfx t={T} name="zoom" at={search - 8} volume={0.45} />
      <Sfx t={T} name="alarm" at={walk - 2} volume={0.24} />
    </>
  )
}

/* ---------------- fix: route the call through a server ---------------- */

const BR = { x: 70, y: 320, w: 820, h: 230 }
const SV = { x: 170, y: 680, w: 620, h: 220 }
const ST = { x: 240, y: 1060, w: 480, h: 136 }

function Fix() {
  const frame = useCurrentFrame()
  const cue = useCues()
  const moved = cue('moved', 21)
  const route = cue('route', 79)
  const never = cue('never', 120)
  const browserW = cue('browser', 173)
  const pub = cue('publishable', 215)
  const nodes = useSpring(3, 16)
  const server = useSpring(moved - 4, 15)
  const direct = 1 - ramp(frame, moved, moved + 16)
  const rewire = ramp(frame, moved + 6, route - 4)
  const travel = ramp(frame, moved + 4, route)
  const locked = ramp(frame, never - 4, never + 6)
  const pk = useSpring(pub - 6, 12)
  const bGlow = ramp(frame, browserW - 4, browserW + 8) * (1 - ramp(frame, pub + 20, pub + 40))
  const kx = mix(BR.x + 270 + 130, SV.x + SV.w / 2, Easing.inOut(Easing.cubic)(travel))
  const ky = mix(BR.y + 62 + 81, SV.y + 150, Easing.inOut(Easing.cubic)(travel))
  const keyColor = blend(C.red, C.green, ramp(frame, route - 8, route + 4))
  // a request loops browser -> server -> Stripe once the route exists
  const loop = (frame - (never + 10)) % 54
  const req = frame > never + 10
  const press = req ? 1 - 0.06 * Math.max(0, 1 - Math.abs(loop - 2) / 4) : 1
  return (
    <>
      <Heading from={2} top={150} size={76}>Claude moved it <span style={{ color: C.green }}>server-side</span></Heading>
      {/* the old direct call: browser straight to Stripe, secret in hand */}
      <div style={{ opacity: direct }}>
        <Wire x1={480} y1={BR.y + BR.h} x2={480} y2={ST.y} p={nodes} color={C.red} width={4} dash="10 12" glow={0.5} />
      </div>
      <Wire x1={480} y1={BR.y + BR.h} x2={480} y2={SV.y} p={rewire} color={C.grey} dash="2 14" />
      <Wire x1={480} y1={SV.y + SV.h} x2={480} y2={ST.y} p={rewire} color={C.grey} dash="2 14" />

      <div style={{ opacity: nodes }}>
        <BrowserFrame x={BR.x} y={BR.y} w={BR.w} h={BR.h} url="yourapp.com/checkout" color={bGlow > 0 ? blend(C.dim, C.blue, bGlow) : C.dim} glow={bGlow * 0.5}>
          <div style={{ position: 'absolute', left: 40, top: 46, height: 70, padding: '0 34px', borderRadius: 16, background: C.blue, color: '#000', display: 'flex', alignItems: 'center', fontFamily: sans, fontWeight: 700, fontSize: 34, transform: `scale(${press})` }}>
            Pay $49
          </div>
          <div style={{ position: 'absolute', left: 270, top: 30, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, opacity: pk, transform: `scale(${0.85 + 0.15 * pk})`, transformOrigin: 'left center' }}>
            <Chip color={C.green} glow={pk * 0.6}><KeyIcon size={34} color={C.green} /> <span style={{ fontFamily: mono, fontWeight: 500 }}>pk_live_…</span></Chip>
            <span style={{ fontFamily: sans, fontSize: 28, color: C.green, paddingLeft: 10 }}>publishable: safe to ship</span>
          </div>
        </BrowserFrame>
      </div>

      <div style={{ opacity: server, transform: `scale(${0.85 + 0.15 * server})`, transformOrigin: '480px 790px' }}>
        <Panel x={SV.x} y={SV.y} w={SV.w} h={SV.h} color={blend(C.blue, C.green, locked)} glow={0.2 + locked * 0.5}>
          <div style={{ height: 70, display: 'flex', alignItems: 'center', gap: 14, padding: '0 28px', borderBottom: `2px solid ${C.dim}`, fontFamily: mono, fontSize: 32 }}>
            <span style={{ color: C.purple }}>POST</span><span style={{ color: C.white }}>/api/checkout</span>
            <span style={{ marginLeft: 'auto', fontFamily: sans, fontSize: 28, color: C.grey }}>server</span>
          </div>
          <div style={{ position: 'absolute', left: 30, bottom: 34, display: 'flex', alignItems: 'center', gap: 12 }}>
            <LockIcon size={50} color={blend(C.grey, C.green, locked)} open={1 - locked} />
          </div>
        </Panel>
      </div>

      <div style={{ opacity: nodes }}>
        <Panel x={ST.x} y={ST.y} w={ST.w} h={ST.h} color={C.purple} glow={0.25} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sans, fontWeight: 600, fontSize: 48, color: C.purple }}>
          Stripe API
        </Panel>
      </div>

      {/* the secret key moves into the server */}
      <div style={{ position: 'absolute', left: kx, top: ky, transform: 'translate(-50%,-50%)' }}>
        <Chip color={keyColor} glow={0.6} style={{ background: '#000' }}><KeyIcon size={34} color={keyColor} /><span style={{ fontFamily: mono, fontWeight: 500 }}>{KEY_SHORT}</span></Chip>
      </div>

      {req && (
        <>
          <Packet x1={480} y1={BR.y + BR.h} x2={480} y2={SV.y} p={ramp(loop, 0, 16, (t) => t)} color={C.blue} />
          <Packet x1={480} y1={SV.y + SV.h} x2={480} y2={ST.y} p={ramp(loop, 18, 34, (t) => t)} color={C.green} />
          <Packet x1={510} y1={ST.y} x2={510} y2={SV.y + SV.h} p={ramp(loop, 36, 46, (t) => t)} color={C.purple} size={16} />
        </>
      )}
      <Sfx t={T} name="vault" at={never - 8} volume={0.45} />
    </>
  )
}

/* ---------------- rotate ---------------- */

function Rotate() {
  const frame = useCurrentFrame()
  const cue = useCues()
  const rotated = cue('rotated', 22)
  const keyW = cue('key', 60)
  const once = cue('once', 98)
  const old = useSpring(0, 16)
  const strike = ramp(frame, rotated, rotated + 14)
  const stamp = useSpring(rotated + 10, 9)
  const fresh = useSpring(keyW - 6, 14)
  const spin = interpolate(frame, [rotated - 10, keyW + 10], [0, 360], { ...clamp, easing: Easing.inOut(Easing.cubic) })
  return (
    <>
      <Heading from={2} top={150} size={76}>Then: <span style={{ color: C.yellow }}>rotate</span> the key</Heading>
      <div style={{ opacity: old, transform: `translateY(${(1 - old) * 20}px)` }}>
        <Panel x={90} y={360} w={780} h={150} color={C.red} glow={0.3 * (1 - strike)} style={{ display: 'flex', alignItems: 'center', padding: '0 34px', gap: 20 }}>
          <KeyIcon size={48} color={C.red} />
          <div style={{ fontFamily: mono, fontSize: 38, color: C.red, position: 'relative' }}>
            {KEY}
            <div style={{ position: 'absolute', left: -6, top: '52%', height: 5, borderRadius: 3, background: C.red, width: `calc(${strike * 100}% + 12px)` }} />
          </div>
        </Panel>
        <div style={{ position: 'absolute', left: 590, top: 470, opacity: stamp, transform: `rotate(-8deg) scale(${2 - stamp})` }}>
          <div style={{ border: `5px solid ${C.red}`, borderRadius: 12, padding: '4px 18px', fontFamily: sans, fontWeight: 700, fontSize: 40, letterSpacing: 4, color: C.red, background: '#000' }}>REVOKED</div>
        </div>
      </div>
      {/* rotation arrows */}
      <svg width={180} height={180} viewBox="-90 -90 180 180" style={{ position: 'absolute', left: 390, top: 560, opacity: ramp(frame, rotated - 12, rotated) }}>
        <g transform={`rotate(${spin})`} fill="none" stroke={C.yellow} strokeWidth={8} strokeLinecap="round">
          <path d="M-60 -10a60 60 0 0 1 104 -38" />
          <path d="M60 10a60 60 0 0 1 -104 38" />
          <path d="M44 -48l4 -26M44 -48l-26 -4" />
          <path d="M-44 48l-4 26M-44 48l26 4" />
        </g>
      </svg>
      <div style={{ opacity: fresh, transform: `translateY(${(1 - fresh) * 40}px)` }}>
        <Panel x={90} y={780} w={780} h={150} color={C.green} glow={0.5 * fresh} style={{ display: 'flex', alignItems: 'center', padding: '0 34px', gap: 20 }}>
          <KeyIcon size={48} color={C.green} />
          <div style={{ fontFamily: mono, fontSize: 38, color: C.green, flex: 1 }}>sk_live_9Qm…</div>
          <LockIcon size={44} color={C.green} />
          <span style={{ fontFamily: sans, fontSize: 28, color: C.green }}>server only</span>
        </Panel>
      </div>
      <Heading from={once - 4} top={1040} size={70} color={C.yellow}>Once a secret ships,<br />it's stolen.</Heading>
      <Sfx t={T} name="success" at={keyW - 4} volume={0.3} />
    </>
  )
}

/* ---------------- takeaway ---------------- */

function Takeaway() {
  const frame = useCurrentFrame()
  const cue = useCues()
  const vite = cue('vite', 39)
  const whole = cue('whole', 70)
  const chip = useSpring(5, 12)
  const chipGlow = ramp(frame, vite - 4, vite + 6) * (1 - ramp(frame, vite + 14, vite + 30))
  const globe = useSpring(whole - 10, 14)
  return (
    <div>
      <div style={{ position: 'absolute', top: 300, left: 90, width: 780, display: 'flex', justifyContent: 'center', opacity: chip, transform: `scale(${0.7 + 0.3 * chip})` }}>
        <div style={{ fontFamily: mono, fontSize: 112, fontWeight: 600, color: C.yellow, border: `5px solid ${C.yellow}`, borderRadius: 28, padding: '6px 40px', boxShadow: `0 0 ${60 + chipGlow * 60}px ${alpha(C.yellow, 0.35 + chipGlow * 0.3)}`, background: alpha(C.yellow, 0.08), transform: `scale(${1 + chipGlow * 0.05})` }}>
          VITE_*
        </div>
      </div>
      <Wire x1={480} y1={490} x2={480} y2={590} p={ramp(frame, whole - 12, whole)} color={C.grey} arrow />
      <div style={{ position: 'absolute', left: 480 - 120, top: 610, opacity: globe, transform: `scale(${0.7 + 0.3 * globe})` }}>
        {[0, 1, 2].map((i) => {
          const r = ((frame - whole + i * 14) % 42) / 42
          return frame > whole ? <div key={i} style={{ position: 'absolute', left: 120 - (110 + r * 90), top: 120 - (110 + r * 90), width: (110 + r * 90) * 2, height: (110 + r * 90) * 2, borderRadius: 999, border: `3px solid ${alpha(C.blue, 0.5 * (1 - r))}` }} /> : null
        })}
        <GlobeIcon size={240} color={C.blue} spin={frame / 80} style={{ filter: `drop-shadow(0 0 24px ${alpha(C.blue, 0.5)})` }} />
      </div>
      <Heading from={6} top={1000} size={72}>If it starts with <span style={{ fontFamily: mono, fontStyle: 'normal', fontSize: 62, color: C.yellow }}>VITE_</span>,</Heading>
      <Heading from={whole - 6} top={1100} size={72} color={C.blue}>the whole internet can read it.</Heading>
    </div>
  )
}

export function SecretsReel() {
  return (
    <Stage>
      <ReelAudio t={T} voiceVolume={1.14} musicVolume={0.43} duck={0.5} />
      <Scene t={T} id="hook"><Hook /></Scene>
      <Scene t={T} id="prefix"><Prefix /></Scene>
      <Scene t={T} id="find"><Find /></Scene>
      <Scene t={T} id="fix"><Fix /></Scene>
      <Scene t={T} id="rotate"><Rotate /></Scene>
      <Scene t={T} id="takeaway"><Takeaway /></Scene>
      <Captions t={T} />
    </Stage>
  )
}
