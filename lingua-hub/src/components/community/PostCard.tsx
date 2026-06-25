import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/common/Avatar'
import { Card } from '@/components/common/Card'
import type { Post } from '@/data/mockPosts'

interface PostCardProps {
  post: Post
  onLike?: (postId: string) => void
  className?: string
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}天前`
  if (hours > 0) return `${hours}小时前`
  if (minutes > 0) return `${minutes}分钟前`
  return '刚刚'
}

export function PostCard({ post, onLike, className }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(post.isLiked)
  const [likes, setLikes] = useState(post.likes)

  const handleLike = () => {
    const newIsLiked = !isLiked
    setIsLiked(newIsLiked)
    setLikes(newIsLiked ? likes + 1 : likes - 1)
    onLike?.(post.id)
  }

  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-start gap-3">
        <Avatar src={post.authorAvatar} name={post.authorName} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{post.authorName}</span>
            <span className="text-xs text-gray-500">{formatTimeAgo(post.createdAt)}</span>
          </div>
          <h3 className="mt-1 font-semibold text-base line-clamp-2">{post.title}</h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {post.content}
          </p>
          <div className="mt-3 flex items-center gap-4">
            <button
              onClick={handleLike}
              className={cn(
                'flex items-center gap-1 text-sm transition-colors',
                isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
              )}
            >
              <span>{isLiked ? '❤️' : '🤍'}</span>
              <span>{likes}</span>
            </button>
            <span className="flex items-center gap-1 text-sm text-gray-500">
              <span>💬</span>
              <span>{post.comments.length}</span>
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}
