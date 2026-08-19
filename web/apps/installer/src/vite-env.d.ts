/// <reference types="vite/client" />

/**
 * esp-web-tools ships no declaration for its web/ entry points -- only for the
 * library itself -- and this one is imported purely for its side effect of
 * registering the custom element.
 */
declare module 'esp-web-tools/dist/web/install-button.js'

declare namespace preact.JSX {
  interface IntrinsicElements {
    /**
     * Registered at runtime by the import above. Only the one attribute this
     * page sets is declared; the element reads everything else from the manifest
     * that attribute points at.
     */
    'esp-web-install-button': { manifest?: string }
  }
}
