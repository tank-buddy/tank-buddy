import type { ConfigInterface, WaterTankInterface } from './types'

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3100'

export const getDefaultConfig = async (): Promise<ConfigInterface> => {
  const input = new URL(`${baseUrl.replace(/\/+$/g, '')}/api/configs/default`)

  const response = await fetch(input, {
    method: 'GET',
    headers: {
      accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Could not found default config.')
  }

  return await response.json()
}

export const patchDefaultConfig = async (
  config: ConfigInterface
): Promise<ConfigInterface> => {
  const input = new URL(`${baseUrl.replace(/\/+$/g, '')}/api/configs/default`)

  const response = await fetch(input, {
    method: 'PATCH',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify(config),
  })

  if (!response.ok) {
    throw new Error('Could not updated default config.')
  }

  return await response.json()
}

export const performSoftReset = async (): Promise<void> => {
  const input = new URL(
    `${baseUrl.replace(/\/+$/g, '')}/api/system-operations/soft-reset`
  )

  const response = await fetch(input, {
    method: 'PUT',
    headers: {
      accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Could not perform soft reset.')
  }
}

export const performHardReset = async (): Promise<void> => {
  const input = new URL(
    `${baseUrl.replace(/\/+$/g, '')}/api/system-operations/hard-reset`
  )

  const response = await fetch(input, {
    method: 'PUT',
    headers: {
      accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Could not perform hard reset.')
  }
}

export const getDefaultWaterTank = async (): Promise<WaterTankInterface> => {
  const input = new URL(
    `${baseUrl.replace(/\/+$/g, '')}/api/water-tanks/default`
  )

  const response = await fetch(input, {
    method: 'GET',
    headers: {
      accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Could not found default config.')
  }

  return await response.json()
}
