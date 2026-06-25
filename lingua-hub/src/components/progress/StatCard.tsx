import { cn } from '@/lib/utils'
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
import { motion } from 'framer-motion'

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  trend?: number
  gradient?: string
  className?: string
}

const gradients = {
  blue: 'from-blue-500 to-cyan-500',
  purple: 'from-purple-500 to-pink-500',
  green: 'from-emerald-500 to-teal-500',
  orange: 'from-orange-500 to-amber-500',
}

export function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  gradient = 'blue',
  className,
}: StatCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={cn(
        'relative overflow-hidden rounded-xl p-4 text-white shadow-lg',
        `bg-gradient-to-br ${gradients[gradient as keyof typeof gradients] || gradients.blue}`,
        className
      )}
    >
      {/* 背景装饰 */}
      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10" />
      <div className="absolute -right-2 -bottom-2 w-16 h-16 rounded-full bg-white/5" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
            <Icon className="w-5 h-5" />
          </div>
          {trend !== undefined && (
            <div
              className={cn(
                'flex items-center gap-1 text-xs font-medium bg-white/20 px-2 py-1 rounded-full',
                trend >= 0 ? 'text-emerald-200' : 'text-rose-200'
              )}
            >
              {trend >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {Math.abs(trend)}%
            </div>
          )}
        </div>

        <div className="text-2xl font-bold mb-1">{value}</div>
        <div className="text-sm text-white/80">{label}</div>
      </div>
    </motion.div>
  )
}
