import { ArvoAlertDialog } from '@arvo/react'

/**
 * Destructive confirmation.
 *
 * Deletes go through this rather than firing on click: the rows here are
 * pipelines and tags other people's runs depend on, and there is no undo.
 */
export default function ConfirmDialog({
  isOpen,
  title,
  /* What is being destroyed -- a tag name, a run, a file. Rendered in quotes
     and in the emphasis weight, because it is the one thing in the sentence
     the reader must check before clicking a button that cannot be undone.
     Composed here rather than in each caller so all six dialogs agree. */
  subject,
  message,
  confirmLabel = 'Delete',
  isLoading = false,
  onConfirm,
  onCancel,
}) {
  /* NOT a React node. ArvoAlertDialog validates `message` as Arvo's own
     InlineContent -- a string, or an array of typed nodes -- and throws
     InlineContentError on anything else. Passing JSX takes the whole app
     down with a blank page, because the throw happens during render.
     See @arvo/core/inline-content/types.d.ts for the node shapes. */
  const body = subject
    ? [
        { type: 'strong', children: [{ type: 'text', value: `“${subject}”` }] },
        { type: 'text', value: ` ${message}` },
      ]
    : message

  return (
    <ArvoAlertDialog
      isOpen={isOpen}
      variant="negative"
      /* Renders the primary button in the danger treatment, so the
         irreversible option never looks like the safe default. */
      hasDangerAction
      title={title}
      message={body}
      primaryAction={{ label: confirmLabel, icon: 'bin', isLoading, onClick: onConfirm }}
      secondaryAction={{ label: 'Cancel', onClick: onCancel }}
      onOpenChange={(open) => {
        if (!open) onCancel?.()
      }}
    />
  )
}
