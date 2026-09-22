import { useEffect, useState } from 'react'
import { ArvoButton, ArvoPanel, ArvoTextarea, useArvoToast } from '@arvo/react'
import { useTracker } from '../data/store'

/**
 * Import scan results.
 *
 * This is the seam the CI job will post to. Doing it by hand from a pasted
 * payload first is deliberate: it proves the shape before anything depends on
 * it, and it gives whoever wires the pipeline something to test against.
 *
 * The payload is exactly what a push produces -- one push, many findings --
 * rather than a flat list of violations, because repeat detection and the
 * "latest push" count both need the push to be a thing.
 */
const EXAMPLE = {
  repository: 'platform-dashboard',
  branch: 'feature/new-kpi',
  commitId: 'a72f9c1',
  commitMessage: 'Add inventory KPI cards',
  author: 'Developer name',
  team: 'dashboard',
  timestamp: '2026-09-22T10:30:00Z',
  violations: [
    {
      ruleId: 'ARVO-COLOR-001',
      category: 'Hard-coded color',
      severity: 'Medium',
      productArea: 'dashboard',
      file: 'src/components/InventoryKPI.tsx',
      line: 48,
      message: 'Use an Arvo semantic color token instead of #FF0000.',
      recommendedFix: 'Replace with var(--arvo-color-status-critical).',
    },
    {
      ruleId: 'ARVO-A11Y-001',
      productArea: 'dashboard',
      file: 'src/components/InventoryKPI.tsx',
      line: 112,
      occurrences: 3,
      message: 'Icon-only button has no accessible name.',
    },
  ],
}

export default function ImportScanPanel({ isOpen, onClose }) {
  const { importScan } = useTracker()
  const toast = useArvoToast()
  const [text, setText] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isOpen) return
    setText('')
    setError(null)
  }, [isOpen])

  function submit(event) {
    event.preventDefault()
    let payload
    try {
      payload = JSON.parse(text)
    } catch (e) {
      /* The parser's own message names the character and the position, which is
         far more use than "invalid JSON" -- a trailing comma is the usual cause
         and it says so. */
      setError(`That is not valid JSON. ${e.message}`)
      return
    }
    const result = importScan(payload)
    if (!result.ok) {
      setError(result.error)
      return
    }
    toast.show({
      type: 'positive',
      title: 'Scan imported',
      message: `${result.added} finding${result.added === 1 ? '' : 's'} from ${payload.repository}.`,
    })
    onClose()
  }

  return (
    <ArvoPanel
      displayMode="overlay"
      placement="right"
      title="Import scan results"
      defaultSize={560}
      isOpen={isOpen}
      onClose={onClose}
    >
      <form className="form-stack" onSubmit={submit} noValidate>
        {/* A neutral banner at the top, before the field: what this expects is
            something you need to know BEFORE you paste, not after it fails. */}
        <div className="trk-banner" role="status">
          <span className="o9con o9con-info-circle trk-banner__ico" aria-hidden="true" />
          <div>
            <p className="trk-banner__title">One push, many findings</p>
            <p className="trk-banner__text">
              Paste the JSON a CI run produces. Every <code className="trk-code">ruleId</code> must
              already exist in the rule registry — a finding with no rule behind it cannot tell a
              team what to do, so the import is refused rather than partially applied. Category and
              severity come from the rule, not from the payload.
            </p>
          </div>
        </div>

        <ArvoTextarea
          label="Scan payload (JSON)"
          placeholder='{ "repository": "platform-dashboard", "violations": [ … ] }'
          rows={16}
          /* size="sm" matches the rest of the forms in this app: ArvoTextarea
             defaults its label to 14px while Textbox and Select render 12px. */
          size="sm"
          resizable="vertical"
          isFullWidth
          value={text}
          isInvalid={!!error}
          errorMsg={error ?? undefined}
          errorDisplay="inline"
          onInput={(e) => {
            setText(e.target.value)
            /* Clear on edit rather than on submit: keeping a stale error beside a
               field someone is already fixing reads as a second problem. */
            if (error) setError(null)
          }}
        />

        <div className="form-actions form-actions--split">
          <ArvoButton
            variant="inline"
            size="sm"
            label="Load the example payload"
            onClick={() => {
              setText(JSON.stringify(EXAMPLE, null, 2))
              setError(null)
            }}
          />
          <span className="trk-spacer" />
          <ArvoButton variant="secondary" label="Cancel" onClick={onClose} />
          <ArvoButton
            type="submit"
            variant="primary"
            label="Import"
            icon="cloud-upload"
            isDisabled={!text.trim()}
          />
        </div>
      </form>
    </ArvoPanel>
  )
}
