import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { CourseCard } from '@/components/course/CourseCard'
import { courses, Language, Course as CourseType } from '@/data/courses'
import { BookOpen } from 'lucide-react'

type LevelFilter = 'all' | 'beginner' | 'intermediate' | 'advanced'

const languageTabs: { label: string; value: Language | 'all' }[] = [
  { label: '全部', value: 'all' },
  { label: '英语', value: 'english' },
  { label: '日语', value: 'japanese' },
  { label: '韩语', value: 'korean' },
]

const levelTabs: { label: string; value: LevelFilter }[] = [
  { label: '全部', value: 'all' },
  { label: '初级', value: 'beginner' },
  { label: '中级', value: 'intermediate' },
  { label: '高级', value: 'advanced' },
]

const levelLabels = {
  beginner: '初级',
  intermediate: '中级',
  advanced: '高级',
}

export default function CoursesPage() {
  const [selectedLanguage, setSelectedLanguage] = useState<Language | 'all'>('all')
  const [selectedLevel, setSelectedLevel] = useState<LevelFilter>('all')

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const languageMatch = selectedLanguage === 'all' || course.language === selectedLanguage
      const levelMatch = selectedLevel === 'all' || course.level === selectedLevel
      return languageMatch && levelMatch
    })
  }, [selectedLanguage, selectedLevel])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-8">
      {/* 头部 */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-4"
          >
            <BookOpen className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">课程中心</h1>
          </motion.div>

          {/* 语言切换标签 */}
          <div className="flex gap-2 mb-4">
            {languageTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setSelectedLanguage(tab.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedLanguage === tab.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 难度筛选标签 */}
          <div className="flex gap-2">
            {levelTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setSelectedLevel(tab.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedLevel === tab.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 课程网格 */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {filteredCourses.length > 0 ? (
          <>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              共找到 {filteredCourses.length} 门课程
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredCourses.map((course, index) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <CourseCard course={course} />
                </motion.div>
              ))}
            </div>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <BookOpen className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              暂无相关课程
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              尝试切换筛选条件查看更多课程
            </p>
          </motion.div>
        )}
      </div>
    </div>
  )
}
