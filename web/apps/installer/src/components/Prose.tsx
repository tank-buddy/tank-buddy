import type { ComponentChildren } from 'preact'

/**
 * A card's worth of running text.
 *
 * The device interface has no equivalent: its cards hold Rows, which bring their
 * own `px-4 py-2.5`, so the card itself carries no padding. Prose needs some, and
 * matching the horizontal inset is what keeps a text card aligned with a list
 * card sitting above it.
 */
const Prose = ({ children }: { children: ComponentChildren }) => (
  <div class="space-y-4 px-4 py-3.5 text-[17px] leading-snug">{children}</div>
)

export default Prose
