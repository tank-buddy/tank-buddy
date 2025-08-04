import { patchDefaultConfig } from '../../utils/api'
import type { ConfigInterface } from '../../utils/api/types.ts'
import useMutation from '../useMutation'
import type { UsePatchDefaultConfigPropsInterface } from './types.ts'

const createPatchDefaultConfig = (props: UsePatchDefaultConfigPropsInterface) =>
  useMutation({
    mutationFn: (config: ConfigInterface) => patchDefaultConfig(config),
    onSuccess: () => {
      props.onSuccess?.()
    },
  })

export default createPatchDefaultConfig
