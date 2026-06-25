import { cn } from '@/lib/utils'

type DifficultyLevel = 'easy' | 'medium' | 'hard'

interface BadgeProps {
  difficulty: DifficultyLevel
  className?: string
}

const colors = {
  easy: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  hard: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
}

const labels = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
}

export function Badge({ difficulty, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'px-2 py-1 rounded-full text-xs font-medium',
        colors[difficulty],
        className
      )}
    >
      {labels[difficulty]}
    </span>
  )
}
