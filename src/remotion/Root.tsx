import { Composition } from 'remotion'
import { COMPOSITIONS, FPS, HEIGHT, WIDTH } from '../reels/registry'
import { EXAMPLE_LESSON, lessonDurationInFrames, parseLesson } from '../../shared/lesson'
import { GeneratedReel } from '../reels/GeneratedReel'

// Studio/CLI entry so reels can be previewed with `npx remotion studio` or rendered as stills/MP4
export function RemotionRoot() {
  return (
    <>
      {Object.entries(COMPOSITIONS).filter(([id]) => id !== 'generated').map(([id, { component, frames }]) => (
        <Composition
          key={id}
          id={id}
          component={component}
          durationInFrames={frames}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
          defaultProps={id === 'session' ? { prompt: 'Add rate limiting to /login', repo: 'auth-service', concepts: ['Sliding window rate limiting', 'Why you key limits by IP and user', 'Returning 429 with Retry-After'] } : {}}
        />
      ))}
      <Composition
        id="generated"
        component={GeneratedReel}
        durationInFrames={lessonDurationInFrames(EXAMPLE_LESSON)}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{ lesson: EXAMPLE_LESSON }}
        calculateMetadata={({ props }) => ({ durationInFrames: lessonDurationInFrames(parseLesson(props.lesson)) })}
      />
    </>
  )
}
