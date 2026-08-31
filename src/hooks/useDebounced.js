import { useEffect, useState } from 'react'

// Returns `value` once it has stopped changing for `delay` ms. Keeps a search box
// that fires a request per keystroke down to one request per pause in typing.
export function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timeout)
  }, [value, delay])

  return debounced
}
