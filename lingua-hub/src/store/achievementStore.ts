import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  condition: (stats: {
    totalTime: number;
    totalWords: number;
    streakDays: number;
    level: number;
  }) => boolean;
}

interface AchievementState {
  achievements: Achievement[];
  userAchievements: string[]; // 已解锁的成就ID数组
  unlockAchievement: (achievementId: string) => void;
  checkAchievements: (stats: {
    totalTime: number;
    totalWords: number;
    streakDays: number;
    level: number;
  }) => void;
}

const defaultAchievements: Achievement[] = [
  {
    id: 'first_lesson',
    title: '初学者',
    description: '完成第一节课',
    icon: '🎯',
    condition: (stats) => stats.totalWords >= 10,
  },
  {
    id: 'hour_learner',
    title: '学习一小时',
    description: '累计学习超过1小时',
    icon: '⏰',
    condition: (stats) => stats.totalTime >= 3600,
  },
  {
    id: 'week_streak',
    title: '坚持一周',
    description: '连续学习7天',
    icon: '🔥',
    condition: (stats) => stats.streakDays >= 7,
  },
  {
    id: 'level_5',
    title: '等级5',
    description: '达到5级',
    icon: '⭐',
    condition: (stats) => stats.level >= 5,
  },
  {
    id: 'word_master',
    title: '单词大师',
    description: '掌握100个单词',
    icon: '📚',
    condition: (stats) => stats.totalWords >= 100,
  },
];

export const useAchievementStore = create<AchievementState>()(
  persist(
    (set, get) => ({
      achievements: defaultAchievements,
      userAchievements: [],

      unlockAchievement: (achievementId: string) => {
        set((state) => {
          if (state.userAchievements.includes(achievementId)) {
            return state;
          }
          return {
            userAchievements: [...state.userAchievements, achievementId],
          };
        });
      },

      checkAchievements: (stats) => {
        const { achievements, userAchievements, unlockAchievement } = get();

        achievements.forEach((achievement) => {
          if (!userAchievements.includes(achievement.id) && achievement.condition(stats)) {
            unlockAchievement(achievement.id);
          }
        });
      },
    }),
    {
      name: 'achievement-storage',
    }
  )
);
