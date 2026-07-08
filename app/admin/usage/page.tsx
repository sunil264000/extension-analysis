import { getPromptOverview } from '@/app/actions/admin'
import { UsageChart } from '@/components/dashboard/usage-chart'
import { PromptLog } from '@/components/admin/prompt-log'

export default async function AdminUsagePage() {
  const overview = await getPromptOverview()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Extension Usage</h1>
        <p className="text-sm text-muted-foreground">
          Every prompt users send through the extension, with abuse detection.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total prompts" value={overview.totalPrompts.toLocaleString()} />
        <StatCard label="Prompts today" value={overview.promptsToday.toLocaleString()} />
        <StatCard label="Active users" value={overview.activeUsers.toLocaleString()} />
        <StatCard
          label="Flagged prompts"
          value={overview.flaggedPrompts.toLocaleString()}
          highlight={overview.flaggedPrompts > 0}
        />
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-2 px-2 font-semibold">Prompts per day (30d)</h2>
        {overview.totalPrompts > 0 ? (
          <UsageChart data={overview.daily} />
        ) : (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            No prompt activity recorded yet.
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 font-semibold">Prompt log</h2>
        <PromptLog />
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-lg border bg-card p-6 ${
        highlight ? 'border-amber-500/40' : 'border-border'
      }`}
    >
      <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
      <p className={`mt-2 text-3xl font-bold ${highlight ? 'text-amber-500' : ''}`}>
        {value}
      </p>
    </div>
  )
}
