import { useEffect, useState } from 'react'

export const THEME_STORAGE_KEY = 'mavio-theme'

// Light/dark, as a class on <html> that index.css keys every colour variable off.
//
// The initial value is READ BACK OFF THE DOM rather than recomputed here: the inline script
// in index.html has already resolved stored-preference-then-system and applied the class
// before first paint (without it the app renders light, then flips — the flash is worse than
// no dark mode). Reading it back means that resolution lives in exactly one place.
//
// localStorage is only written by `toggle`, never by the effect. Persisting on mount would
// turn "no preference yet, follow the OS" into an explicit choice the first time anyone
// loaded the page, and their laptop switching to dark at sunset would stop being followed.
export function useTheme() {
  const [theme, setTheme] = useState(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  )

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  function toggle() {
    setTheme((previous) => {
      const next = previous === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next)
      } catch {
        // Private mode / storage disabled. The toggle still works for this session.
      }
      return next
    })
  }

  return [theme, toggle]
}
