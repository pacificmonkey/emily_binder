import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { useMonthlySpending } from '@/hooks/use-budget'

interface ChartData {
  month: string
  monthStart: string
  income: number
  expense: number
  net: number
}

export function SpendingChart() {
  const { data: monthlyData = [] } = useMonthlySpending(6)

  // Transform data for the chart
  const chartData: ChartData[] = monthlyData.map((item) => {
    const date = new Date(item.month_start)
    const month = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    const income = item.total_income || 0
    const expense = item.total_expense || 0
    const net = income - expense

    return {
      month,
      monthStart: item.month_start,
      income,
      expense,
      net,
    }
  })

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null

    return (
      <div className="rounded-soft bg-surface-raised shadow-raised border border-border p-3">
        <p className="text-xs font-medium text-content">{payload[0].payload.month}</p>
        <p className="text-xs text-success">
          Income: ${payload[0].payload.income.toFixed(2)}
        </p>
        <p className="text-xs text-danger">
          Expense: ${payload[0].payload.expense.toFixed(2)}
        </p>
        <p className={`text-xs font-semibold ${payload[0].payload.net >= 0 ? 'text-success' : 'text-danger'}`}>
          Net: ${payload[0].payload.net.toFixed(2)}
        </p>
      </div>
    )
  }

  const CustomXAxisTick = ({ x, y, payload }: any) => {
    return (
      <text x={x} y={y + 10} textAnchor="middle" fontSize={12} fill="#6B7280" className="text-content-muted">
        {payload.value}
      </text>
    )
  }

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
        >
          <XAxis
            dataKey="month"
            tick={<CustomXAxisTick />}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#6B7280', fontSize: 12 }}
            label={{ value: 'Amount ($)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="square"
            height={36}
          />
          <Bar
            dataKey="income"
            fill="#10b981"
            name="Income"
            radius={[4, 4, 0, 0]}
            minPointSize={2}
          />
          <Bar
            dataKey="expense"
            fill="#ef4444"
            name="Expense"
            radius={[4, 4, 0, 0]}
            minPointSize={2}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Legend and Info */}
      <div className="mt-4 flex items-center justify-center gap-6 text-xs text-content-secondary">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-success" />
          <span>Income</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-danger" />
          <span>Expense</span>
        </div>
      </div>

      {chartData.length === 0 && (
        <div className="flex items-center justify-center h-[300px]">
          <p className="text-sm text-content-muted">No spending data available</p>
        </div>
      )}
    </div>
  )
}
