import { useEffect, useState } from 'preact/hooks'
import { getDefaultWaterTank } from '../../utils/api'
import { t } from '../../utils/i18n'

const LevelIndicator = () => {
  const [percentage, setPercentage] = useState<number>(0)
  const [timestamp, setTimestamp] = useState<number | undefined>(undefined)

  useEffect(() => {
    setInterval(async () => {
      try {
        const defaultWaterTank = await getDefaultWaterTank()

        const fillHeight =
          defaultWaterTank.height - defaultWaterTank.distanceToWater
        const percentage = Math.floor(
          (fillHeight * 100) / defaultWaterTank.height
        )

        setPercentage(percentage)
        setTimestamp(defaultWaterTank.timestamp)
      } catch (e) {
        console.error(e)
      }
    }, 5000)
  }, [])

  return (
    <div class="p-5">
      <div class="text-xl mb-3 font-semibold text-gray-800 dark:text-white/90">
        {t('title.level-indicator')}
      </div>
      <div class="border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <div class="flex items-center gap-3">
          <ul class="flex flex-col justify-between text-xs h-63 w-10 items-end">
            <li>100 %</li>
            <li>75 %</li>
            <li>50 %</li>
            <li>25 %</li>
            <li>0 %</li>
          </ul>
          <div class="flex-grow">
            <div class="w-full h-60 border border-gray-300 dark:border-gray-700 relative">
              <div
                class="absolute bottom-0 w-full bg-linear-to-t from-teal-500/10 to-teal-500/30 border-t border-teal-500 z-5"
                style={{ height: `${percentage}%` }}
              />
            </div>
          </div>
          <div class="h-60 relative w-10">
            <div
              class="text-xs text-teal-500 absolute z-5 text-nowrap -mt-2"
              style={{ top: `${100 - percentage}%` }}
            >
              {percentage} %
            </div>
          </div>
        </div>
        {timestamp !== undefined && (
          <div className="mt-3 text-xs">
            {t('text.last-updated')}: {new Date(timestamp).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  )
}

export default LevelIndicator
