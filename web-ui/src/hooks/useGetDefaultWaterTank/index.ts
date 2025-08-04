import { getDefaultWaterTank } from '../../utils/api'
import type { WaterTankInterface } from '../../utils/api/types.ts'
import useQuery from '../useQuery'
import type { UseGetDefaultWaterTankPropsInterface } from './types.ts'

const useGetDefaultWaterTank = (props?: UseGetDefaultWaterTankPropsInterface) =>
  useQuery<WaterTankInterface>({
    queryFn: async () => await getDefaultWaterTank(),
    interval:
      props !== undefined && props.interval !== undefined
        ? props.interval
        : undefined,
  })

export default useGetDefaultWaterTank
