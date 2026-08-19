import preact from '@preact/preset-vite'
import tailwindcss from '@tailwindcss/vite'
import type { PluginOption } from 'vite'

/**
 * What both apps need, in the order they need it: Preact's JSX transform and
 * Tailwind's CSS pipeline. Everything else is per-app and stays there --
 * gzip-only output and the MSW guard are specific to the bundle that gets
 * flashed onto a device, and a relative `base` is specific to the page served
 * from a project Pages path.
 *
 * A function rather than an array so each app gets its own plugin instances;
 * sharing them across two Vite builds in one process is not something these
 * plugins promise.
 */
export const basePlugins = (): PluginOption[] => [preact(), tailwindcss()]
