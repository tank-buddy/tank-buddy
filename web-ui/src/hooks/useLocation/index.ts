import { useEffect, useState } from 'preact/hooks'

const useLocation = () => {
  const [path, setPath] = useState(() => window.location.pathname)

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const navigate = (to: string) => {
    if (to !== path) {
      window.history.pushState({}, '', to)
      setPath(to)
    }
  }

  return { path, navigate }
}

export default useLocation
