import { useEffect, useState } from 'preact/hooks'
import type { WaterTankInterface } from '../utils/api/types'
import { getDefaultWaterTank } from '../utils/api'

const LevelIndicator = () => {
  const [waterTank, setWaterTank] = useState<WaterTankInterface | null>(null)

  useEffect(() => {
    const fetchWaterTank = async () => {
      try {
        setWaterTank(await getDefaultWaterTank())
      } catch (err) {
        console.error('API error:', err)
      }
    }

    fetchWaterTank() // Initial load

    const interval = setInterval(fetchWaterTank, 5000) // every second

    return () => {
      clearInterval(interval)
    }
  }, [])

  if (waterTank === null) {
    return null
  }

  const fillHeight = waterTank.height - waterTank.distanceToWater
  const percentage = (fillHeight * 100) / waterTank.height

  return (
    <div className="p-5">
      <div className="text-xl mb-3 font-semibold text-gray-800 dark:text-white/90">
        Level Indicator
      </div>
      <div className="border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex items-center gap-3">
          <ul className="flex flex-col justify-between text-xs h-63 w-10 items-end">
            <li>100 %</li>
            <li>75 %</li>
            <li>50 %</li>
            <li>25 %</li>
            <li>0 %</li>
          </ul>
          <div className="flex-grow">
            <div className="w-full h-60 border border-gray-300 dark:border-gray-700 relative">
              <div
                className="absolute bottom-0 w-full bg-linear-to-t from-teal-500/10 to-teal-500/30 border-t border-teal-500 z-5"
                style={{ height: `${percentage}%` }}
              />
            </div>
          </div>
          <div className="h-60 relative w-10">
            <div
              className="text-xs text-teal-500 absolute z-5 text-nowrap -mt-2"
              style={{ top: `${100 - percentage}%` }}
            >
              {percentage} %
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LevelIndicator
