import { useState, useEffect } from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const defaultTooltipFormatter = (value) => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 0,
  }).format(value);
};

export default function BarChart({ data, tooltipFormatter = defaultTooltipFormatter }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart data={data} barGap={8} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#E5E7EB'} />
          <XAxis
            dataKey="month"
            tick={{ fill: isDark ? '#9CA3AF' : '#6B7280', fontSize: 12 }}
            axisLine={{ stroke: isDark ? '#334155' : '#E5E7EB' }}
          />
          <YAxis
            tick={{ fill: isDark ? '#9CA3AF' : '#6B7280', fontSize: 12 }}
            axisLine={{ stroke: isDark ? '#334155' : '#E5E7EB' }}
            tickFormatter={(value) => {
              if (value >= 10000) return `${(value / 10000).toFixed(0)}万`;
              return value;
            }}
          />
          <Tooltip
            formatter={tooltipFormatter}
            contentStyle={{
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              border: `1px solid ${isDark ? '#334155' : '#E5E7EB'}`,
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
            labelStyle={{ color: isDark ? '#F3F4F6' : '#111827', fontWeight: 600 }}
            itemStyle={{ color: isDark ? '#D1D5DB' : '#374151' }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '10px', color: isDark ? '#D1D5DB' : '#374151' }}
            iconType="rect"
          />
          <Bar dataKey="income" name="收入" fill="#10B981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expense" name="支出" fill="#EF4444" radius={[4, 4, 0, 0]} />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
