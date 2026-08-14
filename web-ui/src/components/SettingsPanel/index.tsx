import { useEffect, useState } from 'preact/hooks'
import { getSettings, patchSettings, putSystemOperation } from '../../utils/api'
import type {
  SettingsInterface,
  SystemOperationIdentifier,
} from '../../utils/api/types'
import { t } from '../../utils/i18n'
import Alert from '../Alert'
import Button from '../Button'
import Card from '../Card'
import ConfirmSheet from '../ConfirmSheet'
import Input from '../Input'
import Row from '../Row'
import SegmentedControl from '../SegmentedControl'
import Spinner from '../Spinner'
import Switch from '../Switch'

type FieldKind = 'text' | 'password' | 'number' | 'switch' | 'segmented'

interface Field {
  /** Dot path into SettingsInterface, matching MUTABLE_FIELDS in settings.py. */
  path: string
  label: string
  kind: FieldKind
  options?: Record<string, string>
}

/** Group order on screen; the section is the first segment of every path. */
const SECTIONS = ['wifi', 'mqtt', 'tank']

const FIELDS: Field[] = [
  {
    path: 'wifi.mode',
    label: 'label.mode',
    kind: 'segmented',
    options: { C: 'option.client', AP: 'option.access-point' },
  },
  { path: 'wifi.ssid', label: 'label.ssid', kind: 'text' },
  { path: 'wifi.key', label: 'label.key', kind: 'password' },
  { path: 'mqtt.enabled', label: 'label.mqtt-enabled', kind: 'switch' },
  { path: 'mqtt.host', label: 'label.mqtt-host', kind: 'text' },
  { path: 'mqtt.port', label: 'label.mqtt-port', kind: 'number' },
  { path: 'mqtt.user', label: 'label.mqtt-user', kind: 'text' },
  { path: 'mqtt.password', label: 'label.mqtt-password', kind: 'password' },
  { path: 'mqtt.topic_prefix', label: 'label.mqtt-topic-prefix', kind: 'text' },
  { path: 'tank.height', label: 'label.tank-height', kind: 'number' },
  {
    path: 'tank.min_distance',
    label: 'label.tank-min-distance',
    kind: 'number',
  },
]

const RESETS: SystemOperationIdentifier[] = ['soft-reset', 'hard-reset']

const NUMBER_FIELDS = new Set(
  FIELDS.filter((field) => field.kind === 'number').map((field) => field.path)
)

/** Dots are legal in a test id but awkward to read in a selector. */
const toTestId = (path: string): string => path.replace('.', '-')

/**
 * Form state is kept as raw strings rather than parsed values. Parsing on every
 * keystroke turned an empty number field into 0, which made the field
 * impossible to clear and could submit an out-of-range value.
 */
type RawValue = string | boolean
type RawSettings = Record<string, RawValue>

type Status = 'idle' | 'saving' | 'saved' | 'saved-reboot'

const toRawSettings = (settings: SettingsInterface): RawSettings => {
  const raw: RawSettings = {}

  for (const [section, values] of Object.entries(settings)) {
    for (const [key, value] of Object.entries(
      values as Record<string, string | number | boolean | null>
    )) {
      raw[`${section}.${key}`] =
        typeof value === 'boolean' ? value : (value?.toString() ?? '')
    }
  }

  return raw
}

/**
 * Only fields the user actually touched. Sending everything made the API
 * answer `reboot_required: true` on every save, because wifi.* and mqtt.* are
 * reboot-required in MUTABLE_FIELDS.
 */
const buildPatch = (
  current: RawSettings,
  initial: RawSettings
): Partial<SettingsInterface> => {
  const patch: Record<string, Record<string, string | number | boolean>> = {}

  for (const { path } of FIELDS) {
    const value = current[path]
    if (value === initial[path]) {
      continue
    }

    // An empty number field is not a number; leave it out rather than send 0.
    if (NUMBER_FIELDS.has(path) && value === '') {
      continue
    }

    const [section, key] = path.split('.')
    patch[section] ??= {}
    patch[section][key] = NUMBER_FIELDS.has(path) ? Number(value) : value
  }

  return patch
}

