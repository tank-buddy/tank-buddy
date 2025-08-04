import {
  type SubmitHandler,
  setValues,
  useForm,
  valiForm,
} from '@modular-forms/preact'
import { useEffect } from 'preact/hooks'
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

  const [settingsForm, { Form, Field }] = useForm<Settings>({
    validate: valiForm(SettingsFormSchema),
  })

  const handleSubmit: SubmitHandler<Settings> = async (values: Settings) => {
    await mutate(values as ConfigInterface)
  }

  useEffect(() => {
    console.log('xxx')
    if (isSuccess && config !== undefined) {
      console.log('xxx2', config)
      setValues(
        settingsForm,
        { ...config },
        {
          shouldDirty: true,
          shouldFocus: true,
          shouldTouched: true,
          shouldValidate: true,
        }
      )
    }
  }, [isSuccess, config, settingsForm])

  if (isLoading) {
    return <Spinner className="w-10 h-10" />
  }

  if (isError) {
    return <div>{error?.message}</div>
  }
  return (
    <div>
      {!isPatchPending && isSuccessfullyPatched && (
        <Alert type={'success'}>{t('alert.settings-save-successfully')}</Alert>
      )}
      {!isPatchPending && hasPatchErrors && (
        <Alert type={'error'}>
          <div>{t('alert.settings-could-not-be-saved')}</div>
          <div>{patchingError?.message}</div>
        </Alert>
      )}

      <Form onSubmit={handleSubmit}>
        <Field name="wifi.interface">
          {(field, props) => {
            return (
              <div class="mb-3">
                <Label>
                  <div>{t('label.mode')}</div>
                  <Select
                    {...props}
                    name={field.name}
                    options={{
                      C: t('option.client'),
                      AP: t('option.access-point'),
                    }}
                    value={field.value}
                    error={field.error}
                  />
                </Label>
              </div>
            )
          }}
        </Field>
        <Field name="wifi.ssid">
          {(field, props) => {
            return (
              <div class="mb-3">
                <Label>
                  <div>{t('label.ssid')}</div>
                  <Input
                    {...props}
                    name={field.name}
                    value={field.value}
                    error={field.error}
                  />
                </Label>
              </div>
            )
          }}
        </Field>
        <Field name="wifi.key">
          {(field, props) => {
            return (
              <div class="mb-3">
                <Label>
                  <div>{t('label.key')}</div>
                  <Input
                    {...props}
                    type="password"
                    name={field.name}
                    value={field.value}
                  />
                </Label>
              </div>
            )
          }}
        </Field>
        <Field name="waterTank.height" type="number">
          {(field, props) => {
            return (
              <div class="mb-3">
                <Label>
                  <div>{t('label.water-tank-height')}</div>
                  <Input
                    {...props}
                    type="number"
                    name={field.name}
                    value={field.value}
                  />
                </Label>
              </div>
            )
          }}
        </Field>
        <Field name="waterTank.minDistance" type="number">
          {(field, props) => {
            return (
              <div class="mb-3">
                <Label>
                  <div>{t('label.water-tank-min-distance')}</div>
                  <Input
                    {...props}
                    type="number"
                    name={field.name}
                    value={field.value}
                  />
                </Label>
              </div>
            )
          }}
        </Field>
        {!isPatchPending && (
          <Button type="submit" className="w-full">
            {t('button.save')}
          </Button>
        )}
        {isPatchPending && (
          <div className="w-full flex justify-center gap-2 p-3 text-sm font-medium text-white transition-colors bg-teal-600">
            <Spinner className="fill-white w-5 h-5 text-white/50 dark:text-white/50" />
            {t('text.loading')}
            ...
          </div>
        )}
      </Form>
    </div>
  )
}

export default SettingsForm
