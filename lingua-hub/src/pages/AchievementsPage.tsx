import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { BadgeGrid } from '@/components/achievement/BadgeGrid';
import { useAchievementStore } from '@/store/achievementStore';
import { achievements, Achievement } from '@/data/achievements';
import { Trophy, X, Sparkles, Lock, CheckCircle } from 'lucide-react';

export default function AchievementsPage() {
  const { userAchievements } = useAchievementStore();
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

  // 为每个成就添加 unlockedAt 状态
  const achievementsWithStatus = useMemo(() => {
    return achievements.map((ach) => ({
      ...ach,
      unlockedAt: userAchievements.includes(ach.id) ? '2024-01-01T00:00:00Z' : undefined,
    }));
  }, [userAchievements]);

  const unlockedCount = achievementsWithStatus.filter((a) => a.unlockedAt).length;
  const totalCount = achievementsWithStatus.length;

  const handleAchievementClick = (achievement: Achievement) => {
    setSelectedAchievement(achievement);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* 页面标题 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 rounded-full mb-4">
            <Trophy className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
              成就中心
            </span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            成就徽章墙
          </h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            完成学习任务，解锁专属成就徽章，展示你的学习历程
          </p>
        </motion.div>

        {/* 成就统计 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl text-white">
                  <Trophy className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    已解锁成就
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {unlockedCount} / {totalCount}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    解锁进度
                  </p>
                  <p className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                    {Math.round((unlockedCount / totalCount) * 100)}%
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(unlockedCount / totalCount) * 100}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* 徽章墙 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <BadgeGrid
            achievements={achievementsWithStatus}
            className="cursor-pointer"
            onAchievementClick={handleAchievementClick}
          />
        </motion.div>

        {/* 成就详情弹窗 */}
        <AnimatePresence>
          {selectedAchievement && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedAchievement(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    成就详情
                  </h3>
                  <button
                    onClick={() => setSelectedAchievement(null)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex flex-col items-center text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    className={`w-24 h-24 rounded-full flex items-center justify-center text-5xl mb-4 ${
                      selectedAchievement.unlockedAt
                        ? 'bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30'
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}
                  >
                    {selectedAchievement.unlockedAt ? (
                      <Sparkles className="w-12 h-12 text-amber-500" />
                    ) : (
                      <Lock className="w-12 h-12 text-gray-400" />
                    )}
                  </motion.div>

                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                    {selectedAchievement.title}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    {selectedAchievement.titleCn}
                  </p>

                  <div className="w-full p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl mb-4">
                    <p className="text-gray-700 dark:text-gray-300">
                      {selectedAchievement.description}
                    </p>
                  </div>

                  {selectedAchievement.unlockedAt ? (
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">
                        已解锁 · {new Date(selectedAchievement.unlockedAt).toLocaleDateString()}
                      </span>
                    </div>
                  ) : (
                    <div className="w-full">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-500 dark:text-gray-400">进度</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {selectedAchievement.progress} / {selectedAchievement.target}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{
                            width: `${Math.min(
                              ((selectedAchievement.progress || 0) /
                                (selectedAchievement.target || 100)) *
                                100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex gap-3">
                  <Button
                    className="flex-1"
                    onClick={() => setSelectedAchievement(null)}
                  >
                    关闭
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
