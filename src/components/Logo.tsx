// Unvibe mark: a wobbly (vibe-coded) wave that straightens into a clean line once you understand it
export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
      <path d="M6 32 C10 14, 16 14, 19 32 S28 50, 32 32" fill="none" stroke="#FC6255" strokeWidth="5.5" strokeLinecap="round" />
      <path d="M32 32 H51" stroke="#83C167" strokeWidth="5.5" strokeLinecap="round" />
      <circle cx="55" cy="32" r="5" fill="#83C167" />
    </svg>
  )
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Mark size={compact ? 30 : 28} />
      {!compact && <span className="font-sans text-[23px] font-semibold leading-none tracking-[-0.04em]">unvibe</span>}
    </span>
  )
}
