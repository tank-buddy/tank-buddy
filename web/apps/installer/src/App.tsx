import { useEffect, useState } from 'preact/hooks'
import Card from './components/Card'
import Code from './components/Code'
import {
  findManifest,
  MANIFEST,
  type ManifestInterface,
} from './utils/manifest'

const BOARDS = [
  ['ESP32', 'GPIO0 is a strapping pin — wire the sensor elsewhere'],
  ['ESP32-S2', 'Wi-Fi only, no Bluetooth needed here anyway'],
  ['ESP32-S3', 'GPIO0 is a strapping pin'],
  ['ESP32-C3', '—'],
  ['ESP32-C6', 'The board this is developed on'],
]

const RELEASES = 'https://github.com/tank-buddy/tank-buddy/releases/latest'

const App = () => {
  const [manifest, setManifest] = useState<ManifestInterface | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    findManifest()
      .then(setManifest)
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : String(cause))
      })
  }, [])

  // Web Serial exists only in desktop Chrome, Edge and Opera. Saying so up
  // front beats a Connect button that cannot do anything.
  const supported = 'serial' in navigator

  return (
    <main class="mx-auto max-w-[34rem]">
      <header class="mb-8 flex items-center gap-3">
        <img src="tank-buddy.svg" alt="" class="size-11" />
        <h1 class="text-[2rem] leading-tight font-bold tracking-tight">
          Install TankBuddy
        </h1>
      </header>

      <p class="text-label-secondary mb-6 text-[1.0625rem]">
        Flash a water-tank level monitor onto an ESP32 — firmware and web
        interface in one go, with nothing to install on this computer.
      </p>

      {!supported && (
        <div
          class="bg-warning/20 mb-4 rounded-xl p-4 text-[0.9375rem]"
          data-testid="unsupported"
        >
          <strong>This browser cannot talk to serial devices.</strong> Web
          Serial exists only in desktop Chrome, Edge and Opera — not in Safari,
          not in Firefox, and not on phones. Open this page in one of those on a
          computer, or flash the <Code>-full.bin</Code> from the{' '}
          <a class="text-accent-ink underline" href={RELEASES}>
            latest release
          </a>{' '}
          with <Code>esptool</Code>.
        </div>
      )}

      <div class="bg-surface flex flex-col items-start gap-3 rounded-2xl p-5">
        {/*
          Only rendered once the manifest is known: a Connect button that cannot
          reach an image is worse than no button at all. The element comes from
          esp-web-tools, which main.tsx registers in the browser only.
        */}
        {manifest !== null && (
          <esp-web-install-button manifest={MANIFEST}></esp-web-install-button>
        )}
        <p class="text-label-secondary text-sm" data-testid="status">
          {error !== null
            ? `Could not load the firmware manifest: ${error}`
            : manifest === null
              ? 'Looking up the latest release…'
              : `Version ${manifest.version} · ${manifest.builds.length} boards`}
        </p>
      </div>

      <Card title="What this writes">
        <p>
          The whole chip: bootloader, MicroPython with TankBuddy frozen in, and
          a filesystem holding the web interface. Any configuration already on
          the device is erased with it, so treat this as a first install or a
          factory reset.
        </p>
        <p class="text-label-secondary mt-4 text-sm">
          To update a device you already configured, use the interface itself —
          it fetches new releases and installs them over your network, keeping
          your settings. Only the firmware needs a cable, and only rarely.
        </p>
      </Card>

      <Card title="Supported boards">
        <table class="w-full border-collapse text-[0.9375rem]">
          <tbody>
            <tr class="border-separator border-b">
              <th class="text-label-secondary py-2 text-left font-normal">
                Chip
              </th>
              <th class="text-label-secondary py-2 text-left font-normal">
                Notes
              </th>
            </tr>
            {BOARDS.map(([chip, note], index) => (
              <tr
                key={chip}
                class={
                  index < BOARDS.length - 1 ? 'border-separator border-b' : ''
                }
              >
                <td class="py-2">{chip}</td>
                <td class="text-label-secondary py-2 text-sm">{note}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p class="text-label-secondary mt-4 text-sm">
          The installer reads the chip over serial and picks the matching build.
          4 MB of flash is enough.
        </p>
      </Card>

      <Card title="After flashing">
        <ol class="list-decimal space-y-1 pl-5">
          <li>
            The device opens an access point called <Code>TankBuddy</Code>. Join
            it from a phone.
          </li>
          <li>
            Open <Code>http://192.168.1.1</Code> and set your Wi-Fi, the tank
            geometry and which pins the sensor is wired to.
          </li>
          <li>
            Save. The device restarts and is then reachable at{' '}
            <Code>http://tank-buddy.local</Code>.
          </li>
        </ol>
      </Card>

      <p class="text-label-secondary mt-8 text-sm">
        <a
          class="text-accent-ink underline"
          href="https://github.com/tank-buddy/tank-buddy"
        >
          Source
        </a>{' '}
        ·{' '}
        <a class="text-accent-ink underline" href={RELEASES}>
          Releases
        </a>{' '}
        · MIT licensed
      </p>
    </main>
  )
}

export default App
