import { cn } from '@/lib/utils'
import { Card } from '@/components/common/Card'
import { ProgressBar } from '@/components/common/ProgressBar'
import type { Achievement } from '@/data/achievements'

interface AchievementCardProps {
  achievement: Achievement
  className?: string
}

export function AchievementCard({ achievement, className }: AchievementCardProps) {
  const isUnlocked = !!achievement.unlockedAt
  const progress = achievement.progress ?? 0
  const target = achievement.target ?? 100
  const percentage = Math.min((progress / target) * 100, 100)

  return (
    <Card
      className={cn(
        'p-3 flex flex-col items-center text-center',
        !isUnlocked && 'opacity-70',
        className
      )}
    >
      <div
        className={cn(
          'w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-2',
          isUnlocked ? 'bg-yellow-100' : 'bg-gray-100 dark:bg-gray-700'
        )}
      >
        {achievement.icon}
      </div>
      <h4 className="font-semibold text-sm truncate w-full">{achievement.title}</h4>
      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{achievement.description}</p>
      {!isUnlocked && (
        <div className="w-full mt-2">
          <ProgressBar value={progress} max={target} />
          <p className="text-xs text-gray-500 mt-1">
            {progress}/{target}
          </p>
        </div>
      )}
    </Card>
  )
}
