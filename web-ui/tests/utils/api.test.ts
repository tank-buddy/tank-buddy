import { http, HttpResponse } from 'msw'
import { expect, test } from 'vitest'
import { worker } from '../../mocks/browser'
import { SETTINGS } from '../../mocks/fixtures'
import {
  getLevel,
  getSettings,
  patchSettings,
  putSystemOperation,
} from '../../src/utils/api'

test('getLevel returns the device reading', async () => {
  const level = await getLevel()

  expect(level.level).toBe(75)
  expect(level.height).toBe(1000)
})

test('getSettings returns every mutable field', async () => {
  await expect(getSettings()).resolves.toEqual(SETTINGS)
})

test('a rejected patch is returned, not thrown', async () => {
  // PATCH /api/settings answers 400 with a machine-readable body; the caller
  // needs that body to show the API's own message.
  const result = await patchSettings({ tank: { height: -1, min_distance: 0 } })

  expect(result.success).toBe(false)
  expect(result.message).toContain('tank.height')
})

test('an accepted patch reports whether a reboot is needed', async () => {
  await expect(
    patchSettings({ tank: { height: 500, min_distance: 50 } })
  ).resolves.toEqual({ success: true, reboot_required: false })

  await expect(
    patchSettings({ wifi: { mode: 'C', ssid: 'Net', key: '' } })
  ).resolves.toEqual({ success: true, reboot_required: true })
})

test('a failed system operation throws instead of resolving', async () => {
  // Regression: the 400 escape hatch used to apply to every endpoint, so a
  // failed reset resolved silently and the UI showed nothing.
  worker.use(
    http.put('/api/system-operations/:identifier', () =>
      HttpResponse.json({ success: false }, { status: 400 })
    )
  )

  await expect(putSystemOperation('soft-reset')).rejects.toThrow(
    'failed with 400'
  )
})

test('a server error throws', async () => {
  worker.use(
    http.get('/api/level', () => new HttpResponse(null, { status: 500 }))
  )

  await expect(getLevel()).rejects.toThrow('failed with 500')
})
