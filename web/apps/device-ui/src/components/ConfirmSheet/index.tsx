import { useEffect, useRef } from 'preact/hooks'

interface ConfirmSheetProps {
  title: string
  description: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
}

const ACTION =
  'w-full py-3 text-[17px] font-semibold transition-opacity active:bg-fill'

/**
 * A native `<dialog>`, not a hand-rolled overlay: `showModal()` brings the focus
 * trap, the inert background and Escape handling with it, which is the whole
 * reason a destructive action is worth confirming in the first place.
 *
 * Rendered only while open, so the mount effect is the right place to open it
 * and the slide-in animation plays on every presentation.
 */
const ConfirmSheet = (props: ConfirmSheetProps) => {
  const { title, description, confirmLabel, cancelLabel, onConfirm, onCancel } =
    props

  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  return (
    <dialog
      ref={dialog}
      data-testid="confirm-sheet"
      class="fixed inset-0 m-0 h-full max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-black/40"
      onCancel={(event) => {
        // Without this the dialog would close natively while the parent still
        // believed it was open, leaving an invisible mounted sheet behind.
        event.preventDefault()
        onCancel()
      }}
    >
      <div
        class="flex h-full flex-col justify-end p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            onCancel()
          }
        }}
      >
        <div class="mx-auto w-full max-w-104 animate-[sheet-up_0.25s_ease-out] motion-reduce:animate-none">
          <div class="overflow-hidden rounded-2xl bg-surface-elevated">
            <div class="px-4 py-4 text-center">
              <h2 class="text-[17px] font-semibold text-label">{title}</h2>
              <p class="mt-1 text-[13px] leading-snug text-label-secondary">
                {description}
              </p>
            </div>
            <button
              type="button"
              data-testid="confirm-accept"
              class={`${ACTION} border-t border-separator text-destructive`}
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          </div>

          {/* A separate card, the way iOS detaches Cancel from the actions. */}
          <button
            type="button"
            data-testid="confirm-cancel"
            class={`${ACTION} mt-2 rounded-2xl bg-surface-elevated text-brand-ink`}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}

export default ConfirmSheet
