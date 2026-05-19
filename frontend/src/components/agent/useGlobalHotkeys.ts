import { useEffect } from 'react'
import { useAppStore } from '../../store'

export function useGlobalHotkeys() {
  const { setChatOpen, setSessionsDrawerOpen } = useAppStore()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setChatOpen(true)
      }
      if (e.key === 'Escape') {
        setChatOpen(false)
        setSessionsDrawerOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setChatOpen, setSessionsDrawerOpen])
}
