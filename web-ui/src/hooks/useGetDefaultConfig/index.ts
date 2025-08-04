import { getDefaultConfig } from '../../utils/api'
import type { ConfigInterface } from '../../utils/api/types.ts'
import useQuery from '../useQuery'

const useGetDefaultConfig = () =>
  useQuery<ConfigInterface>({
    queryFn: async () => await getDefaultConfig(),
  })

export default useGetDefaultConfig
