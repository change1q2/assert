import { cn } from '@/lib/utils'
import { Avatar } from '@/components/common/Avatar'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'

interface Group {
  id: string
  name: string
  memberCount: number
  icon?: string
  description?: string
}

interface GroupCardProps {
  group: Group
  onJoin?: (groupId: string) => void
  className?: string
}

export function GroupCard({ group, onJoin, className }: GroupCardProps) {
  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-center gap-3">
        <Avatar src={group.icon} name={group.name} size="lg" />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base truncate">{group.name}</h3>
          <p className="text-sm text-gray-500">{group.memberCount} 成员</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => onJoin?.(group.id)}>
          加入
        </Button>
      </div>
    </Card>
  )
}
