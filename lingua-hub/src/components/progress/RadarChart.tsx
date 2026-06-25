import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { BookOpen, Headphones, MessageCircle, PenTool } from 'lucide-react'

interface RadarChartProps {
  listening: number
  speaking: number
  reading: number
  writing: number
  className?: string
}

export function RadarChart({ listening, speaking, reading, writing, className }: RadarChartProps) {
  const data = [
    { subject: '听力', value: listening, icon: Headphones },
    { subject: '口语', value: speaking, icon: MessageCircle },
    { subject: '阅读', value: reading, icon: BookOpen },
    { subject: '写作', value: writing, icon: PenTool },
  ]

  const maxValue = 100

  return (
    <div className={cn('relative', className)}>
      <svg viewBox="0 0 200 200" className="w-full aspect-square">
        {/* 背景网格 */}
        {[1, 2, 3, 4].map((level) => (
          <polygon
            key={level}
            points={data
              .map((_, i) => {
                const angle = (Math.PI * 2 * i) / 4 - Math.PI / 2
                const r = (level / 4) * 70
                return `${100 + r * Math.cos(angle)},${100 + r * Math.sin(angle)}`
              })
              .join(' ')}
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.1"
            className="text-gray-400"
          />
        ))}

        {/* 轴线 */}
        {data.map((_, i) => {
          const angle = (Math.PI * 2 * i) / 4 - Math.PI / 2
          return (
            <line
              key={i}
              x1="100"
              y1="100"
              x2={100 + 70 * Math.cos(angle)}
              y2={100 + 70 * Math.sin(angle)}
              stroke="currentColor"
              strokeOpacity="0.1"
              className="text-gray-400"
            />
          )
        })}

        {/* 数据区域 */}
        <motion.polygon
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          points={data
            .map((d) => {
              const angle = (Math.PI * 2 * data.indexOf(d)) / 4 - Math.PI / 2
              const r = (d.value / maxValue) * 70
              return `${100 + r * Math.cos(angle)},${100 + r * Math.sin(angle)}`
            })
            .join(' ')}
          fill="url(#gradient)"
          fillOpacity="0.3"
          stroke="url(#gradient)"
          strokeWidth="2"
        />

        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgb(99, 102, 241)" />
            <stop offset="100%" stopColor="rgb(168, 85, 247)" />
          </linearGradient>
        </defs>
      </svg>

      {/* 标签 */}
      {data.map((d, i) => {
        const angle = (Math.PI * 2 * i) / 4 - Math.PI / 2
        const labelR = 85
        const x = 100 + labelR * Math.cos(angle)
        const y = 100 + labelR * Math.sin(angle)
        return (
          <div
            key={d.subject}
            className="absolute flex flex-col items-center"
            style={{
              left: `${(x / 200) * 100}%`,
              top: `${(y / 200) * 100}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <d.icon className="w-4 h-4 text-indigo-500 mb-1" />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
              {d.subject}
            </span>
            <span className="text-xs text-indigo-500 font-semibold">{d.value}</span>
          </div>
        )
      })}
    </div>
  )
}
