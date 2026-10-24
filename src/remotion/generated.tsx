import { Composition, registerRoot } from 'remotion'
import { EXAMPLE_LESSON, LESSON_FPS, lessonDurationInFrames, parseLesson } from '../../shared/lesson'
import { GeneratedReel } from '../reels/GeneratedReel'
import './fonts.css'

/** Dedicated worker entry: new MP4 jobs do not bundle all of the curated demo animations. */
export function GeneratedRoot() {
  return (
    <Composition
      id="generated"
      component={GeneratedReel}
      durationInFrames={lessonDurationInFrames(EXAMPLE_LESSON)}
      fps={LESSON_FPS}
      width={1080}
      height={1920}
      defaultProps={{ lesson: EXAMPLE_LESSON }}
      calculateMetadata={({ props }) => ({ durationInFrames: lessonDurationInFrames(parseLesson(props.lesson)) })}
    />
  )
}

registerRoot(GeneratedRoot)
