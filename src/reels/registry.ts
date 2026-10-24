import type { ComponentType } from 'react'
import { INDEX_REEL_FRAMES, IndexReel } from './IndexReel'
import { INJECTION_REEL_FRAMES, InjectionReel } from './InjectionReel'
import { JWT_REEL_FRAMES, JwtReel } from './JwtReel'
import { POLL_REEL_FRAMES, PollReel } from './PollReel'
import { RACE_REEL_FRAMES, RaceReel } from './RaceReel'
import { SESSION_REEL_FRAMES, SessionReel } from './SessionReel'

export type ReelKind = 'index' | 'injection' | 'race' | 'jwt' | 'poll' | 'session'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const COMPOSITIONS: Record<ReelKind, { component: ComponentType<any>; frames: number }> = {
  index: { component: IndexReel, frames: INDEX_REEL_FRAMES },
  injection: { component: InjectionReel, frames: INJECTION_REEL_FRAMES },
  race: { component: RaceReel, frames: RACE_REEL_FRAMES },
  jwt: { component: JwtReel, frames: JWT_REEL_FRAMES },
  poll: { component: PollReel, frames: POLL_REEL_FRAMES },
  session: { component: SessionReel, frames: SESSION_REEL_FRAMES },
}

export const FPS = 30
export const WIDTH = 1080
export const HEIGHT = 1920
