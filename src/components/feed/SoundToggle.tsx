import { AnimatePresence, motion } from 'motion/react'
import { Volume2, VolumeX } from 'lucide-react'
import type { SyntheticEvent } from 'react'

/** Instagram-style speaker button in the top-right of a reel. Expands into "Tap for sound" until the first gesture. */
export function SoundToggle({ muted, hint, onToggle, className = '' }: { muted: boolean; hint: boolean; onToggle: (e: SyntheticEvent) => void; className?: string }) {
  return (
    <button
      type="button"
      data-sound-toggle
      onClick={(e) => {
        e.stopPropagation()
        onToggle(e)
      }}
      onPointerUp={(e) => e.stopPropagation()}
      aria-label={muted ? 'Turn sound on (M)' : 'Turn sound off (M)'}
      aria-pressed={!muted}
      title={muted ? 'Sound on (M)' : 'Sound off (M)'}
      className={`group flex h-11 min-w-11 items-center justify-end rounded-full focus-visible:outline-offset-0 ${className}`}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 520, damping: 40 }}
        className="relative flex h-9 items-center gap-1.5 overflow-hidden rounded-full bg-black/45 px-[9px] text-white ring-1 ring-white/12 backdrop-blur-md transition-colors group-hover:bg-black/60"
      >
        {hint && (
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full ring-2 ring-white/50"
            animate={{ opacity: [0.7, 0, 0.7] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        <motion.span layout="position" className="grid size-[18px] shrink-0 place-items-center">
          {muted ? <VolumeX size={18} strokeWidth={2} /> : <Volume2 size={18} strokeWidth={2} />}
        </motion.span>
        <AnimatePresence initial={false}>
          {hint && (
            <motion.span
              key="hint"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.22 }}
              className="pr-1 text-[13px] font-semibold whitespace-nowrap"
            >
              Tap for sound
            </motion.span>
          )}
        </AnimatePresence>
      </motion.span>
    </button>
  )
}
