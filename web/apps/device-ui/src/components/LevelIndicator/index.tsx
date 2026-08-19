import Card from '@tank-buddy/ui/Card'
import Row from '@tank-buddy/ui/Row'
import { useEffect, useState } from 'preact/hooks'
import { getLevel } from '../../utils/api'
import type { LevelInterface } from '../../utils/api/types'
import { t } from '../../utils/i18n'

const POLL_INTERVAL_MS = 5000

/** Fractions of the tank height the right-hand scale is labelled at. */
const SCALE_FRACTIONS = [1, 0.75, 0.5, 0.25, 0]

/**
 * Two periods of the wave repeated across a box twice as wide as the vessel, so
 * translating the sheet by half its own width loops without a seam.
 */
const WAVE_VIEW_BOX = '0 0 240 16'
const WAVE_CREST =
  'M0 8 Q15 2 30 8 T60 8 T90 8 T120 8 T150 8 T180 8 T210 8 T240 8 V16 H0 Z'
const WAVE_TROUGH =
  'M0 8 Q15 14 30 8 T60 8 T90 8 T120 8 T150 8 T180 8 T210 8 T240 8 V16 H0 Z'

const LevelIndicator = () => {
  const [level, setLevel] = useState<LevelInterface | null>(null)
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    let inFlight = false

    const poll = async () => {
      // The ESP32 can answer slower than the poll interval, especially in
      // access-point mode; without this guard requests would stack up.
      if (inFlight) {
        return
      }
      inFlight = true

      try {
        const next = await getLevel()

        if (!active) {
          return
        }

        setLevel(next)
        setUpdatedAt(Date.now())
        setFailed(false)
      } catch {
        if (active) {
          setFailed(true)
        }
      } finally {
        inFlight = false
      }
    }

    // Fetch immediately, otherwise the first POLL_INTERVAL_MS show no data.
    void poll()
    const interval = setInterval(() => void poll(), POLL_INTERVAL_MS)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [])

  // The device computes the percentage so this display and Home Assistant
  // always agree; null means "no reading yet".
  const reading = level?.level ?? null
  const distanceToWater = level?.distance_to_water ?? null
  const height = level?.height ?? null
  const percentage = reading ?? 0

  return (
    <section data-testid="level-indicator">
      <h1 class="mb-3 px-4 text-[34px] leading-tight font-bold tracking-tight text-label">
        {t('title.level-indicator')}
      </h1>

      <Card>
        <div class="flex gap-3 border-b border-separator p-4">
          {/* The bar is the whole point of the app, so it carries the
              accessible value rather than being decorative markup. */}
          <div
            role="meter"
            aria-label={t('title.level-indicator')}
            aria-valuenow={reading ?? undefined}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={
              reading !== null ? `${percentage} %` : t('text.level-unknown')
            }
            data-testid="level-meter"
            class="relative h-72 flex-1 overflow-hidden rounded-xl border-2 border-separator bg-fill"
          >
            {reading !== null && (
              <>
                {/* The dashed line spans the air gap the sensor actually
                    measures -- the water level itself is derived from it. */}
                <span
                  aria-hidden="true"
                  class="absolute top-0 left-1/2 border-l border-dashed border-label-tertiary transition-[height] duration-700 ease-out motion-reduce:transition-none"
                  style={{ height: `${100 - percentage}%` }}
                />

                <div
                  data-testid="level-fill"
                  class="absolute inset-x-0 bottom-0 bg-linear-to-b from-brand/40 to-brand-deep/75 transition-[height] duration-700 ease-out motion-reduce:transition-none"
                  style={{ height: `${percentage}%` }}
                >
                  {/* Two sheets drifting against each other: one wave alone
                      reads as a moving stripe, two read as a water surface. */}
                  <svg
                    aria-hidden="true"
                    viewBox={WAVE_VIEW_BOX}
                    preserveAspectRatio="none"
                    class="absolute -top-2 left-0 h-4 w-[200%] animate-wave fill-brand/40 motion-reduce:animate-none"
                  >
                    <path d={WAVE_TROUGH} />
                  </svg>
                  <svg
                    aria-hidden="true"
                    viewBox={WAVE_VIEW_BOX}
                    preserveAspectRatio="none"
                    class="absolute -top-2 left-0 h-4 w-[200%] animate-[wave_6s_linear_infinite_reverse] fill-brand/70 motion-reduce:animate-none"
                  >
                    <path d={WAVE_CREST} />
                  </svg>
                </div>
              </>
            )}

            <span
              data-testid="level-value"
              class="absolute inset-0 flex items-center justify-center text-[44px] font-semibold tracking-tight text-label tabular-nums"
            >
              {reading !== null ? `${percentage} %` : '–'}
            </span>
          </div>

          {/* Millimetres, not percent: the big figure already says percent, and
              a second "75 %" in the tree would make it ambiguous. */}
          <ul
            aria-hidden="true"
            class="flex h-72 w-9 flex-col justify-between text-right text-[11px] text-label-tertiary tabular-nums"
          >
            {SCALE_FRACTIONS.map((fraction) => (
              <li key={fraction}>
                {height === null ? '' : Math.round(height * fraction)}
              </li>
            ))}
          </ul>
        </div>

        {distanceToWater !== null && (
          <Row
            label={t('text.distance-to-water')}
            value={`${distanceToWater} mm`}
            testId="level-distance"
          />
        )}
        {updatedAt !== null && (
          <Row
            label={t('text.last-updated')}
            value={new Date(updatedAt).toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
            })}
            testId="level-updated"
          />
        )}
        {failed && (
          <p
            role="status"
            data-testid="level-error"
            class="px-4 py-2.5 text-[13px] text-destructive"
          >
            {t('text.level-unavailable')}
          </p>
        )}
      </Card>
    </section>
  )
}

export default LevelIndicator
