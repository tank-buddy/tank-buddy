/**
 * Both the manifest and the images it names are served from this site, and that
 * is not a preference: a browser cannot fetch a GitHub release asset from
 * another origin at all. `github.com/.../releases/download/` answers a
 * cross-origin request with a 302 carrying no Access-Control-Allow-Origin, and
 * the release-assets.githubusercontent.com it redirects to sends no CORS headers
 * either. Pages does.
 *
 * Relative on purpose. esp-web-tools resolves each part's path against the
 * manifest URL, and this site lives under /tank-buddy/ rather than at the root.
 */
export const MANIFEST = 'manifest.json'

export interface ManifestInterface {
  version: string
  builds: unknown[]
}

/** Throws rather than returning null: the page shows the reason it failed. */
export const findManifest = async (): Promise<ManifestInterface> => {
  const response = await fetch(MANIFEST)

  if (!response.ok) {
    throw new Error(`manifest lookup failed with ${response.status}`)
  }

  return (await response.json()) as ManifestInterface
}
