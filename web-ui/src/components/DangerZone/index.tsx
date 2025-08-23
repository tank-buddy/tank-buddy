import { useState } from 'preact/hooks'
import { putSystemOperation } from '../../utils/api'
import { t } from '../../utils/i18n'
import Button from '../Button'
import Spinner from '../Spinner'

const DangerZone = () => {
  const [performingSoftReset, setPerformingSoftReset] = useState(false)
  const [performingHardReset, setPerformingHardReset] = useState(false)

  const onSoftResetClick = async () => {
    setPerformingSoftReset(true)

    try {
      await putSystemOperation('soft-reset')
    } catch (e) {
      console.warn(e)
    }

    setPerformingSoftReset(false)
  }

  const onHardResetClick = async () => {
    setPerformingHardReset(true)

    try {
      await putSystemOperation('hard-reset')
    } catch (e) {
      console.warn(e)
    }

    setPerformingHardReset(false)
  }

  return (
    <div class="p-5">
      <div class="text-xl mb-3 font-semibold text-gray-800 dark:text-white/90">
        {t('title.danger-zone')}
      </div>
      <div class="border border-red-200 bg-white dark:border-red-800 dark:bg-white/[0.03]">
        <div class="md:flex md:gap-5 md:items-center border-b border-gray-300 dark:border-gray-700 p-5">
          <div class="mb-3 md:mb-0 md:flex-grow">{t('text.soft-reset')}</div>
          <div>
            {!performingSoftReset && (
              <Button
                className="text-nowrap"
                onClick={onSoftResetClick}
                disabled={performingHardReset}
              >
                {t('action.soft-reset')}
              </Button>
            )}
            {performingSoftReset && (
              <div className="flex justify-center gap-2 p-3 text-sm font-medium text-white transition-colors bg-teal-600">
                <Spinner className="fill-white w-5 h-5 text-white/50 dark:text-white/50" />
                {t('text.loading')}
              </div>
            )}
          </div>
        </div>
        <div class="md:flex md:gap-5 md:items-center p-5">
          <div class="mb-3 md:mb-0 md:flex-grow">{t('text.hard-reset')}</div>
          <div>
            {!performingHardReset && (
              <Button
                className="text-nowrap"
                onClick={onHardResetClick}
                disabled={performingSoftReset}
              >
                {t('action.hard-reset')}
              </Button>
            )}
            {performingHardReset && (
              <div className="flex justify-center gap-2 p-3 text-sm font-medium text-white transition-colors bg-teal-600">
                <Spinner className="fill-white w-5 h-5 text-white/50 dark:text-white/50" />
                {t('text.loading')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DangerZone
