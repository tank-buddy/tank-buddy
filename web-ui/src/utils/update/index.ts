import { beginWebUiUpdate, commitWebUiUpdate, putWebUiAsset } from '../api'

/**
 * The device has no TLS and cannot reach GitHub. The browser can, so it does
 * the fetching and hands the result to the device over the LAN -- which is also
 * the only way this device updates at all, since the firmware image does not
 * fit twice into 4 MB and therefore cannot be replaced over the air.
 *
 * The bundle comes from the deploy site rather than from the release it was
 * built from, and that is not a preference. This page is served by the device
 * over plain HTTP, so a release asset is cross-origin, and
 * `github.com/.../releases/download/` sends no Access-Control-Allow-Origin --
 * neither on the download nor on the `release-assets.githubusercontent.com` it
 * redirects to. The fetch was therefore blocked by CORS *after* the panel had
 * already offered the update. GitHub Pages does send the header.
 *
 * One request, not a lookup followed by a download: the bundle already names
 * the version it carries, so asking the release API first would add a second
 * truth that can drift, plus an unauthenticated 60-requests-per-hour-per-IP
 * limit on the only path this device can be updated through.
 */
export const BUNDLE_URL = 'https://tank-buddy.github.io/tank-buddy/web-ui.json'

/** Injected at build time; the running page is the installed version. */
export const installedVersion: string = __UI_VERSION__

/**
 * One JSON file holding every asset base64-encoded, rather than an archive.
 * A tar or zip would need unpacking code in this bundle, and every byte here is
 * flashed onto the device.
 */
interface BundleInterface {
  version: string
  /** Path below the web-UI root, to base64 content. */
  files: Record<string, string>
}

export interface AvailableUpdateInterface {
  version: string
  files: Record<string, string>
}

/** Null when the published bundle is the one already running. */
export const findUpdate =
  async (): Promise<AvailableUpdateInterface | null> => {
    const response = await fetch(BUNDLE_URL)

    if (!response.ok) {
      throw new Error(`Bundle lookup failed with ${response.status}`)
    }

    const bundle = (await response.json()) as BundleInterface

    if (bundle.version === installedVersion) {
      return null
    }

    return { version: bundle.version, files: bundle.files }
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
  files: Record<string, string>,
  onProgress: (uploaded: number, total: number) => void
): Promise<void> => {
  const entries = Object.entries(files)

  await beginWebUiUpdate()

  let uploaded = 0

  for (const [path, content] of entries) {
    await putWebUiAsset(path, decodeBase64(content))
    uploaded += 1
    onProgress(uploaded, entries.length)
  }

  await commitWebUiUpdate()
}
