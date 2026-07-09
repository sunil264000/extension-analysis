'use client'

import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

const chartConfig = {
  prompts: {
    label: 'Prompts',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig

export function UsageChart({
  data,
}: {
  data: { date: string; prompts: number }[]
}) {
  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
      <AreaChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="fillPrompts" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-prompts)" stopOpacity={0.5} />
            <stop offset="95%" stopColor="var(--color-prompts)" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={(value) =>
            new Date(value).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })
          }
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={28}
          allowDecimals={false}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(value: any) =>
                new Date(value).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              }
            />
          }
        />
        <Area
          dataKey="prompts"
          type="monotone"
          fill="url(#fillPrompts)"
          stroke="var(--color-prompts)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  )
}
