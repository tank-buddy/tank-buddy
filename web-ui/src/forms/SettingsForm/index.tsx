import { useEffect, useState } from 'preact/hooks'
import Alert from '../../components/Alert'
import Button from '../../components/Button'
import Input from '../../components/Input'
import Label from '../../components/Label'
import Select from '../../components/Select'
import Spinner from '../../components/Spinner'
import { getDefaultConfig, patchDefaultConfig } from '../../utils/api'
import type { WifiInterface } from '../../utils/api/types.ts'
import { t } from '../../utils/i18n'

const SettingsForm = () => {
  const validationRules: Record<
    string,
    (value: string | number | undefined) => boolean
  > = {
    'wifi.interface': (value: string | number | undefined) =>
      value === 'C' || value === 'AP',
    'wifi.ssid': (value: string | number | undefined) =>
      typeof value === 'string' && value.length > 0,
    'wifi.key': (_value: string | number | undefined) => true,
    'waterTank.height': (value: string | number | undefined) =>
      value !== undefined && Number.isInteger(value) && Number(value) > 0,
    'waterTank.minDistance': (value: string | number | undefined) =>
      value !== undefined && Number.isInteger(value) && Number(value) >= 0,
  }

  const [isLoading, setIsLoading] = useState(true)
  const [isPatching, setIsPatching] = useState(false)
  const [patchingError, setPatchingError] = useState<Error | undefined>(
    undefined
  )
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({})
  const [formData, setFormData] = useState<
    Record<string, string | number | undefined>
  >({})

  useEffect(() => {
    const setInitialFormData = async () => {
      try {
        const defaultConfig = await getDefaultConfig()

        setFormData({
          'wifi.interface': defaultConfig.wifi.interface,
          'wifi.ssid': defaultConfig.wifi.ssid,
          'wifi.key': defaultConfig.wifi.key,
          'waterTank.height': defaultConfig.waterTank.height,
          'waterTank.minDistance': defaultConfig.waterTank.minDistance,
        })
      } catch (e) {
        console.warn(e)
      }

      setIsLoading(false)
    }

    setInitialFormData()
  }, [])

  const handleChange = (key: string, value: string | number | undefined) => {
    setFormErrors({ ...formErrors, [key]: !validationRules[key](value) })
    setFormData({ ...formData, [key]: value })
  }

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    setIsPatching(true)
    const isValid = Object.keys(formErrors).every((key) => !formErrors[key])

    if (!isValid) {
      setIsPatching(false)
      return
    }

    try {
      await patchDefaultConfig({
        wifi: {
          interface: formData['wifi.interface'] as WifiInterface,
          ssid: formData['wifi.ssid'] as string,
          key: formData['wifi.key'] as string | undefined,
        },
        waterTank: {
          height: formData['waterTank.height'] as number,
          minDistance: formData['waterTank.minDistance'] as number,
        },
      })
      setPatchingError(undefined)
    } catch (e) {
      console.warn(e)
      setPatchingError(e as Error)
    }

    setIsPatching(false)
  }

  if (isLoading) return <Spinner className="w-10 h-10" />

  return (
    <div>
      {!isPatching && patchingError === undefined && (
        <Alert type="success">{t('alert.settings-save-successfully')}</Alert>
      )}
      {!isPatching && patchingError && (
        <Alert type="error">
          <div>{t('alert.settings-could-not-be-saved')}</div>
          <div>{patchingError?.message}</div>
        </Alert>
      )}
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <Label>
            <div>{t('label.mode')}</div>
            <Select
              name="wifi.interface"
              value={formData['wifi.interface'] ?? ''}
              onChange={(e) =>
                handleChange(
                  'wifi.interface',
                  (e.target as HTMLSelectElement).value
                )
              }
              options={{
                C: t('option.client'),
                AP: t('option.access-point'),
              }}
              error={formErrors['wifi.interface']}
            />
          </Label>
        </div>

        <div class="mb-3">
          <Label>
            <div>{t('label.ssid')}</div>
            <Input
              name="wifi.ssid"
              value={formData['wifi.ssid'] ?? ''}
              onInput={(e) =>
                handleChange('wifi.ssid', (e.target as HTMLInputElement).value)
              }
              error={formErrors['wifi.ssid']}
            />
          </Label>
        </div>

        <div class="mb-3">
          <Label>
            <div>{t('label.key')}</div>
            <Input
              type="password"
              name="wifi.key"
              value={formData['wifi.key'] ?? ''}
              onInput={(e) =>
                handleChange('wifi.key', (e.target as HTMLInputElement).value)
              }
            />
          </Label>
        </div>

        <div class="mb-3">
          <Label>
            <div>{t('label.water-tank-height')}</div>
            <Input
              type="number"
              name="waterTank.height"
              value={formData['waterTank.height'] ?? ''}
              onInput={(e) =>
                handleChange(
                  'waterTank.height',
                  Number((e.target as HTMLInputElement).value)
                )
              }
              error={formErrors['waterTank.height']}
            />
          </Label>
        </div>

        <div class="mb-3">
          <Label>
            <div>{t('label.water-tank-min-distance')}</div>
            <Input
              type="number"
              name="waterTank.minDistance"
              value={formData['waterTank.minDistance'] ?? ''}
              onInput={(e) =>
                handleChange(
                  'waterTank.minDistance',
                  Number((e.target as HTMLInputElement).value)
                )
              }
              error={formErrors['waterTank.minDistance']}
            />
          </Label>
        </div>

        {!isPatching ? (
          <Button type="submit" className="w-full">
            {t('button.save')}
          </Button>
        ) : (
          <div className="w-full flex justify-center gap-2 p-3 text-sm font-medium text-white transition-colors bg-teal-600">
            <Spinner className="fill-white w-5 h-5 text-white/50 dark:text-white/50" />
            {t('text.loading')}...
          </div>
        )}
      </form>
    </div>
  )
}

export default SettingsForm
