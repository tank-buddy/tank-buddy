import type {
  ConfigInterface,
  SystemOperationIdentifier,
  WaterTankInterface,
} from './types'

const baseUrl = import.meta.env.DEV
  ? 'http://localhost:3100'
  : (window.location.origin ?? 'http://localhost:3100')

export const getDefaultConfig = async (): Promise<ConfigInterface> => {
  const input = new URL(`${baseUrl.replace(/\/+$/g, '')}/api/configs/default`)

  const response = await fetch(input, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      connection: 'close',
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
      connection: 'close',
    },
    body: JSON.stringify(config),
  })

  if (!response.ok) {
    throw new Error('Could not updated default config.')
  }

  return await response.json()
}

export const putSystemOperation = async (
  identifier: SystemOperationIdentifier
): Promise<void> => {
  const input = new URL(
    `${baseUrl.replace(/\/+$/g, '')}/api/system-operations/${identifier}`
  )

  const response = await fetch(input, {
    method: 'PUT',
    headers: {
      accept: 'application/json',
      connection: 'close',
    },
  })

  if (!response.ok) {
    throw new Error(`Could not put system operation '${identifier}'.`)
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
      connection: 'close',
    },
  })

  if (!response.ok) {
    throw new Error('Could not found default config.')
  }

  return { ...(await response.json()), timestamp: Date.now() }
}
