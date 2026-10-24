export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg viewBox="0 0 64 64" width={compact ? 28 : 26} height={compact ? 28 : 26} aria-hidden>
        <circle cx="32" cy="32" r="22" fill="none" stroke="#58C4DD" strokeWidth="5" />
        <path d="M26.5 21.5v21l16.5-10.5z" fill="#F4D35E" />
      </svg>
      {!compact && <span className="font-serif text-[24px] italic leading-none tracking-tight">learnagram</span>}
    </span>
  )
}
