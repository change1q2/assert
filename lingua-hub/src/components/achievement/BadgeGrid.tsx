import { cn } from '@/lib/utils'
import { AchievementCard } from './AchievementCard'
import type { Achievement } from '@/data/achievements'

interface BadgeGridProps {
  achievements: Achievement[]
  className?: string
  onAchievementClick?: (achievement: Achievement) => void
}

export function BadgeGrid({ achievements, className, onAchievementClick }: BadgeGridProps) {
  const unlocked = achievements.filter((a) => a.unlockedAt)
  const locked = achievements.filter((a) => !a.unlockedAt)

  return (
    <div className={cn('space-y-6', className)}>
      {unlocked.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-gray-500 mb-3">已获得</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {unlocked.map((achievement) => (
              <div key={achievement.id} onClick={() => onAchievementClick?.(achievement)}>
                <AchievementCard achievement={achievement} />
              </div>
            ))}
          </div>
        </section>
      )}
      {locked.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-gray-500 mb-3">进行中</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {locked.map((achievement) => (
              <div key={achievement.id} onClick={() => onAchievementClick?.(achievement)}>
                <AchievementCard achievement={achievement} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
