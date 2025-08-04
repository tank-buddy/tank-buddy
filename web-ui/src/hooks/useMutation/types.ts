export type UseMutationPropsInterface<TArgs, TResult> = {
  mutationFn: (args: TArgs) => Promise<TResult>
  onSuccess?: (args: TArgs, result: TResult) => void
  onError?: (args: TArgs, error: Error) => void
}

export type MutateOptionsInterface<TArgs, TResult> = {
  onSuccess?: (args: TArgs, result: TResult) => void
}