const SettingsPanel = () => {
  const [values, setValues] = useState<RawSettings | null>(null)
  const [initial, setInitial] = useState<RawSettings | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [busyReset, setBusyReset] = useState<SystemOperationIdentifier | null>(
    null
  )
  const [pendingReset, setPendingReset] =
    useState<SystemOperationIdentifier | null>(null)

  useEffect(() => {
    getSettings()
      .then((settings) => {
        const raw = toRawSettings(settings)
        setValues(raw)
        setInitial(raw)
      })
      .catch(() => {
        setError(t('alert.settings-could-not-be-loaded'))
      })
  }, [])

  const set = (path: string, value: RawValue) => {
    setValues((previous) => ({ ...previous, [path]: value }))
    // Any edit invalidates the previous outcome.
    setStatus('idle')
  }

  const save = async () => {
    if (values === null || initial === null) {
      return
    }

    setStatus('saving')
    setError(null)

    try {
      const result = await patchSettings(buildPatch(values, initial))

      if (!result.success) {
        setError(result.message ?? t('alert.settings-could-not-be-saved'))
        setStatus('idle')
        return
      }

      setInitial(values)
      setStatus(result.reboot_required === true ? 'saved-reboot' : 'saved')
    } catch {
      setError(t('alert.settings-could-not-be-saved'))
      setStatus('idle')
    }
  }

  const reset = async (identifier: SystemOperationIdentifier) => {
    setBusyReset(identifier)
    // Without this an earlier failure outlived every later action and could
    // sit next to a success message.
    setError(null)

    try {
      await putSystemOperation(identifier)
    } catch {
      setError(t('alert.reset-failed'))
    } finally {
      setBusyReset(null)
    }
  }

  if (values === null) {
    return error === null ? <Spinner /> : <Alert type="error">{error}</Alert>
  }

  const saving = status === 'saving'
  const dirty =
    initial !== null && Object.keys(buildPatch(values, initial)).length > 0

  const renderField = (field: Field) => {
    const value = values[field.path] ?? ''
    const testId = toTestId(field.path)

    if (field.kind === 'segmented') {
      return (
        <Row
          key={field.path}
          label={t(field.label)}
          testId={`row-${testId}`}
          stacked
        >
          <SegmentedControl
            name={field.path}
            label={t(field.label)}
            value={String(value)}
            testId={`segmented-${testId}`}
            options={Object.fromEntries(
              Object.entries(field.options ?? {}).map(([option, label]) => [
                option,
                t(label),
              ])
            )}
            onChange={(next) => {
              set(field.path, next)
            }}
          />
        </Row>
      )
    }

    if (field.kind === 'switch') {
      return (
        <Row key={field.path} label={t(field.label)} testId={`row-${testId}`}>
          <Switch
            name={field.path}
            checked={value === true}
            testId={`switch-${testId}`}
            onChange={(checked) => {
              set(field.path, checked)
            }}
          />
        </Row>
      )
    }

    return (
      <Row key={field.path} label={t(field.label)} testId={`row-${testId}`}>
        <Input
          name={field.path}
          type={field.kind}
          error={NUMBER_FIELDS.has(field.path) && value === ''}
          // An unset credential would otherwise render as an empty row that
          // reads as a rendering fault rather than as "nothing configured".
          placeholder={t('text.not-set')}
          value={String(value)}
          testId={`input-${testId}`}
          onInput={(event) => {
            set(field.path, event.currentTarget.value)
          }}
        />
      </Row>
    )
  }

  return (
    <form
      data-testid="settings-panel"
      onSubmit={(event) => {
        event.preventDefault()
        void save()
      }}
    >
      <h2 class="mb-3 px-4 text-[34px] leading-tight font-bold tracking-tight text-label">
        {t('title.settings')}
      </h2>

      {error !== null && <Alert type="error">{error}</Alert>}
      {status === 'saved' && (
        <Alert type="success">{t('alert.settings-save-successfully')}</Alert>
      )}
      {status === 'saved-reboot' && (
        <Alert type="warning">{t('alert.reboot-required')}</Alert>
      )}

      {SECTIONS.map((section) => (
        <Card
          key={section}
          title={t(`title.${section}`)}
          testId={`settings-group-${section}`}
        >
          {FIELDS.filter((field) => field.path.startsWith(`${section}.`)).map(
            renderField
          )}
        </Card>
      ))}

      <Card title={t('title.danger-zone')} testId="danger-zone">
        {RESETS.map((identifier) => (
          <Row
            key={identifier}
            label={t(`action.${identifier}`)}
            hint={t(`text.${identifier}`)}
            tone="destructive"
            testId={`reset-${identifier}`}
            disabled={busyReset !== null}
            onClick={() => {
              setPendingReset(identifier)
            }}
          >
            {busyReset === identifier ? <Spinner /> : undefined}
          </Row>
        ))}
      </Card>

      {/* Sticks to the bottom edge while the form is longer than the screen, so
          the primary action is always in thumb reach. */}
      <div class="sticky bottom-0 -mx-4 border-t border-separator bg-surface-sunken/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
        <Button type="submit" testId="save-button" disabled={saving || !dirty}>
          {saving ? <Spinner /> : t('button.save')}
        </Button>
      </div>

      {pendingReset !== null && (
        <ConfirmSheet
          title={t('title.confirm-reset')}
          description={t('text.reset-warning')}
          confirmLabel={t(`action.${pendingReset}`)}
          cancelLabel={t('action.cancel')}
          onCancel={() => {
            setPendingReset(null)
          }}
          onConfirm={() => {
            const identifier = pendingReset
            setPendingReset(null)
            void reset(identifier)
          }}
        />
      )}
    </form>
  )
}

export default SettingsPanel
