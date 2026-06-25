import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CourseCard } from '@/components/course/CourseCard'
import { ChapterList } from '@/components/course/ChapterList'
import { Button } from '@/components/common/Button'
import { courses, Course } from '@/data/courses'
import { ArrowLeft, BookOpen, Clock, Users, Play, Sparkles } from 'lucide-react'

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

const languageLabels = {
  english: '英语',
  japanese: '日语',
  korean: '韩语',
}

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const course = courses.find((c) => c.id === id)

  const relatedCourses = courses
    .filter((c) => c.id !== id && c.language === course?.language)
    .slice(0, 3)

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            课程未找到
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            该课程可能已下架或不存在
          </p>
          <Button onClick={() => navigate('/courses')}>返回课程中心</Button>
        </div>
      </div>
    )
  }

  const totalDuration = course.chapters.reduce(
    (acc, ch) => acc + ch.lessons.reduce((la, le) => la + le.duration, 0),
    0
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12">
      {/* 头部导航 */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button
            onClick={() => navigate('/courses')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>返回课程中心</span>
          </button>
        </div>
      </div>

      {/* 课程封面和信息 */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 dark:from-blue-800 dark:to-blue-900">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-white/20 text-white">
                  {languageLabels[course.language]}
                </span>
                <span
                  className={cn(
                    'px-3 py-1 rounded-full text-sm font-medium',
                    course.level === 'beginner' && 'bg-green-500/20 text-green-200',
                    course.level === 'intermediate' && 'bg-yellow-500/20 text-yellow-200',
                    course.level === 'advanced' && 'bg-red-500/20 text-red-200'
                  )}
                >
                  {levelLabels[course.level]}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                {course.titleCn}
              </h1>
              <p className="text-xl text-blue-100 mb-6">{course.title}</p>

              <div className="flex flex-wrap gap-6 text-blue-100 mb-8">
                <div className="flex items-center gap-2">
                  <BookOpen size={20} />
                  <span>{course.totalLessons} 课时</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={20} />
                  <span>{totalDuration} 分钟</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users size={20} />
                  <span>{course.completedLessons} 已完成</span>
                </div>
              </div>

              <Button
                size="lg"
                onClick={() => navigate(`/learning/${course.chapters[0]?.lessons[0]?.id || ''}`)}
                className="bg-white text-blue-600 hover:bg-blue-50"
              >
                <Play size={20} className="mr-2" />
                开始学习
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/10 backdrop-blur rounded-2xl p-1"
            >
              <div className="aspect-video bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden">
                {course.coverImage ? (
                  <img
                    src={course.coverImage}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen size={60} className="text-white/50" />
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* 课程内容 */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧主内容 */}
          <div className="lg:col-span-2 space-y-8">
            {/* 课程描述 */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                课程介绍
              </h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                {course.description}
              </p>
            </motion.section>

            {/* 章节列表 */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                课程章节
              </h2>
              <ChapterList chapters={course.chapters} />
            </motion.section>
          </div>

          {/* 右侧边栏 */}
          <div className="space-y-6">
            {/* 学习进度 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                学习进度
              </h3>
              <div className="mb-3">
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                  <span>完成度</span>
                  <span>{Math.round((course.completedLessons / course.totalLessons) * 100)}%</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(course.completedLessons / course.totalLessons) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                    className="h-full bg-blue-600 rounded-full"
                  />
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                已完成 {course.completedLessons} / {course.totalLessons} 课时
              </p>
            </motion.div>

            {/* 开始学习按钮 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm"
            >
              <Button
                size="lg"
                className="w-full"
                onClick={() => navigate(`/learning/${course.chapters[0]?.lessons[0]?.id || ''}`)}
              >
                <Play size={20} className="mr-2" />
                继续学习
              </Button>
            </motion.div>
          </div>
        </div>

        {/* 相关推荐 */}
        {relatedCourses.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-12"
          >
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                相关推荐
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedCourses.map((relatedCourse, index) => (
                <motion.div
                  key={relatedCourse.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                >
                  <CourseCard course={relatedCourse} />
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}
      </div>
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}
