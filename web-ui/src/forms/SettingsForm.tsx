import { Form, FormGroup } from '@shelacek/formica'
import { useEffect, useState } from 'preact/hooks'
import Input from '../components/Input'
import Label from '../components/Label'
import Select from '../components/Select'
import Button from '../components/Button'
import type { ConfigInterface } from '../utils/api/types'
import { getDefaultConfig, patchDefaultConfig } from '../utils/api'
import Spinner from '../components/Spinner'

const SettingsForm = () => {
  const [formValues, setFormValues] = useState<ConfigInterface | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    const fetchFormValues = async () => {
      try {
        const defaultConfig = await getDefaultConfig()
        setFormValues(defaultConfig)
      } catch (error) {
        console.error('Fehler beim Laden der Daten:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchFormValues()
  }, [])

  const handleSubmit = async (event: Event) => {
    event.preventDefault()
    const form = event.currentTarget as HTMLFormElement

    if (!form.checkValidity() || formValues === null) {
      return
    }

    setFormValues(await patchDefaultConfig(formValues))
  }

  if (loading) {
    return <Spinner />
  }

  return (
    <Form
      class="validated"
      value={formValues}
      onChange={setFormValues}
      onSubmit={handleSubmit}
    >
      <div className="mb-3">
        <Label forName="hostname">Hostname</Label>
        <Input name="hostname" required={true} />
      </div>
      <FormGroup name="wifi">
        <div className="mb-3">
          <Label forName="interface">Mode</Label>
          <Select
            name="interface"
            required={true}
            options={{ C: 'Client', AP: 'Access Point' }}
          />
        </div>
        <div className="mb-3">
          <Label forName="ssid">Ssid</Label>
          <Input name="ssid" required={true} />
        </div>
        <div className="mb-3">
          <Label forName="key">Key</Label>
          <Input name="key" />
        </div>
      </FormGroup>
      <FormGroup name="waterTank">
        <div className="mb-5">
          <Label forName="height">Water Tank Height</Label>
          <Input name="height" />
        </div>
      </FormGroup>
      <Button type="submit" className="w-full">
        Save
      </Button>
    </Form>
  )
}

export default SettingsForm
