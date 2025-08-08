import { useEffect, useState } from 'preact/hooks'
import Alert from '../../components/Alert'
import Button from '../../components/Button'
import Input from '../../components/Input'
import Label from '../../components/Label'
import Select from '../../components/Select'
import Spinner from '../../components/Spinner'
import useGetDefaultConfig from '../../hooks/useGetDefaultConfig'
import usePatchDefaultConfig from '../../hooks/usePatchDefaultConfig'
import { useIntl } from '../../providers/IntlProvider'
import type { ConfigInterface } from '../../utils/api/types'
import { SettingsFormSchema } from './schemas.ts'
import type { Settings } from './types.ts'

const settingsToConfig = (settings: Settings): ConfigInterface => {
  return {
    wifi: {
      interface: settings['wifi.interface'],
      ssid: settings['wifi.ssid'],
      key: settings['wifi.key'],
    },
    waterTank: {
      height: settings['waterTank.height'],
      minDistance: settings['waterTank.minDistance'],
    },
  }
}

const SettingsForm = () => {
  const { t } = useIntl()
  const {
    data: config,
    refetch,
    isSuccess,
    isLoading,
    isError,
    error,
  } = useGetDefaultConfig()

  const {
    mutate,
    isSuccess: isSuccessfullyPatched,
    isPending: isPatchPending,
    isError: hasPatchErrors,
    error: patchingError,
  } = usePatchDefaultConfig({
    onSuccess: async () => {
      await refetch()
    },
  })

  const [formData, setFormData] = useState<Partial<Settings>>({})
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof Settings, string>>
  >({})

  useEffect(() => {
    if (isSuccess && config !== undefined) {
      setFormData({
        'wifi.interface': config.wifi?.interface,
        'wifi.ssid': config.wifi?.ssid,
        'wifi.key': config.wifi?.key,
        'waterTank.height': config.waterTank?.height,
        'waterTank.minDistance': config.waterTank?.minDistance,
      })
    }
  }, [isSuccess, config])

  const handleChange = (
    key: keyof Settings,
    value: number | string | undefined
  ) => {
    setFormData((prev: Partial<Settings>) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    setFormErrors({})

    const parsed = SettingsFormSchema.safeParse(formData)
    console.log(parsed)
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof Settings, string>> = {}
      for (const issue of parsed.error.issues) {
        const path = issue.path.join('.') as keyof Settings
        fieldErrors[path] = issue.message
      }
      setFormErrors(fieldErrors)
      return
    }

    await mutate(settingsToConfig(parsed.data))
  }

  if (isLoading) return <Spinner className="w-10 h-10" />
  if (isError) return <div>{error?.message}</div>

  return (
    <div>
      {!isPatchPending && isSuccessfullyPatched && (
        <Alert type="success">{t('alert.settings-save-successfully')}</Alert>
      )}
      {!isPatchPending && hasPatchErrors && (
        <Alert type="error">
          <div>{t('alert.settings-could-not-be-saved')}</div>
          <div>{patchingError?.message}</div>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <div class="mb-3">
          <Label>
            <div>{t('label.mode')}</div>
            <Select
              name="wifi.interface"
              value={formData['wifi.interface'] ?? ''}
              onInput={(e) =>
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

        {!isPatchPending ? (
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
