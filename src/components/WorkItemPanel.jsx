import { useEffect, useRef, useState } from 'react'
import { ArvoButton, ArvoPanel, ArvoSelect, ArvoTextarea, ArvoTextbox } from '@arvo/react'
import { AREAS_OF_WORK, PRIORITIES, STATUSES, TYPES, toItems, toStringItems } from '../data/enums'
import { OWNERS, RELEASES, TEAMS } from '../data/mock'

/**
 * Create or edit one work item.
 *
 * One panel for both. The fields, the rules and the wording are identical, and
 * giving edit its own form would be two things to keep in step for no gain --
 * `item` being null is what makes it a create.
 *
 * A date is a plain text field rather than ArvoDatePicker: the format is stated,
 * validated as you type, and the field is typeable, which is faster than a
 * calendar for a target three months out.
 */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

const EMPTY = {
  id: '',
  title: '',
  problem: '',
  type: 'new-request',
  area: 'Component',
  component: '',
  requestedBy: '',
  requestingTeam: 'arvo',
  owner: '',
  priority: 'medium',
  status: 'new',
  targetRelease: 'Unscheduled',
  requiredBy: '',
  figma: '',
  ticket: '',
}

/**
 * Two kinds of error, surfaced at different moments.
 *
 * A MISSING field is not a mistake until you try to save -- flagging an empty box
 * you have not reached yet is nagging. A MALFORMED value is a mistake the moment
 * it exists, and saying so at the character you typed beats saying so after a
 * round trip.
 */
