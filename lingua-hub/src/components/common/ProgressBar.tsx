import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface ProgressBarProps {
  value: number
  max?: number
  color?: string
  className?: string
}

export function ProgressBar({ value, max = 100, color = 'bg-blue-600', className }: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  return (
    <div className={cn('w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden', className)}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={cn('h-full rounded-full', color)}
      />
    </div>
  )
}
