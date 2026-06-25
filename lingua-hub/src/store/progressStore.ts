import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Progress {
  courseId: string;
  lessonId: string;
  completed: boolean;
  completedAt?: string;
  timeSpent: number; // 秒
}

export interface Stats {
  totalTime: number; // 总学习时间（秒）
  totalWords: number; // 掌握单词数
  streakDays: number; // 连续学习天数
  level: number; // 当前等级
}

interface ProgressState {
  progress: Progress[];
  stats: Stats;
  addProgress: (progress: Progress) => void;
  getProgressByCourse: (courseId: string) => Progress[];
  calculateStats: () => void;
}

const calculateLevel = (totalTime: number): number => {
  // 每积累3600秒升一级
  return Math.floor(totalTime / 3600) + 1;
};

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      progress: [],
      stats: {
        totalTime: 0,
        totalWords: 0,
        streakDays: 1,
        level: 1,
      },

      addProgress: (newProgress: Progress) => {
        set((state) => {
          const existingIndex = state.progress.findIndex(
            (p) => p.courseId === newProgress.courseId && p.lessonId === newProgress.lessonId
          );

          let updatedProgress: Progress[];
          if (existingIndex >= 0) {
            updatedProgress = [...state.progress];
            updatedProgress[existingIndex] = newProgress;
          } else {
            updatedProgress = [...state.progress, newProgress];
          }

          const totalTime = updatedProgress.reduce((sum, p) => sum + p.timeSpent, 0);
          const completedLessons = updatedProgress.filter((p) => p.completed).length;

          return {
            progress: updatedProgress,
            stats: {
              ...state.stats,
              totalTime,
              totalWords: completedLessons * 10, // 假设每课10个单词
              level: calculateLevel(totalTime),
            },
          };
        });
      },

      getProgressByCourse: (courseId: string) => {
        return get().progress.filter((p) => p.courseId === courseId);
      },

      calculateStats: () => {
        const { progress } = get();
        const totalTime = progress.reduce((sum, p) => sum + p.timeSpent, 0);
        const completedLessons = progress.filter((p) => p.completed).length;

        set({
          stats: {
            totalTime,
            totalWords: completedLessons * 10,
            streakDays: 1,
            level: calculateLevel(totalTime),
          },
        });
      },
    }),
    {
      name: 'progress-storage',
    }
  )
);
