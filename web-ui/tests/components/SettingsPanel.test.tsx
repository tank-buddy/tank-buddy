import { http, HttpResponse } from 'msw'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-preact'
import { page } from 'vitest/browser'
import { worker } from '../../mocks/browser'
import SettingsPanel from '../../src/components/SettingsPanel'

/** Captures the body of the next PATCH so tests can assert what was sent. */
const capturePatch = () => {
  const seen: Record<string, Record<string, unknown>>[] = []

  worker.use(
    http.patch('/api/settings', async ({ request }) => {
      const body = (await request.json()) as Record<
        string,
        Record<string, unknown>
      >
      seen.push(body)

      const rebootRequired = ['wifi', 'mqtt', 'board'].some(
        (section) => section in body
      )

      return HttpResponse.json({
        success: true,
        reboot_required: rebootRequired,
      })
    })
  )

  return seen
}

test('renders the current settings once loaded', async () => {
  render(<SettingsPanel />)

  await expect.element(page.getByLabelText(/SSID/i)).toHaveValue('TankBuddy')
})

test('changing only the tank height does not demand a reboot', async () => {
  // Regression: save() sent every field on every save, and because wifi.* and
  // mqtt.* are reboot-required in MUTABLE_FIELDS the API always answered
  // reboot_required: true -- even for a pure tank-geometry change.
  const patches = capturePatch()
  render(<SettingsPanel />)

  const height = page.getByLabelText(/Tank height/i)
  await expect.element(height).toBeInTheDocument()
  await height.fill('750')
  await page.getByTestId('save-button').click()

  await expect.element(page.getByRole('status')).toBeInTheDocument()

  expect(patches).toHaveLength(1)
  expect(patches[0]).toEqual({ tank: { height: 750 } })
  await expect
    .element(page.getByText(/reboot is required/i))
    .not.toBeInTheDocument()
})

test('a number field can be cleared without snapping back to zero', async () => {
  // Regression: Number('') === 0, so clearing the field wrote 0 straight back
  // and a stray backspace submitted an out-of-range height.
  render(<SettingsPanel />)

  const height = page.getByLabelText(/Tank height/i)
  await expect.element(height).toBeInTheDocument()
  await height.fill('')

  // Asserted on the DOM property directly: jest-dom's toHaveValue reports null
  // for an empty number input, which would hide a regression back to '0'.
  const element = height.element() as HTMLInputElement
  expect(element.value).toBe('')
})

test('an empty credential can be given a value', async () => {
  // Regression: save() filtered out null/empty values, so a password that
  // started empty could never be set.
  const patches = capturePatch()
  render(<SettingsPanel />)

  const password = page.getByLabelText(/MQTT password/i)
  await expect.element(password).toBeInTheDocument()
  await password.fill('hunter2')
  await page.getByTestId('save-button').click()

  await vi.waitFor(() => {
    expect(patches).toHaveLength(1)
  })
  expect(patches[0]).toEqual({ mqtt: { password: 'hunter2' } })
})

test('a rejected save shows the message from the API', async () => {
  worker.use(
    http.patch('/api/settings', () =>
      HttpResponse.json(
        { success: false, message: 'Value for tank.height is out of range' },
        { status: 400 }
      )
    )
  )
  render(<SettingsPanel />)

  const height = page.getByLabelText(/Tank height/i)
  await expect.element(height).toBeInTheDocument()
  await height.fill('1')
  await page.getByTestId('save-button').click()

  await expect
    .element(page.getByText(/tank.height is out of range/i))
    .toBeInTheDocument()
})

test('a failed reset is reported', async () => {
  // Regression: the api client swallowed every 400, so this silently "worked".
  worker.use(
    http.put('/api/system-operations/:identifier', () =>
      HttpResponse.json({ success: false }, { status: 400 })
    )
  )
  render(<SettingsPanel />)

  const row = page.getByTestId('reset-soft-reset')
  await expect.element(row).toBeInTheDocument()
  await row.click()
  await page.getByTestId('confirm-accept').click()

  await expect.element(page.getByRole('alert')).toBeInTheDocument()
})

test('a reset can be called off', async () => {
  // A mis-tap next to the fill level must not reboot the device, which is the
  // whole reason the destructive rows go through a confirmation sheet.
  const resets: string[] = []
  worker.use(
    http.put('/api/system-operations/:identifier', ({ params }) => {
      resets.push(String(params.identifier))

      return HttpResponse.json({ success: true })
    })
  )
  render(<SettingsPanel />)

  const row = page.getByTestId('reset-hard-reset')
  await expect.element(row).toBeInTheDocument()
  await row.click()
  await page.getByTestId('confirm-cancel').click()

  await expect
    .element(page.getByTestId('confirm-sheet'))
    .not.toBeInTheDocument()
  expect(resets).toEqual([])
})

test('saving is unavailable until something actually changed', async () => {
  // The API answers reboot_required per section, so an empty patch would still
  // report success and could demand a pointless reboot.
  render(<SettingsPanel />)

  const save = page.getByTestId('save-button')
  await expect.element(save).toBeDisabled()

  await page.getByLabelText(/Tank height/i).fill('900')

  await expect.element(save).toBeEnabled()
})

test('the Wi-Fi mode is picked with the segmented control', async () => {
  const patches = capturePatch()
  render(<SettingsPanel />)

  const client = page.getByRole('radio', { name: 'Client' })
  await expect.element(client).toBeInTheDocument()
  await client.click()
  await page.getByTestId('save-button').click()

  await vi.waitFor(() => {
    expect(patches).toHaveLength(1)
  })
  expect(patches[0]).toEqual({ wifi: { mode: 'C' } })
})

test('MQTT is enabled with the switch', async () => {
  const patches = capturePatch()
  render(<SettingsPanel />)

  const toggle = page.getByTestId('switch-mqtt-enabled')
  await expect.element(toggle).toBeInTheDocument()
  await toggle.click()
  await page.getByTestId('save-button').click()

  await vi.waitFor(() => {
    expect(patches).toHaveLength(1)
  })
  expect(patches[0]).toEqual({ mqtt: { enabled: true } })
})

test('rewiring the sensor demands a reboot', async () => {
  // The pins are configurable because one firmware image serves several ESP32
  // variants, and main.py builds the I2C bus once at start-up.
  const patches = capturePatch()
  render(<SettingsPanel />)

  const scl = page.getByTestId('input-board-i2c_scl_pin')
  await expect.element(scl).toBeInTheDocument()
  await scl.fill('22')
  await page.getByTestId('save-button').click()

  await vi.waitFor(() => {
    expect(patches).toHaveLength(1)
  })
  expect(patches[0]).toEqual({ board: { i2c_scl_pin: 22 } })
  await expect
    .element(page.getByText(/reboot is required/i))
    .toBeInTheDocument()
})

test('a later successful save clears an earlier reset error', async () => {
  // Regression: reset() never called setError(null), so its error outlived
  // every subsequent action and could sit next to a success message.
  worker.use(
    http.put('/api/system-operations/:identifier', () =>
      HttpResponse.json({ success: false }, { status: 400 })
    )
  )
  render(<SettingsPanel />)

  const row = page.getByTestId('reset-soft-reset')
  await expect.element(row).toBeInTheDocument()
  await row.click()
  await page.getByTestId('confirm-accept').click()
  await expect.element(page.getByRole('alert')).toBeInTheDocument()

  const height = page.getByLabelText(/Tank height/i)
  await height.fill('800')
  await page.getByTestId('save-button').click()

  await expect.element(page.getByRole('status')).toBeInTheDocument()
  await expect.element(page.getByRole('alert')).not.toBeInTheDocument()
})
