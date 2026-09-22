import { useRef } from 'react'
import { ArvoButton } from '@arvo/react'

/**
 * Drop target plus a file dialog, shared by every upload on the platform.
 *
 * The Jinja pages used three different markups for the same job (a bare
 * `<input type=file>` on the dashboard, a styled dropzone for HAR, another for
 * logs). One component means an upload looks and behaves the same wherever it
 * appears.
 */
export default function FilePicker({ file, onChange, accept, hint, label = 'a file' }) {
  const inputRef = useRef(null)

  return (
    <div
      className={`dropzone${file ? ' dropzone--filled' : ''}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        onChange(e.dataTransfer.files?.[0] ?? null)
      }}
    >
      <span className="o9con o9con-cloud-upload dropzone__icon" aria-hidden="true" />
      {file ? (
        <>
          <p className="dropzone__name">{file.name}</p>
          <p className="dropzone__meta">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
        </>
      ) : (
        <>
          <p className="dropzone__name">Drop {label} here</p>
          {hint && <p className="dropzone__meta">{hint}</p>}
        </>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />

      <div className="dropzone__actions">
        <ArvoButton
          variant="secondary"
          size="sm"
          label={file ? 'Choose another' : 'Choose file'}
          onClick={() => inputRef.current?.click()}
        />
      </div>
    </div>
  )
}
