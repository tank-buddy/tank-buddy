import type {
  LevelInterface,
  PatchSettingsResultInterface,
  SettingsInterface,
  SystemOperationIdentifier,
  SystemOperationResultInterface,
} from './types'

// All requests are same-origin: on device the UI is served by the API itself,
// and in dev MSW intercepts them in the browser. No base URL to configure.

// The device is single-threaded and can stall; without a deadline a hung
// socket would leak one pending request per poll interval, forever.
const REQUEST_TIMEOUT_MS = 8000

type Method = 'GET' | 'PATCH' | 'PUT' | 'POST'

interface RequestOptions {
  method?: Method
  body?: unknown
  /**
   * Error statuses whose body carries meaning and must be returned rather than
   * thrown. Deliberately per-call: a 400 is only expected from PATCH /settings,
   * and treating it as success everywhere hid failed system operations.
   */
  acceptStatuses?: number[]
}

const request = async <T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> => {
  const { method = 'GET', body, acceptStatuses = [] } = options
  const headers: Record<string, string> = { accept: 'application/json' }

  if (body !== undefined) {
    headers['content-type'] = 'application/json'
  }

  const response = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  if (!response.ok && !acceptStatuses.includes(response.status)) {
    throw new Error(`${method} ${path} failed with ${response.status}`)
  }

  return (await response.json()) as T
}

export const getLevel = (): Promise<LevelInterface> =>
  request<LevelInterface>('/api/level')

export const getSettings = (): Promise<SettingsInterface> =>
  request<SettingsInterface>('/api/settings')

export const patchSettings = (
  patch: Partial<SettingsInterface>
): Promise<PatchSettingsResultInterface> =>
  request<PatchSettingsResultInterface>('/api/settings', {
    method: 'PATCH',
    body: patch,
    acceptStatuses: [400],
  })

export const putSystemOperation = (
  identifier: SystemOperationIdentifier
): Promise<SystemOperationResultInterface> =>
  request<SystemOperationResultInterface>(
    `/api/system-operations/${identifier}`,
    { method: 'PUT' }
  )

// The web-UI update is three calls rather than one upload: the device has no
// archive format, so the files are staged individually and swapped in at the
// end. An abandoned run leaves the previous UI serving.

export const beginWebUiUpdate = (): Promise<SystemOperationResultInterface> =>
  request<SystemOperationResultInterface>('/api/web-ui', { method: 'POST' })

export const commitWebUiUpdate = (): Promise<SystemOperationResultInterface> =>
  request<SystemOperationResultInterface>('/api/web-ui/commit', {
    method: 'POST',
  })

/**
 * Sent as raw bytes rather than through `request`, which serialises JSON. The
 * device writes the body to the file verbatim, so anything else would corrupt
 * the asset.
 */
export const putWebUiAsset = async (
  path: string,
  content: Uint8Array
): Promise<void> => {
  const response = await fetch(`/api/web-ui/${path}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/octet-stream' },
    body: content as BodyInit,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`Upload of ${path} failed with ${response.status}`)
  }
}
