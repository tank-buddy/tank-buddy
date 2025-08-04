import { useState } from 'preact/hooks'
import usePutSystemOperation from '../../hooks/usePutSystemOperation'
import { useIntl } from '../../providers/IntlProvider'
import Button from '../Button'
import Spinner from '../Spinner'

const DangerZone = () => {
  const { t } = useIntl()

  const [performingSoftReset, setPerformingSoftReset] = useState(false)
  const [performingHardReset, setPerformingHardReset] = useState(false)

  const { mutate } = usePutSystemOperation()

  const onSoftResetClick = async () => {
    setPerformingSoftReset(true)
    await mutate('soft-reset', {
      onSuccess: () => {
        setPerformingSoftReset(false)
      },
    })
  }

  const onHardResetClick = async () => {
    setPerformingHardReset(true)
    await mutate('hard-reset', {
      onSuccess: () => {
        setPerformingHardReset(false)
      },
    })
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
