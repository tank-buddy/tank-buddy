import { beginWebUiUpdate, commitWebUiUpdate, putWebUiAsset } from '../api'

/**
 * The device has no TLS and cannot reach GitHub. The browser can, so it does
 * the fetching and hands the result to the device over the LAN -- which is also
 * the only way this device updates at all, since the firmware image does not
 * fit twice into 4 MB and therefore cannot be replaced over the air.
 */
const RELEASE_API =
  'https://api.github.com/repos/tank-buddy/tank-buddy/releases/latest'

/**
 * One JSON file holding every asset base64-encoded, rather than an archive.
 * A tar or zip would need unpacking code in this bundle, and every byte here is
 * flashed onto the device.
 */
const BUNDLE_ASSET = 'web-ui.json'

/** Injected at build time; the running page is the installed version. */
export const installedVersion: string = __UI_VERSION__

interface ReleaseAssetInterface {
  name: string
  browser_download_url: string
}

interface ReleaseInterface {
  tag_name: string
  assets: ReleaseAssetInterface[]
}

interface BundleInterface {
  version: string
  /** Path below the web-UI root, to base64 content. */
  files: Record<string, string>
}

export interface AvailableUpdateInterface {
  version: string
  bundleUrl: string
}

/** Null when the latest release is the one already running. */
export const findUpdate =
  async (): Promise<AvailableUpdateInterface | null> => {
    const response = await fetch(RELEASE_API, {
      headers: { accept: 'application/vnd.github+json' },
    })

    if (!response.ok) {
      throw new Error(`Release lookup failed with ${response.status}`)
    }

    const release = (await response.json()) as ReleaseInterface
    const asset = release.assets.find((entry) => entry.name === BUNDLE_ASSET)

    if (asset === undefined || release.tag_name === installedVersion) {
      return null
    }

    return { version: release.tag_name, bundleUrl: asset.browser_download_url }
  }

const decodeBase64 = (value: string): Uint8Array => {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

/**
 * Uploads are sequential on purpose: the device runs one asyncio loop on one
 * core, and firing them in parallel only makes it queue them while holding
 * several buffers at once.
 */
export const applyUpdate = async (
  bundleUrl: string,
  onProgress: (uploaded: number, total: number) => void
): Promise<void> => {
  const response = await fetch(bundleUrl)

  if (!response.ok) {
    throw new Error(`Bundle download failed with ${response.status}`)
  }

  const bundle = (await response.json()) as BundleInterface
  const entries = Object.entries(bundle.files)

  await beginWebUiUpdate()

  let uploaded = 0

  for (const [path, content] of entries) {
    await putWebUiAsset(path, decodeBase64(content))
    uploaded += 1
    onProgress(uploaded, entries.length)
  }

  await commitWebUiUpdate()
}
