import { useState } from 'preact/hooks'
import type {
  MutateOptionsInterface,
  UseMutationPropsInterface,
} from './types.ts'

const useMutation = <TArgs, TResult>(
  props: UseMutationPropsInterface<TArgs, TResult>
) => {
  const { mutationFn, onSuccess } = props

  const [error, setError] = useState<Error | undefined>(undefined)
  const [isPending, setIsPending] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isError, setIsError] = useState(false)

  const mutate = async (
    args: TArgs,
    options?: MutateOptionsInterface<TArgs, TResult>
  ): Promise<void> => {
    try {
      setIsPending(true)
      setIsSuccess(false)
      setIsError(false)
      setError(undefined)

      const result = await mutationFn(args)
      onSuccess?.(args, result)
      options?.onSuccess?.(args, result)
      setIsSuccess(true)
    } catch (error) {
      const catchedError =
        error instanceof Error ? error : new Error(String(error))

      setError(catchedError)
      setIsError(true)

      props.onError?.(args, catchedError)
    } finally {
      setIsPending(false)
    }
  }

  return { mutate, error, isPending, isError, isSuccess }
}

export default useMutation
