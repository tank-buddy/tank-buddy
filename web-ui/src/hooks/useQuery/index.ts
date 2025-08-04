import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import type {
  UseQueryPropsInterface,
  UseQueryResultInterface,
} from './types.ts'

const useQuery = <T>(
  props: UseQueryPropsInterface<T>
): UseQueryResultInterface<T> => {
  const { queryFn, interval } = props

  const [data, setData] = useState<T | undefined>(undefined)
  const [error, setError] = useState<Error | undefined>(undefined)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isError, setIsError] = useState<boolean>(false)
  const [isSuccess, setIsSuccess] = useState<boolean>(false)

  const mountedRef = useRef(true)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setIsError(false)
    setIsSuccess(false)

    try {
      const result = await queryFn()
      if (!mountedRef.current) {
        return
      }
      setData(result)
      setIsSuccess(true)
      setError(undefined)
    } catch (err) {
      if (!mountedRef.current) {
        return
      }

      setError(err as Error)
      setIsError(true)
    } finally {
      if (mountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true

    fetchData()

    if (interval === undefined) return

    const id = setInterval(fetchData, interval)

    return () => {
      mountedRef.current = false
      clearInterval(id)
    }
  }, [fetchData, interval])

  return { data, error, isLoading, isError, isSuccess, refetch: fetchData }
}

export default useQuery
