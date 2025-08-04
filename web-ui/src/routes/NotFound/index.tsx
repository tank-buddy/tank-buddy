import { useIntl } from '../../providers/IntlProvider'

const NotFound = () => {
  const { t } = useIntl()

  return (
    <div class="flex flex-col items-center justify-center h-full p-5">
      <div class="text-5xl text-teal-500 mb-3">{t('title.404')}</div>
      <div class="text-xl text-gray-800 dark:text-white/90 mb-3">
        {t('sub-title.something-is-missing')}
      </div>
      <div class="text-center">{t('text.sorry')}</div>
    </div>
  )
}

export default NotFound
