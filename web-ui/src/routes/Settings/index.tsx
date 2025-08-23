import DangerZone from '../../components/DangerZone'
import SettingsForm from '../../forms/SettingsForm'
import { t } from '../../utils/i18n'

const Settings = () => {
  return (
    <div>
      <div class="p-5">
        <div class="text-xl mb-3 font-semibold text-gray-800 dark:text-white/90">
          {t('title.settings')}
        </div>
        <div class="border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <SettingsForm />
        </div>
      </div>
      <DangerZone />
    </div>
  )
}

export default Settings
