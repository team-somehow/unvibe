import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, ChevronUp } from 'lucide-react'

/** Instagram-web style previous/next buttons at the right edge of the feed. */
export function NavButtons({ canPrev, canNext, onPrev, onNext, hidden }: { canPrev: boolean; canNext: boolean; onPrev: () => void; onNext: () => void; hidden: boolean }) {
  const cls =
    'grid size-11 place-items-center rounded-full bg-white/[0.09] text-white ring-1 ring-white/10 backdrop-blur-md transition hover:bg-white/[0.16] active:scale-95 disabled:pointer-events-none disabled:opacity-25'
  return (
    <div
      className={`absolute top-1/2 right-5 z-20 hidden -translate-y-1/2 flex-col gap-3 transition-opacity duration-200 @min-[700px]:flex ${hidden ? 'pointer-events-none opacity-0' : ''}`}
    >
      <button type="button" onClick={onPrev} disabled={!canPrev} aria-label="Previous reel" title="Previous (↑)" className={cls}>
        <ChevronUp size={22} />
      </button>
      <button type="button" onClick={onNext} disabled={!canNext} aria-label="Next reel" title="Next (↓)" className={cls}>
        <ChevronDown size={22} />
      </button>
    </div>
  )
}

/** First-visit hint on phones; it leaves after the first scroll. */
export function SwipeHint({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -24, transition: { duration: 0.25 } }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          className="pointer-events-none absolute inset-x-0 bottom-[30%] z-30 flex justify-center"
          role="status"
        >
          <div className="flex items-center gap-2.5 rounded-full bg-black/55 py-2 pr-4 pl-3 ring-1 ring-white/12 backdrop-blur-md">
            <motion.span animate={{ y: [3, -3, 3] }} transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }} className="flex flex-col items-center leading-none">
              <ChevronUp size={16} strokeWidth={2.6} className="-mb-2 opacity-45" />
              <ChevronUp size={16} strokeWidth={2.6} />
            </motion.span>
            <span className="text-[13.5px] font-semibold">Swipe up for the next reel</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
