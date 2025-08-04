export interface UseQueryPropsInterface<T> {
  queryFn: () => Promise<T>
  interval?: number | undefined
}
export interface UseQueryResultInterface<T> {
  data: T | undefined
  error: Error | undefined
  isLoading: boolean
  isError: boolean
  isSuccess: boolean
  refetch: () => Promise<void>
}
