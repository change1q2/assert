import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Avatar } from '@/components/common/Avatar';
import { ProgressBar } from '@/components/common/ProgressBar';
import { StatCard } from '@/components/progress/StatCard';
import { useAuthStore } from '@/store/authStore';
import { useProgressStore } from '@/store/progressStore';
import { useAchievementStore } from '@/store/achievementStore';
import { courses } from '@/data/courses';
import {
  Clock,
  BookOpen,
  Trophy,
  Settings,
  LogOut,
  Edit2,
  Globe,
  X,
  Check,
  ChevronRight,
} from 'lucide-react';

type Language = 'english' | 'japanese' | 'korean';

const languageInfo: Record<Language, { name: string; flag: string; color: string }> = {
  english: { name: '英语', flag: '🇬🇧', color: 'bg-blue-500' },
  japanese: { name: '日语', flag: '🇯🇵', color: 'bg-pink-500' },
  korean: { name: '韩语', flag: '🇰🇷', color: 'bg-purple-500' },
};

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}小时${minutes}分钟`;
  }
  return `${minutes}分钟`;
}

interface LearningHistoryItem {
  id: string;
  courseId: string;
  courseName: string;
  lessonName: string;
  completedAt: string;
  timeSpent: number;
  language: Language;
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuthStore();
  const { stats, progress } = useProgressStore();
  const { userAchievements } = useAchievementStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('english');
  const [showSettings, setShowSettings] = useState(false);

  // 计算已完成课程数
  const completedCourses = useMemo(() => {
    return courses.filter((c) => c.completedLessons >= c.totalLessons).length;
  }, []);

  // 生成学习历史
  const learningHistory = useMemo<LearningHistoryItem[]>(() => {
    return progress
      .filter((p) => p.completed && p.completedAt)
      .map((p) => {
        const course = courses.find((c) => c.id === p.courseId);
        return {
          id: p.lessonId,
          courseId: p.courseId,
          courseName: course?.titleCn || '未知课程',
          lessonName: `课时 ${p.lessonId.slice(-1)}`,
          completedAt: p.completedAt || '',
          timeSpent: p.timeSpent,
          language: course?.language || 'english',
        };
      })
      .slice(0, 10);
  }, [progress]);

  const handleSaveName = () => {
    if (editName.trim() && user) {
      updateUser({ ...user, name: editName.trim() });
    }
    setIsEditing(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleLanguageChange = (lang: Language) => {
    setSelectedLanguage(lang);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            请先登录
          </h2>
          <Button onClick={() => navigate('/login')}>前往登录</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* 用户信息卡片 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-6">
            <div className="flex items-center gap-6">
              <Avatar
                src={user.avatar}
                name={user.name}
                size="lg"
                className="w-20 h-20 text-2xl ring-4 ring-blue-100 dark:ring-blue-900"
              />
              <div className="flex-1">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveName}
                      className="p-2 rounded-lg bg-green-500 text-white hover:bg-green-600"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditName(user.name);
                      }}
                      className="p-2 rounded-lg bg-gray-500 text-white hover:bg-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {user.name}
                    </h1>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <p className="text-gray-500 dark:text-gray-400 mt-1">{user.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full text-sm font-medium">
                    Lv.{stats.level}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {stats.level <= 5 ? '初学者' : stats.level <= 10 ? '进阶学习者' : '精通'}
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                设置
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* 学习数据统计 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <StatCard
            icon={Clock}
            label="总学习时长"
            value={formatTime(stats.totalTime)}
            gradient="blue"
          />
          <StatCard
            icon={BookOpen}
            label="完成课程数"
            value={completedCourses}
            gradient="purple"
          />
          <StatCard
            icon={Trophy}
            label="获得成就"
            value={userAchievements.length}
            gradient="orange"
          />
        </motion.div>

        {/* 学习历史 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 dark:text-white">学习历史</h2>
              <Button variant="outline" size="sm" onClick={() => navigate('/achievements')}>
                查看成就
              </Button>
            </div>
            {learningHistory.length > 0 ? (
              <div className="space-y-3">
                {learningHistory.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div
                      className={`w-10 h-10 rounded-lg ${languageInfo[item.language]?.color || 'bg-blue-500'} flex items-center justify-center text-white`}
                    >
                      {languageInfo[item.language]?.flag || '🌐'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {item.courseName}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {item.lessonName} · {formatTime(item.timeSpent)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(item.completedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>暂无学习记录</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => navigate('/courses')}
                >
                  开始学习
                </Button>
              </div>
            )}
          </Card>
        </motion.div>

        {/* 账户设置 */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => setShowSettings(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    账户设置
                  </h3>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      昵称
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Globe className="w-4 h-4 inline mr-1" />
                      语言偏好
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {(Object.keys(languageInfo) as Language[]).map((lang) => (
                        <button
                          key={lang}
                          onClick={() => handleLanguageChange(lang)}
                          className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                            selectedLanguage === lang
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                          }`}
                        >
                          <span className="text-2xl">{languageInfo[lang].flag}</span>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {languageInfo[lang].name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      variant="outline"
                      className="w-full flex items-center justify-center gap-2 text-red-500 hover:text-red-600 hover:border-red-500"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-4 h-4" />
                      退出登录
                    </Button>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowSettings(false)}
                  >
                    取消
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => {
                      handleSaveName();
                      setShowSettings(false);
                    }}
                  >
                    保存设置
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
