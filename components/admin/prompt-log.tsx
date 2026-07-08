'use client'

import { useEffect, useState, useTransition } from 'react'
import { getPromptEvents, setPromptFlag } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Flag, Search, ShieldCheck } from 'lucide-react'

type PromptRow = Awaited<ReturnType<typeof getPromptEvents>>[number]

export function PromptLog() {
  const [rows, setRows] = useState<PromptRow[]>([])
  const [search, setSearch] = useState('')
  const [flaggedOnly, setFlaggedOnly] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    getPromptEvents({ search: search.trim() || undefined, flaggedOnly, limit: 200 })
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }

  // Reload whenever the filter toggles.
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flaggedOnly])

  const toggleFlag = (row: PromptRow) => {
    startTransition(async () => {
      await setPromptFlag(row.id, !row.flagged, 'Reviewed by admin')
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? { ...r, flagged: !r.flagged, flagReason: !r.flagged ? 'Reviewed by admin' : null }
            : r
        )
      )
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            load()
          }}
          className="relative flex-1 min-w-[220px]"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prompt text, email, or license key"
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-brand"
          />
        </form>
        <Button
          type="button"
          variant={flaggedOnly ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFlaggedOnly((v) => !v)}
          className={flaggedOnly ? 'bg-amber-500 text-white hover:bg-amber-500/90' : ''}
        >
          <AlertTriangle className="mr-1 h-4 w-4" />
          {flaggedOnly ? 'Showing flagged' : 'Flagged only'}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={load}>
          Refresh
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <div className="grid grid-cols-12 gap-2 border-b border-border bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
          <div className="col-span-4">Prompt</div>
          <div className="col-span-3">User</div>
          <div className="col-span-2">Project</div>
          <div className="col-span-2">When</div>
          <div className="col-span-1 text-right">Action</div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No prompt activity found.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {rows.map((row) => (
              <div
                key={row.id}
                className={`px-4 py-3 text-sm ${row.flagged ? 'bg-amber-500/5' : ''}`}
              >
                <div className="grid grid-cols-12 items-start gap-2">
                  <div className="col-span-4">
                    <button
                      type="button"
                      onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                      className="text-left"
                    >
                      <span className={expanded === row.id ? '' : 'line-clamp-2'}>
                        {row.promptText || `(${row.promptLength} chars, text not stored)`}
                      </span>
                    </button>
                    {row.flagged && (
                      <span className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-500">
                        <AlertTriangle className="h-3 w-3" />
                        {row.flagReason || 'Flagged'}
                      </span>
                    )}
                    {expanded === row.id && (
                      <div className="mt-2 space-y-0.5 rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
                        <div>Key: {row.licenseKey || '—'}</div>
                        <div>IP: {row.ipAddress || '—'}</div>
                        <div className="truncate">Device: {row.hardwareFingerprint || '—'}</div>
                        <div className="truncate">URL: {row.pageUrl || '—'}</div>
                      </div>
                    )}
                  </div>
                  <div className="col-span-3 truncate text-muted-foreground">
                    {row.email || row.userId.slice(0, 12)}
                  </div>
                  <div className="col-span-2 truncate text-muted-foreground">
                    {row.projectId || '—'}
                  </div>
                  <div className="col-span-2 text-xs text-muted-foreground">
                    {new Date(row.createdAt).toLocaleString()}
                  </div>
                  <div className="col-span-1 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => toggleFlag(row)}
                      title={row.flagged ? 'Clear flag' : 'Flag as abuse'}
                    >
                      {row.flagged ? (
                        <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Flag className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
