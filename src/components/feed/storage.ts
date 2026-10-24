// localStorage can throw (Safari private mode, blocked site data, sandboxed previews), so every access is guarded.
export function readPref(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writePref(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Not persisting is fine: the feed still works, it just forgets the choice.
  }
}

export const KEYS = {
  sound: 'learnagram.sound',
  swipeHint: 'learnagram.swipe-hint-seen',
} as const
