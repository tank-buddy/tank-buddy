import { useState } from 'preact/hooks'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-preact'
import { page, userEvent } from 'vitest/browser'
import Switch from '../../src/components/Switch'

const LABEL = 'MQTT enabled'
const TEST_ID = 'switch-mqtt-enabled'

/** Switch is controlled, so the state has to live somewhere. */
const Harness = () => {
  const [checked, setChecked] = useState(false)

  return (
    <label>
      {LABEL}
      <Switch
        name="mqtt.enabled"
        checked={checked}
        testId={TEST_ID}
        onChange={setChecked}
      />
    </label>
  )
}

test('announces itself as a switch rather than a checkbox', async () => {
  render(<Harness />)

  await expect.element(page.getByRole('switch')).toBeInTheDocument()
})

test('a tap on the surrounding label toggles it', async () => {
  // The label association is the reason the whole settings row is a hit target
  // on a phone, so it is worth pinning rather than assuming.
  render(<Harness />)

  await page.getByText(LABEL).click()

  await expect.element(page.getByTestId(TEST_ID)).toBeChecked()
})

test('the control itself is a pointer target', async () => {
  // The input is stretched over the track and made transparent rather than
  // hidden with `sr-only`: a 1px clipped element is not reliably clickable, so
  // this would have needed a forced click and drifted from real finger input.
  render(<Harness />)

  await page.getByTestId(TEST_ID).click()

  await expect.element(page.getByTestId(TEST_ID)).toBeChecked()
})

test('can be toggled from the keyboard', async () => {
  render(<Harness />)

  const control = page.getByTestId(TEST_ID)
  const element = control.element() as HTMLElement
  element.focus()
  await userEvent.keyboard(' ')

  await expect.element(control).toBeChecked()
})
