import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface CalendarHeatmapProps {
  data: { date: string; duration: number }[]
  className?: string
}

export function CalendarHeatmap({ data, className }: CalendarHeatmapProps) {
  const today = new Date()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getDay()

  const dataMap = new Map(data.map((d) => [d.date, d.duration]))
  const maxDuration = Math.max(...data.map((d) => d.duration), 1)

  const getColor = (duration: number) => {
    if (duration === 0) return 'bg-gray-100 dark:bg-gray-800'
    const intensity = duration / maxDuration
    if (intensity < 0.25) return 'bg-indigo-200'
    if (intensity < 0.5) return 'bg-indigo-400'
    if (intensity < 0.75) return 'bg-indigo-500'
    return 'bg-indigo-600'
  }

  const monthName = today.toLocaleDateString('zh-CN', { month: 'long', year: 'numeric' })

  const weeks = ['日', '一', '二', '三', '四', '五', '六']

  return (
    <div className={cn('p-4', className)}>
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
          {monthName}
        </h3>
        <p className="text-xs text-gray-500">学习打卡</p>
      </div>

      {/* 星期标题 */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weeks.map((w) => (
          <div key={w} className="text-center text-xs text-gray-500">
            {w}
          </div>
        ))}
      </div>

      {/* 日期网格 */}
      <div className="grid grid-cols-7 gap-1">
        {/* 空白填充 */}
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {/* 日期 */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
          const duration = dataMap.get(date) || 0
          const isToday = i + 1 === today.getDate()

          return (
            <motion.div
              key={date}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.01, duration: 0.2 }}
              className={cn(
                'aspect-square rounded-md flex items-center justify-center text-xs font-medium transition-colors cursor-default',
                getColor(duration),
                isToday && 'ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-gray-900'
              )}
              title={`${date}: ${duration}分钟`}
            >
              {i + 1}
            </motion.div>
          )
        })}
      </div>

      {/* 图例 */}
      <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-500">
        <span>少</span>
        <div className="flex gap-1">
          <div className="w-4 h-4 rounded bg-gray-100 dark:bg-gray-800" />
          <div className="w-4 h-4 rounded bg-indigo-200" />
          <div className="w-4 h-4 rounded bg-indigo-400" />
          <div className="w-4 h-4 rounded bg-indigo-500" />
          <div className="w-4 h-4 rounded bg-indigo-600" />
        </div>
        <span>多</span>
      </div>
    </div>
  )
}
