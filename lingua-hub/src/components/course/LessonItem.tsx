import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { Lesson } from '@/data/courses'
import { Book, Headphones, Mic, Eye, CheckCircle, Circle, Play } from 'lucide-react'

interface LessonItemProps {
  lesson: Lesson
  index?: number
  className?: string
}

const typeIcons = {
  vocabulary: Book,
  grammar: Book,
  listening: Headphones,
  speaking: Mic,
  reading: Eye,
}

const typeLabels = {
  vocabulary: '词汇',
  grammar: '语法',
  listening: '听力',
  speaking: '口语',
  reading: '阅读',
}

export function LessonItem({ lesson, index, className }: LessonItemProps) {
  const Icon = typeIcons[lesson.type]
  const isCompleted = lesson.completed ?? false

  const handleClick = () => {
    console.log(`开始学习: ${lesson.id}`)
  }

  return (
    <motion.div
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className={cn(
        'flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors',
        className
      )}
    >
      {index !== undefined && (
        <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-600 flex items-center justify-center text-xs font-medium text-gray-500 dark:text-gray-300">
          {index}
        </span>
      )}
      <div className="flex-1 flex items-center gap-3">
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center',
          isCompleted ? 'bg-green-100 dark:bg-green-900' : 'bg-blue-100 dark:bg-blue-900'
        )}>
          <Icon
            size={16}
            className={isCompleted ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn(
            'font-medium text-gray-900 dark:text-white truncate',
            isCompleted && 'text-gray-500 dark:text-gray-400 line-through'
          )}>
            {lesson.title}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {typeLabels[lesson.type]} · {lesson.duration} 分钟
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isCompleted ? (
          <CheckCircle size={18} className="text-green-500" />
        ) : (
          <Circle size={18} className="text-gray-300 dark:text-gray-600" />
        )}
        <Play size={16} className="text-gray-400" />
      </div>
    </motion.div>
  )
}
