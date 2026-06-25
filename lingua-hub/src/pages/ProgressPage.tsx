import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { StatCard } from '@/components/progress/StatCard';
import { RadarChart } from '@/components/progress/RadarChart';
import { CalendarHeatmap } from '@/components/progress/CalendarHeatmap';
import { useProgressStore } from '@/store/progressStore';
import { useAchievementStore } from '@/store/achievementStore';
import { achievements } from '@/data/achievements';
import { Clock, BookOpen, Flame, Crown, Trophy, ArrowRight } from 'lucide-react';

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}小时${minutes}分钟`;
  }
  return `${minutes}分钟`;
}

export default function ProgressPage() {
  const navigate = useNavigate();
  const { stats } = useProgressStore();
  const { userAchievements } = useAchievementStore();

  const radarData = useMemo(() => ({
    listening: Math.min(stats.totalWords * 0.4 + stats.streakDays * 2, 100),
    speaking: Math.min(stats.totalWords * 0.3 + stats.level * 5, 100),
    reading: Math.min(stats.totalWords * 0.5 + stats.streakDays * 3, 100),
    writing: Math.min(stats.totalWords * 0.2 + stats.level * 8, 100),
  }), [stats]);

  const calendarData = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const daysInMonth = new Date(year, month, 0).getDate();

    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isPast = day < today.getDate();
      const duration = isPast ? Math.floor(Math.random() * 120) : 0;
      return { date, duration };
    });
  }, []);

  const recentAchievements = useMemo(() => {
    return achievements
      .filter((a) => userAchievements.includes(a.id) && a.unlockedAt)
      .sort((a, b) => {
        const dateA = a.unlockedAt ? new Date(a.unlockedAt).getTime() : 0;
        const dateB = b.unlockedAt ? new Date(b.unlockedAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 3);
  }, [userAchievements]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* 页面标题 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              学习进度
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              追踪你的学习旅程
            </p>
          </div>
        </motion.div>

        {/* 学习数据概览 */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <motion.div variants={itemVariants}>
            <StatCard
              icon={Clock}
              label="总学习时长"
              value={formatTime(stats.totalTime)}
              gradient="blue"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard
              icon={BookOpen}
              label="已学单词数"
              value={stats.totalWords}
              gradient="purple"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard
              icon={Flame}
              label="连续学习天数"
              value={`${stats.streakDays}天`}
              gradient="orange"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard
              icon={Crown}
              label="当前等级"
              value={`Lv.${stats.level}`}
              gradient="green"
            />
          </motion.div>
        </motion.div>

        {/* 能力雷达图 & 学习日历 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 能力雷达图 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  能力雷达图
                </h2>
              </div>
              <div className="flex justify-center">
                <RadarChart
                  listening={radarData.listening}
                  speaking={radarData.speaking}
                  reading={radarData.reading}
                  writing={radarData.writing}
                  className="w-full max-w-xs"
                />
              </div>
            </Card>
          </motion.div>

          {/* 学习日历热力图 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="p-6">
              <CalendarHeatmap data={calendarData} />
            </Card>
          </motion.div>
        </div>

        {/* 近期成就 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  近期成就
                </h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/achievements')}
                className="flex items-center gap-1"
              >
                查看全部
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

            {recentAchievements.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {recentAchievements.map((achievement, index) => (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="flex items-center gap-3 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-800 rounded-lg border border-amber-100 dark:border-amber-900/30"
                  >
                    <div className="text-3xl">{achievement.icon}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">
                        {achievement.titleCn}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {achievement.description}
                      </p>
                      {achievement.unlockedAt && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                          {new Date(achievement.unlockedAt).toLocaleDateString('zh-CN')}
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">🏆</div>
                <p className="text-gray-500 dark:text-gray-400">
                  还没有解锁任何成就，继续加油！
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/courses')}
                  className="mt-4"
                >
                  开始学习
                </Button>
              </div>
            )}
          </Card>
        </motion.div>

        {/* 学习趋势 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-5 h-5 text-orange-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                学习趋势
              </h2>
            </div>
            <div className="h-40 flex items-end justify-around gap-2">
              {[65, 45, 80, 55, 90, 70, 85].map((height, index) => (
                <motion.div
                  key={index}
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ delay: 0.6 + index * 0.05, duration: 0.5 }}
                  className="w-full bg-gradient-to-t from-indigo-500 to-indigo-400 rounded-t-md"
                />
              ))}
            </div>
            <div className="flex justify-around mt-2 text-xs text-gray-500">
              <span>周一</span>
              <span>周二</span>
              <span>周三</span>
              <span>周四</span>
              <span>周五</span>
              <span>周六</span>
              <span>周日</span>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
