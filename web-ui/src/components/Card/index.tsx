import type { ComponentChildren } from 'preact'

interface CardProps {
  /** Group header, rendered outside the card the way iOS Settings does it. */
  title?: string
  testId?: string
  children: ComponentChildren
}

const Card = (props: CardProps) => {
  const { title, testId, children } = props

  return (
    <section class="mb-8" data-testid={testId}>
      {title !== undefined && (
        <h2 class="mb-2 px-4 text-[13px] font-normal tracking-wide text-label-secondary uppercase">
          {title}
        </h2>
      )}
      {/* overflow-hidden so the rows' separators cannot poke past the corners. */}
      <div class="overflow-hidden rounded-2xl bg-surface">{children}</div>
    </section>
  )
}

export default Card