function validate(form) {
  const required = {}
  const malformed = {}

  if (!form.title.trim()) required.title = 'A title is required.'
  if (!form.problem.trim()) required.problem = 'Say what the problem is — an item with no problem statement cannot be triaged.'
  if (!form.requestedBy.trim()) required.requestedBy = 'Name who asked, so the answer can reach them.'

  if (form.requiredBy && !ISO_DATE.test(form.requiredBy)) {
    malformed.requiredBy = 'Use YYYY-MM-DD, for example 2026-11-14.'
  } else if (form.requiredBy && Number.isNaN(new Date(form.requiredBy).getTime())) {
    malformed.requiredBy = 'That is not a real date.'
  }

  /* A URL typed without a scheme resolves against this app rather than the
     target, which looks like a broken link and is really a missing "https://". */
  ;['figma', 'ticket'].forEach((field) => {
    const v = form[field].trim()
    if (v && !/^https?:\/\//.test(v)) malformed[field] = 'Start with https:// so the link leaves this app.'
  })

  return { required, malformed, all: { ...required, ...malformed } }
}

export default function WorkItemPanel({ item, isOpen, nextId, onSave, onCancel }) {
  const [form, setForm] = useState(EMPTY)
  const [hasTriedSave, setTriedSave] = useState(false)

  /* Held in a ref and deliberately NOT an effect dependency. `nextId` is derived
     from the item list, so it is a new function every time that list changes --
     depending on it would reset a half-typed form the moment anything else was
     saved. The id only has to be right at the moment the panel opens. */
  const nextIdRef = useRef(nextId)
  nextIdRef.current = nextId

  useEffect(() => {
    if (!isOpen) return
    setForm(
      item
        ? { ...EMPTY, ...item, requiredBy: item.requiredBy ? item.requiredBy.slice(0, 10) : '' }
        : { ...EMPTY, id: nextIdRef.current() }
    )
    setTriedSave(false)
  }, [item, isOpen])

  const { required, malformed, all } = validate(form)
  /* Malformed always shows; missing waits for a save attempt. */
  const shown = (field) => malformed[field] ?? (hasTriedSave ? required[field] : undefined)
  const onText = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  const onPick = (field) => ({ value }) => setForm((f) => ({ ...f, [field]: value }))

  function submit(event) {
    event.preventDefault()
    setTriedSave(true)
    if (Object.keys(all).length) return
    onSave({
      ...form,
      title: form.title.trim(),
      problem: form.problem.trim(),
      component: form.component.trim(),
      requestedBy: form.requestedBy.trim(),
      /* Stored as a full ISO instant like every other date in the model, so
         sorting a typed date against a seeded one compares like with like. */
      requiredBy: form.requiredBy ? new Date(form.requiredBy).toISOString() : '',
      figma: form.figma.trim(),
      ticket: form.ticket.trim(),
      notes: item?.notes ?? [],
    })
  }

  return (
    <ArvoPanel
      displayMode="overlay"
      placement="right"
      title={item ? `Edit ${item.id}` : 'Add work item'}
      defaultSize={520}
      isOpen={isOpen}
      onClose={onCancel}
    >
      <form className="form-stack" onSubmit={submit} noValidate>
        {/* Stated, not fielded. An id nobody can change should not look like a
            box you could type in -- and ArvoTextbox has no read-only state in
            3.1.2, so a disabled field would read as "not available yet" rather
            than "fixed". */}
        <div className="field-block">
          <span className="field-block__label">ID</span>
          <p className="trk-prose">
            <code className="trk-code">{form.id}</code>
          </p>
          <p className="field-hint">
            {item ? 'Ids are never reused, so this one is fixed.' : 'Assigned from the next free number.'}
          </p>
        </div>

        <ArvoTextbox
          label="Title"
          placeholder="e.g. ArvoSelect should accept an async item loader"
          value={form.title}
          isRequired
          isFullWidth
          isInvalid={!!shown('title')}
          errorMsg={shown('title')}
          errorDisplay="inline"
          onInput={onText('title')}
        />

        <div className="field-block">
          <ArvoTextarea
            label="Problem statement"
            placeholder="What breaks, for whom, and what it costs them today."
            rows={4}
            /* size="sm" matches the fields around it: ArvoTextarea defaults its
               label to 14px while Textbox and Select render 12px, so the label
               would otherwise come out visibly bigger than the rest. */
            size="sm"
            resizable="vertical"
            isFullWidth
            value={form.problem}
            isInvalid={!!shown('problem')}
            errorMsg={shown('problem')}
            errorDisplay="inline"
            onInput={onText('problem')}
          />
          {!shown('problem') && (
            <p className="field-hint">
              The problem, not the solution. A stated cost is what lets this be ranked against
              everything else.
            </p>
          )}
        </div>

        <div className="trk-form-grid">
          <ArvoSelect label="Type" items={toItems(TYPES)} value={form.type} isFullWidth onChange={onPick('type')} />
          <ArvoSelect label="Area" items={toStringItems(AREAS_OF_WORK)} value={form.area} isFullWidth onChange={onPick('area')} />
          <ArvoSelect label="Priority" items={toItems(PRIORITIES)} value={form.priority} isFullWidth onChange={onPick('priority')} />
          <ArvoSelect label="Status" items={toItems(STATUSES)} value={form.status} isFullWidth onChange={onPick('status')} />
        </div>

        <ArvoTextbox
          label="Component or pattern name"
          placeholder="e.g. ArvoCombobox"
          value={form.component}
          isFullWidth
          onInput={onText('component')}
        />

        <div className="trk-form-grid">
          <ArvoTextbox
            label="Requested by"
            placeholder="Who asked"
            value={form.requestedBy}
            isRequired
            isFullWidth
            isInvalid={!!shown('requestedBy')}
            errorMsg={shown('requestedBy')}
            errorDisplay="inline"
            onInput={onText('requestedBy')}
          />
          <ArvoSelect
            label="Requesting team"
            items={TEAMS.map((t) => ({ id: t.id, value: t.id, label: t.name }))}
            value={form.requestingTeam}
            isFullWidth
            onChange={onPick('requestingTeam')}
          />
          <ArvoSelect
            label="Owner"
            items={[{ id: '', value: '', label: 'Unassigned' }, ...toStringItems(OWNERS)]}
            value={form.owner}
            isFullWidth
            onChange={onPick('owner')}
          />
          <ArvoSelect
            label="Target release"
            items={toStringItems(RELEASES)}
            value={form.targetRelease}
            isFullWidth
            onChange={onPick('targetRelease')}
          />
        </div>

        <div className="field-block">
          <ArvoTextbox
            label="Required-by date"
            placeholder="YYYY-MM-DD"
            value={form.requiredBy}
            isFullWidth
            isInvalid={!!shown('requiredBy')}
            errorMsg={shown('requiredBy')}
            errorDisplay="inline"
            onInput={onText('requiredBy')}
          />
          {!shown('requiredBy') && (
            <p className="field-hint">
              Optional. A date here is a commitment someone else has made plans around, so leave it
              empty rather than guessing.
            </p>
          )}
        </div>

        <ArvoTextbox
          label="Figma link"
          placeholder="https://figma.com/file/…"
          value={form.figma}
          isFullWidth
          isInvalid={!!shown('figma')}
          errorMsg={shown('figma')}
          errorDisplay="inline"
          onInput={onText('figma')}
        />

        <ArvoTextbox
          label="Development ticket"
          placeholder="https://o9git.visualstudio.com/…"
          value={form.ticket}
          isFullWidth
          isInvalid={!!shown('ticket')}
          errorMsg={shown('ticket')}
          errorDisplay="inline"
          onInput={onText('ticket')}
        />

        <div className="form-actions">
          <ArvoButton variant="secondary" label="Cancel" onClick={onCancel} />
          <ArvoButton
            type="submit"
            variant="primary"
            label={item ? 'Save changes' : 'Add item'}
            icon={item ? undefined : 'plus'}
          />
        </div>
      </form>
    </ArvoPanel>
  )
}
