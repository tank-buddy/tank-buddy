import { putSystemOperation } from '../../utils/api'
import type { SystemOperationIdentifier } from '../../utils/api/types'
import useMutation from '../useMutation'

const usePutSystemOperation = () =>
  useMutation({
    mutationFn: (identifier: SystemOperationIdentifier) =>
      putSystemOperation(identifier),
  })

export default usePutSystemOperation
