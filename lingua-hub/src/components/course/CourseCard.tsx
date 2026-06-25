import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { Course } from '@/data/courses'
import { BookOpen, Clock, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface CourseCardProps {
  course: Course
  className?: string
}

const levelColors = {
  beginner: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  intermediate: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  advanced: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
}

const levelLabels = {
  beginner: '初级',
  intermediate: '中级',
  advanced: '高级',
}

export function CourseCard({ course, className }: CourseCardProps) {
  const navigate = useNavigate()

  const handleClick = () => {
    navigate(`/course/${course.id}`)
  }

  return (
    <motion.div
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className={cn(
        'rounded-xl bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow cursor-pointer overflow-hidden',
        className
      )}
    >
      <div className="aspect-video bg-gray-200 dark:bg-gray-700 relative">
        {course.coverImage ? (
          <img
            src={course.coverImage}
            alt={course.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <BookOpen size={40} />
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span
            className={cn(
              'px-2 py-1 rounded-full text-xs font-medium',
              levelColors[course.level]
            )}
          >
            {levelLabels[course.level]}
          </span>
        </div>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
          {course.titleCn}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          {course.title}
        </p>
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Users size={14} />
            <span>{course.completedLessons}/{course.totalLessons}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock size={14} />
            <span>{course.chapters.reduce((acc, ch) => acc + ch.lessons.length, 0)} 课时</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
