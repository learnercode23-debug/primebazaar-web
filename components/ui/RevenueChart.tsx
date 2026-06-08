'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'

interface Props {
  data: { month: string; revenue: number }[]
  height?: number
}

const formatK = (v: number) =>
  v >= 1000 ? `Rs.${(v / 1000).toFixed(0)}k` : `Rs.${v}`

export default function RevenueChart({ data, height = 180 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} barSize={20} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
        <XAxis
          dataKey="month"
          tickFormatter={(v: string) => v.slice(5)}
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatK}
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          width={56}
        />
        <Tooltip
          formatter={(value) => [`Rs. ${Number(value).toLocaleString('en-NP')}`, 'Revenue']}
          labelFormatter={(label) => String(label)}
          contentStyle={{
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            fontSize: 12,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
          cursor={{ fill: '#f5f3ff' }}
        />
        <Bar dataKey="revenue" fill="#7C3AED" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
