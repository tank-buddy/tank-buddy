import type { ComponentChildren } from 'preact'

/** Inline monospace, on the sunken surface so it reads as a literal value. */
const Code = ({ children }: { children: ComponentChildren }) => (
  <code class="bg-surface-sunken rounded px-[0.35em] py-[0.1em] font-mono text-[0.875em]">
    {children}
  </code>
)

export default Code
