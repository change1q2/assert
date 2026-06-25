import { motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Avatar } from '@/components/common/Avatar';
import { ProgressBar } from '@/components/common/ProgressBar';
import { StatCard } from '@/components/progress/StatCard';
import { CourseCard } from '@/components/course/CourseCard';
import { useAuthStore } from '@/store/authStore';
import { useProgressStore } from '@/store/progressStore';
import { courses, Course, Language } from '@/data/courses';
import {
  Clock,
  BookOpen,
  Flame,
  ChevronLeft,
  ChevronRight,
  Globe,
  Play,
  Sparkles,
} from 'lucide-react';

const languageInfo: Record<Language, { name: string; flag: string; color: string }> = {
  english: { name: '英语', flag: '🇬🇧', color: 'bg-blue-500' },
  japanese: { name: '日语', flag: '🇯🇵', color: 'bg-pink-500' },
  korean: { name: '韩语', flag: '🇰🇷', color: 'bg-purple-500' },
};

const carouselVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}小时${minutes}分钟`;
  }
  return `${minutes}分钟`;
}

export default function HomePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { stats } = useProgressStore();

  const [carouselIndex, setCarouselIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('english');

  const todayStats = useMemo(() => {
    const today = new Date().toDateString();
    return {
      learningTime: formatTime(stats.totalTime),
      wordsLearned: stats.totalWords,
      streakDays: stats.streakDays,
      dailyGoal: 120,
      dailyProgress: Math.min((stats.totalTime / 60 / stats.streakDays) * 100, 100),
    };
  }, [stats]);

  const recentCourses = useMemo(() => {
    return courses
      .filter((c) => c.completedLessons > 0 && c.completedLessons < c.totalLessons)
      .slice(0, 3);
  }, []);

  const recommendedCourses = useMemo(() => {
    const inProgressIds = recentCourses.map((c) => c.id);
    const sameLanguage = courses.filter(
      (c) => c.language === selectedLanguage && !inProgressIds.includes(c.id)
    );
    const others = courses.filter(
      (c) => c.language !== selectedLanguage && !inProgressIds.includes(c.id)
    );
    return [...sameLanguage, ...others].slice(0, 6);
  }, [recentCourses, selectedLanguage]);

  const handleLanguageSwitch = (lang: Language) => {
    setSelectedLanguage(lang);
  };

  const nextSlide = () => {
    setDirection(1);
    setCarouselIndex((prev) => (prev + 1) % recommendedCourses.length);
  };

  const prevSlide = () => {
    setDirection(-1);
    setCarouselIndex(
      (prev) => (prev - 1 + recommendedCourses.length) % recommendedCourses.length
    );
  };

  const getCourseProgress = (course: Course) => {
    return Math.round((course.completedLessons / course.totalLessons) * 100);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* 欢迎区域 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <Avatar
              src={user?.avatar}
              name={user?.name || '游客'}
              size="lg"
              className="ring-4 ring-blue-100 dark:ring-blue-900"
            />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {isAuthenticated && user
                  ? `${getGreeting()}，${user.name}！`
                  : '欢迎来到 lingua hub'}
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                {isAuthenticated
                  ? '继续你的学习之旅吧'
                  : '登录以同步学习进度'}
              </p>
            </div>
          </div>
          {!isAuthenticated && (
            <Button onClick={() => navigate('/login')}>登录</Button>
          )}
        </motion.div>

        {/* 今日学习卡片 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <StatCard
            icon={Clock}
            label="今日学习时长"
            value={todayStats.learningTime}
            gradient="blue"
            className="cursor-pointer"
          />
          <StatCard
            icon={BookOpen}
            label="已掌握单词"
            value={todayStats.wordsLearned}
            gradient="purple"
            className="cursor-pointer"
          />
          <StatCard
            icon={Flame}
            label="连续学习"
            value={`${todayStats.streakDays}天`}
            gradient="orange"
            className="cursor-pointer"
          />
          <Card className="p-4 flex flex-col items-center justify-center">
            <div className="relative w-20 h-20">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-gray-200 dark:text-gray-700"
                />
                <motion.circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 36}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 36 }}
                  animate={{
                    strokeDashoffset:
                      2 * Math.PI * 36 * (1 - todayStats.dailyProgress / 100),
                  }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="text-blue-600 dark:text-blue-400"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {Math.round(todayStats.dailyProgress)}%
                </span>
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">日目标进度</p>
          </Card>
        </motion.div>

        {/* 语言切换快捷入口 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="font-semibold text-gray-900 dark:text-white">选择学习语言</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {(Object.keys(languageInfo) as Language[]).map((lang) => (
                <motion.button
                  key={lang}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleLanguageSwitch(lang)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                    selectedLanguage === lang
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <span className="text-xl">{languageInfo[lang].flag}</span>
                  <span className="font-medium">{languageInfo[lang].name}</span>
                </motion.button>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* 继续学习区域 */}
        {recentCourses.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Play className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h2 className="font-semibold text-gray-900 dark:text-white">继续学习</h2>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/courses')}>
                  查看全部
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {recentCourses.map((course) => (
                  <motion.div
                    key={course.id}
                    whileHover={{ scale: 1.02 }}
                    className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer"
                    onClick={() => navigate(`/course/${course.id}`)}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={`w-10 h-10 rounded-lg ${languageInfo[course.language]?.color || 'bg-blue-500'} flex items-center justify-center text-white text-lg`}
                      >
                        {languageInfo[course.language]?.flag || '🌐'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 dark:text-white truncate">
                          {course.titleCn}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {course.completedLessons}/{course.totalLessons} 课时
                        </p>
                      </div>
                    </div>
                    <ProgressBar
                      value={getCourseProgress(course)}
                      color="bg-blue-600"
                      className="mb-2"
                    />
                    <Button className="w-full" size="sm">
                      继续学习
                    </Button>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* 推荐课程轮播 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h2 className="font-semibold text-gray-900 dark:text-white">为你推荐</h2>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={prevSlide}
                  className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
                <button
                  onClick={nextSlide}
                  className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
              </div>
            </div>
            <div className="relative overflow-hidden">
              <div className="flex items-center justify-center min-h-[320px]">
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={carouselIndex}
                    custom={direction}
                    variants={carouselVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="w-full max-w-sm"
                  >
                    <CourseCard course={recommendedCourses[carouselIndex]} />
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="flex justify-center gap-2 mt-4">
                {recommendedCourses.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setDirection(index > carouselIndex ? 1 : -1);
                      setCarouselIndex(index);
                    }}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === carouselIndex
                        ? 'w-6 bg-blue-600'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  />
                ))}
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return '夜深了';
  if (hour < 9) return '早上好';
  if (hour < 12) return '上午好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  if (hour < 22) return '晚上好';
  return '夜深了';
}
