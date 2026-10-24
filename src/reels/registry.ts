import type { ComponentType } from 'react'
import { BACKOFF_REEL_FRAMES, BackoffReel } from './BackoffReel'
import { HASHING_REEL_FRAMES, HashingReel } from './HashingReel'
import { INDEX_REEL_FRAMES, IndexReel } from './IndexReel'
import { INJECTION_REEL_FRAMES, InjectionReel } from './InjectionReel'
import { JWT_REEL_FRAMES, JwtReel } from './JwtReel'
import { NPLUS1_REEL_FRAMES, NPlusOneReel } from './NPlusOneReel'
import { POLL_REEL_FRAMES, PollReel } from './PollReel'
import { RACE_REEL_FRAMES, RaceReel } from './RaceReel'
import { RLS_REEL_FRAMES, RlsReel } from './RlsReel'
import { SECRETS_REEL_FRAMES, SecretsReel } from './SecretsReel'
import { SESSION_REEL_FRAMES, SessionReel } from './SessionReel'
import { XSS_REEL_FRAMES, XssReel } from './XssReel'

export type ReelKind = 'index' | 'injection' | 'race' | 'jwt' | 'poll' | 'session' | 'rls' | 'secrets' | 'nplus1' | 'backoff' | 'hashing' | 'xss'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const COMPOSITIONS: Record<ReelKind, { component: ComponentType<any>; frames: number }> = {
  index: { component: IndexReel, frames: INDEX_REEL_FRAMES },
  injection: { component: InjectionReel, frames: INJECTION_REEL_FRAMES },
  race: { component: RaceReel, frames: RACE_REEL_FRAMES },
  jwt: { component: JwtReel, frames: JWT_REEL_FRAMES },
  poll: { component: PollReel, frames: POLL_REEL_FRAMES },
  session: { component: SessionReel, frames: SESSION_REEL_FRAMES },
  rls: { component: RlsReel, frames: RLS_REEL_FRAMES },
  secrets: { component: SecretsReel, frames: SECRETS_REEL_FRAMES },
  nplus1: { component: NPlusOneReel, frames: NPLUS1_REEL_FRAMES },
  backoff: { component: BackoffReel, frames: BACKOFF_REEL_FRAMES },
  hashing: { component: HashingReel, frames: HASHING_REEL_FRAMES },
  xss: { component: XssReel, frames: XSS_REEL_FRAMES },
}

export const FPS = 30
export const WIDTH = 1080
export const HEIGHT = 1920
