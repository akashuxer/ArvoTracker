import { useState } from 'react'
import { ArvoSearch, ArvoChip, ArvoBadge, ArvoButton, ArvoAvatar, ArvoIconButton } from '@arvo/react'
import { ViewLoading } from '@o9qa/kit'
/**
 * The hub -- the tool chooser.
 *
 * Renders inside the standard shell; the header, rail and launchbar belong to
 * the shell, not to this view.
 */
export default function HubView({
  /* The catalogue is the host's data, not the shell's: a different hub shows
     a different set of tools from the same component. */
  tools: catalogue = [],
  status: STATUS = {},
  filters: FILTERS = [],
  toolColor = () => undefined,
  onOpenTool,
  pinnedIds = [],
  onTogglePin,
}) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')

  const tools = catalogue.filter((t) => {
    const matchesFilter =
      filter === 'all' || (filter === 'ready' ? t.status === 'ready' : t.status !== 'ready')
    const q = query.trim().toLowerCase()
    const matchesQuery =
      !q || t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
    return matchesFilter && matchesQuery
  })

  return (
    <div className="hub">
      <div className="hub-body">
        <p className="hub-eyebrow">Quality Automation / Utility Hub</p>
        <h1 className="hub-title">Choose a quality tool</h1>
        <p className="hub-lede">
          Smart utilities to validate logs, optimise batch runs, monitor performance and
          safeguard quality across environments.
        </p>

        <div className="hub-controls">
          {/* `find` is the bordered field; the default `filter` variant is
              borderless for a filter bar and disappears on a canvas.
              Filtering hangs off `onInput` -- `onChange` is the committed-value
              callback and does not fire per keystroke. */}
          <ArvoSearch
            variant="find"
            placeholder="Search tools…"
            value={query}
            isFullWidth
            /* `find` ships "previous match" / "next match" buttons. This is a
               filter, not a find-in-page, so both are omitted. */
            hasPreviousButton={false}
            hasNextButton={false}
            onInput={(event) => setQuery(event?.target?.value ?? '')}
            onClear={() => setQuery('')}
          />
          <div className="hub-filters">
            {FILTERS.map((f) => (
              <ArvoChip
                key={f.id}
                variant="filter"
                label={f.label}
                colorMode={f.tone === 'none' ? 'default' : 'semantic'}
                semanticType={f.tone}
                isSelected={filter === f.id}
                onSelectedChange={() => setFilter(f.id)}
              />
            ))}
          </div>
        </div>

        <ul className="tool-grid">
          {tools.map((tool, index) => {
            const status = STATUS[tool.status]
            const isReady = tool.status === 'ready'
            const isPinned = pinnedIds.includes(tool.id)
            return (
              <li key={tool.id}>
                <article className={`tool-card${isReady ? ' tool-card--ready' : ''}`}>
                  <div className="tool-card__head">
                    {/* ArvoAvatar's icon variant carries the tint, so the tile
                        colour comes from Arvo's palette rather than CSS here. */}
                    <ArvoAvatar
                      variant="icon"
                      icon={tool.icon}
                      size="lg"
                      appearance="primary"
                      colorMode="custom"
                      customColor={toolColor(index)}
                    />
                    <div className="tool-card__meta">
                      <ArvoBadge
                        variant="label"
                        message={status.label}
                        colorMode="semantic"
                        semanticType={status.semantic}
                        appearance="subtle"
                        size="sm"
                      />
                      <ArvoIconButton
                        className="tool-card__pin"
                        icon={isPinned ? 'push-pinned' : 'push-pin'}
                        tooltip={isPinned ? `Unpin ${tool.name}` : `Pin ${tool.name} to the rail`}
                        variant="tertiary"
                        size="sm"
                        isSelected={isPinned}
                        onClick={() => onTogglePin(tool.id)}
                      />
                    </div>
                  </div>

                  <h2 className="tool-card__name">{tool.name}</h2>
                  <p className="tool-card__desc">{tool.description}</p>

                  <div className="tool-card__foot">
                    {isReady ? (
                      <ArvoButton
                        variant="tertiary"
                        size="sm"
                        label="Open tool"
                        icon="arrow-right"
                        onClick={() => onOpenTool(tool.id)}
                      />
                    ) : (
                      <span className="tool-card__note">{status.note}</span>
                    )}
                  </div>
                </article>
              </li>
            )
          })}
        </ul>

        {!tools.length && <ViewLoading message="No tools match “{query}”." />}
      </div>
    </div>
  )
}
