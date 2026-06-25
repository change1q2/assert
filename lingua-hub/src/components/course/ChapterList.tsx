import { useState } from 'react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { Chapter } from '@/data/courses'
import { ChevronDown, BookOpen } from 'lucide-react'
import { LessonItem } from './LessonItem'

interface ChapterListProps {
  chapters: Chapter[]
  className?: string
}

export function ChapterList({ chapters, className }: ChapterListProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {chapters.map((chapter) => (
        <ChapterAccordion key={chapter.id} chapter={chapter} />
      ))}
    </div>
  )
}

interface ChapterAccordionProps {
  chapter: Chapter
}

function ChapterAccordion({ chapter }: ChapterAccordionProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center gap-3">
          <BookOpen size={18} className="text-blue-600 dark:text-blue-400" />
          <div className="text-left">
            <h4 className="font-medium text-gray-900 dark:text-white">
              {chapter.title}
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {chapter.titleEn} · {chapter.lessons.length} 课时
            </p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={18} className="text-gray-400" />
        </motion.div>
      </button>
      <motion.div
        initial={false}
        animate={{ height: isOpen ? 'auto' : 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
      >
        <div className="px-4 pb-3 pt-1 border-t border-gray-100 dark:border-gray-700">
          {chapter.lessons.map((lesson, index) => (
            <LessonItem
              key={lesson.id}
              lesson={lesson}
              index={index + 1}
            />
          ))}
        </div>
      </motion.div>
    </div>
  )
}
