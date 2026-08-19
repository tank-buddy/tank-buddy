import type { ComponentChildren } from 'preact'

/**
 * A grouped-list card with an uppercase header, the same shape the device
 * interface uses. Not imported from there: that Card is built to hold Rows
 * (label/value/control) and these hold prose, a table and a list.
 */
const Card = ({
  title,
  children,
}: {
  title: string
  children: ComponentChildren
}) => (
  <>
    <h2 class="text-label-secondary mt-8 mb-2 px-1 text-[0.8125rem] tracking-wide uppercase">
      {title}
    </h2>
    <div class="bg-surface rounded-2xl p-5">{children}</div>
  </>
)

export default Card
