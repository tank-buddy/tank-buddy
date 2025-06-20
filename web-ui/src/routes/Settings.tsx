import DangerZone from '../components/DangerZone'
import SettingsForm from '../forms/SettingsForm'

const Settings = () => {
  return (
    <>
      <div className="p-5">
        <div className="text-xl mb-3 font-semibold text-gray-800 dark:text-white/90">
          Settings
        </div>
        <div className="border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <SettingsForm />
        </div>
      </div>
      <DangerZone />
    </>
  )
}

export default Settings
