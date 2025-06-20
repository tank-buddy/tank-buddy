import { performHardReset, performSoftReset } from '../utils/api'
import Button from './Button'

const DangerZone = () => {
  const onSoftResetClick = async () => {
    await performSoftReset()
  }

  const onHardResetClick = async () => {
    await performHardReset()
  }

  return (
    <div className="p-5">
      <div className="text-xl mb-3 font-semibold text-gray-800 dark:text-white/90">
        DangerZone
      </div>
      <div className="border border-red-200 bg-white dark:border-red-800 dark:bg-white/[0.03]">
        <div className="md:flex md:gap-5 md:items-center border-b border-gray-300 dark:border-gray-700 p-5">
          <div className="mb-3 md:mb-0 md:flex-grow">
            Performs a soft reset of the interpreter, deleting all Python
            objects and resetting the Python heap.
          </div>
          <div>
            <Button className="text-nowrap" onClick={onSoftResetClick}>
              Soft Reset
            </Button>
          </div>
        </div>
        <div className="md:flex md:gap-5 md:items-center p-5">
          <div className="mb-3 md:mb-0 md:flex-grow">
            Hard resets the device in a manner similar to pushing the external
            RESET button.
          </div>
          <div>
            <Button className="text-nowrap" onClick={onHardResetClick}>
              Hard Reset
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DangerZone
