import Alert from '@tank-buddy/ui/Alert'
import Card from '@tank-buddy/ui/Card'
import Row from '@tank-buddy/ui/Row'
import { useEffect, useState } from 'preact/hooks'
import Code from './components/Code'
import Prose from './components/Prose'
import {
  findManifest,
  MANIFEST,
  type ManifestInterface,
} from './utils/manifest'

/**
 * Every chip MicroPython ships a generic Wi-Fi board for, with the one thing
 * worth knowing before wiring the sensor. Mirrors the matrix in the workflows and
 * boards/README.md.
 */
const BOARDS: [string, string][] = [
  ['ESP32', 'GPIO0 is a strapping pin — wire the sensor elsewhere'],
  ['ESP32-S2', 'Wi-Fi only, no Bluetooth needed here anyway'],
  ['ESP32-S3', 'GPIO0 is a strapping pin'],
  ['ESP32-C3', 'Nothing to watch out for'],
  ['ESP32-C6', 'The board this is developed on'],
]

const RELEASES = 'https://github.com/tank-buddy/tank-buddy/releases/latest'
const SOURCE = 'https://github.com/tank-buddy/tank-buddy'

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

  const status =
    error !== null
      ? `Could not load the firmware manifest: ${error}`
      : manifest === null
        ? 'Looking up the latest release…'
        : `Version ${manifest.version} · ${manifest.builds.length} boards`

  return (
    <main class="mx-auto max-w-[34rem] px-4 pt-12 pb-16">
      <header class="mb-8 flex items-center gap-3 px-4">
        <img src="tank-buddy.svg" alt="" class="size-11" />
        {/* 34px is the iOS large title, the same size the device interface uses
            for its own heading. */}
        <h1 class="text-[34px] leading-tight font-bold tracking-tight">
          Install TankBuddy
        </h1>
      </header>

      <p class="text-label-secondary mb-8 px-4 text-[17px] leading-snug">
        Flash a water-tank level monitor onto an ESP32 — firmware and web
        interface in one go, with nothing to install on this computer.
      </p>

      {!supported && (
        <Alert type="warning">
          <strong>This browser cannot talk to serial devices.</strong> Web
          Serial exists only in desktop Chrome, Edge and Opera — not in Safari,
          not in Firefox, and not on phones. Open this page in one of those on a
          computer, or flash the <Code>-full.bin</Code> from the{' '}
          <a class="text-accent-ink underline" href={RELEASES}>
            latest release
          </a>{' '}
          with <Code>esptool</Code>.
        </Alert>
      )}

      <Card>
        <div class="flex flex-col items-start gap-3 px-4 py-3.5">
          {/*
            Only rendered once the manifest is known: a Connect button that
            cannot reach an image is worse than no button at all. The element is
            registered by esp-web-tools, which main.tsx imports in the browser.
          */}
          {manifest !== null && (
            <esp-web-install-button
              manifest={MANIFEST}
            ></esp-web-install-button>
          )}
          <p class="text-label-secondary text-[13px]" data-testid="status">
            {status}
          </p>
        </div>
      </Card>

      <Card title="What this writes">
        <Prose>
          <p>
            The whole chip: bootloader, MicroPython with TankBuddy frozen in,
            and a filesystem holding the web interface. Any configuration
            already on the device is erased with it, so treat this as a first
            install or a factory reset.
          </p>
          <p class="text-label-secondary text-[13px]">
            To update a device you already configured, use the interface itself
            — it fetches new releases and installs them over your network,
            keeping your settings. Only the firmware needs a cable, and only
            rarely.
          </p>
        </Prose>
      </Card>

      <Card title="Supported boards">
        {BOARDS.map(([chip, note]) => (
          <Row key={chip} label={chip} hint={note} />
        ))}
      </Card>

      <Card title="After flashing">
        <Row
          label="Join the access point"
          hint="The device opens one called TankBuddy. Any phone will do."
        />
        <Row
          label="Open http://192.168.1.1"
          hint="Set your Wi-Fi, the tank geometry and the sensor's pins."
        />
        <Row
          label="Save"
          hint="The device restarts and is then at http://tank-buddy.local"
        />
      </Card>

      <p class="text-label-secondary px-4 text-[13px]">
        <a class="text-accent-ink underline" href={SOURCE}>
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
