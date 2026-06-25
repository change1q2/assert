export type AchievementType = 
  | 'streak'
  | 'vocabulary'
  | 'grammar'
  | 'speaking'
  | 'listening'
  | 'milestone'
  | 'special';

export interface Achievement {
  id: string;
  type: AchievementType;
  title: string;
  titleCn: string;
  description: string;
  icon: string;
  unlockedAt?: string; // ISO date string when achieved
  progress?: number;
  target?: number;
}

export const achievements: Achievement[] = [
  {
    id: 'ach-001',
    type: 'special',
    title: '新手启程',
    titleCn: 'Beginner Journey',
    description: '完成你的第一课学习',
    icon: '🚀',
    target: 1,
    progress: 1,
    unlockedAt: '2024-01-15T10:30:00Z',
  },
  {
    id: 'ach-002',
    type: 'vocabulary',
    title: '单词达人',
    titleCn: 'Vocabulary Master',
    description: '累计学习 500 个单词',
    icon: '📚',
    target: 500,
    progress: 387,
  },
  {
    id: 'ach-003',
    type: 'grammar',
    title: '语法专家',
    titleCn: 'Grammar Expert',
    description: '完成 30 个语法课程',
    icon: '📝',
    target: 30,
    progress: 22,
  },
  {
    id: 'ach-004',
    type: 'speaking',
    title: '口语新星',
    titleCn: 'Speaking Star',
    description: '完成 50 次口语练习',
    icon: '🎤',
    target: 50,
    progress: 50,
    unlockedAt: '2024-03-20T15:45:00Z',
  },
  {
    id: 'ach-005',
    type: 'listening',
    title: '听力达人',
    titleCn: 'Listening Pro',
    description: '累计听力练习 100 小时',
    icon: '🎧',
    target: 100,
    progress: 68,
  },
  {
    id: 'ach-006',
    type: 'streak',
    title: '连续7天',
    titleCn: '7 Day Streak',
    description: '连续学习 7 天',
    icon: '🔥',
    target: 7,
    progress: 7,
    unlockedAt: '2024-02-01T09:00:00Z',
  },
  {
    id: 'ach-007',
    type: 'streak',
    title: '连续30天',
    titleCn: '30 Day Streak',
    description: '连续学习 30 天',
    icon: '⭐',
    target: 30,
    progress: 15,
  },
  {
    id: 'ach-008',
    type: 'milestone',
    title: '学习里程',
    titleCn: 'Learning Milestone',
    description: '学习时长累计 100 小时',
    icon: '🏆',
    target: 100,
    progress: 100,
    unlockedAt: '2024-03-10T18:00:00Z',
  },
];
