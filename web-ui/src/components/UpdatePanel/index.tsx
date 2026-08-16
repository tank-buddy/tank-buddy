import { useState } from 'preact/hooks'
import { t } from '../../utils/i18n'
import {
  applyUpdate,
  findUpdate,
  installedVersion,
  type AvailableUpdateInterface,
} from '../../utils/update'
import Alert from '../Alert'
import Card from '../Card'
import ConfirmSheet from '../ConfirmSheet'
import Row from '../Row'
import Spinner from '../Spinner'

type Status =
  'idle' | 'checking' | 'up-to-date' | 'available' | 'installing' | 'installed'

const UpdatePanel = () => {
  const [status, setStatus] = useState<Status>('idle')
  const [available, setAvailable] = useState<AvailableUpdateInterface | null>(
    null
  )
  const [progress, setProgress] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  const check = async () => {
    setStatus('checking')
    setError(null)

    try {
      const update = await findUpdate()

      setAvailable(update)
      setStatus(update === null ? 'up-to-date' : 'available')
    } catch {
      setError(t('alert.update-check-failed'))
      setStatus('idle')
    }
  }

  const install = async () => {
    if (available === null) {
      return
    }

    setStatus('installing')
    setError(null)

    try {
      await applyUpdate(available.bundleUrl, (uploaded, total) => {
        setProgress(`${uploaded}/${total}`)
      })
      setStatus('installed')
    } catch {
      // The device keeps serving the previous UI until the final commit, so a
      // failure here is recoverable by simply trying again.
      setError(t('alert.update-failed'))
      setStatus('available')
    }
  }

  return (
    <>
      {error !== null && <Alert type="error">{error}</Alert>}
      {status === 'up-to-date' && (
        <Alert type="success">{t('text.up-to-date')}</Alert>
      )}
      {status === 'installed' && (
        <Alert type="success">{t('text.update-installed')}</Alert>
      )}

      <Card title={t('title.software')} testId="update-panel">
        <Row
          label={t('label.installed-version')}
          value={installedVersion}
          testId="row-installed-version"
        />
        {status === 'available' && available !== null && (
          <Row
            label={t('text.update-available')}
            value={available.version}
            testId="row-available-version"
          />
        )}
        <Row
          label={
            status === 'available'
              ? t('action.install-update')
              : t('action.check-for-updates')
          }
          hint={
            status === 'installing' ? t('text.installing-update') : undefined
          }
          testId="update-action"
          disabled={status === 'checking' || status === 'installing'}
          onClick={() => {
            if (status === 'available') {
              setConfirming(true)
              return
            }

            void check()
          }}
        >
          {status === 'checking' || status === 'installing' ? (
            <Spinner />
          ) : undefined}
          {status === 'installing' && progress !== '' ? (
            <span class="text-label-secondary tabular-nums">{progress}</span>
          ) : undefined}
        </Row>
      </Card>

      {confirming && (
        <ConfirmSheet
          title={t('title.confirm-update')}
          description={t('text.update-warning')}
          confirmLabel={t('action.install-update')}
          cancelLabel={t('action.cancel')}
          onCancel={() => {
            setConfirming(false)
          }}
          onConfirm={() => {
            setConfirming(false)
            void install()
          }}
        />
      )}
    </>
  )
}

export default UpdatePanel
