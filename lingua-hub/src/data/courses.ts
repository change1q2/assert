export type Language = 'english' | 'japanese' | 'korean';

export interface Lesson {
  id: string;
  title: string;
  titleEn: string;
  duration: number; // 分钟
  type: 'vocabulary' | 'grammar' | 'listening' | 'speaking' | 'reading';
  completed?: boolean;
}

export interface Chapter {
  id: string;
  title: string;
  titleEn: string;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  language: Language;
  title: string;
  titleCn: string;
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  totalLessons: number;
  completedLessons: number;
  chapters: Chapter[];
  coverImage?: string;
}

export const courses: Course[] = [
  // 英语课程
  {
    id: 'en-001',
    language: 'english',
    title: 'English Basic Grammar',
    titleCn: '英语基础语法',
    description: '从零开始学习英语基础语法，掌握句型结构',
    level: 'beginner',
    totalLessons: 24,
    completedLessons: 8,
    coverImage: '/covers/en-basic.png',
    chapters: [
      {
        id: 'en-001-ch1',
        title: 'Basic Sentence Structure',
        titleEn: '基本句型结构',
        lessons: [
          { id: 'en-001-ch1-l1', title: '主语 + 动词', titleEn: 'Subject + Verb', duration: 15, type: 'grammar' },
          { id: 'en-001-ch1-l2', title: '主语 + 动词 + 宾语', titleEn: 'Subject + Verb + Object', duration: 20, type: 'grammar' },
          { id: 'en-001-ch1-l3', title: 'be动词用法', titleEn: 'Usage of Be Verb', duration: 18, type: 'grammar' },
        ],
      },
      {
        id: 'en-001-ch2',
        title: 'Present Tense',
        titleEn: '现在时态',
        lessons: [
          { id: 'en-001-ch2-l1', title: '一般现在时', titleEn: 'Simple Present', duration: 22, type: 'grammar' },
          { id: 'en-001-ch2-l2', title: '现在进行时', titleEn: 'Present Continuous', duration: 20, type: 'grammar' },
          { id: 'en-001-ch2-l3', title: '现在完成时', titleEn: 'Present Perfect', duration: 25, type: 'grammar' },
        ],
      },
    ],
  },
  {
    id: 'en-002',
    language: 'english',
    title: 'Daily English Conversation',
    titleCn: '日常英语会话',
    description: '学习日常生活中的实用英语对话',
    level: 'intermediate',
    totalLessons: 30,
    completedLessons: 0,
    coverImage: '/covers/en-conversation.png',
    chapters: [
      {
        id: 'en-002-ch1',
        title: 'Greetings',
        titleEn: '打招呼与寒暄',
        lessons: [
          { id: 'en-002-ch1-l1', title: '正式场合问候', titleEn: 'Formal Greetings', duration: 12, type: 'speaking' },
          { id: 'en-002-ch1-l2', title: '非正式场合问候', titleEn: 'Informal Greetings', duration: 10, type: 'speaking' },
          { id: 'en-002-ch1-l3', title: '告别用语', titleEn: 'Farewell Expressions', duration: 15, type: 'speaking' },
        ],
      },
      {
        id: 'en-002-ch2',
        title: 'At the Restaurant',
        titleEn: '餐厅用语',
        lessons: [
          { id: 'en-002-ch2-l1', title: '点餐对话', titleEn: 'Ordering Food', duration: 18, type: 'listening' },
          { id: 'en-002-ch2-l2', title: '结账付款', titleEn: 'Paying the Bill', duration: 12, type: 'speaking' },
        ],
      },
    ],
  },

  // 日语课程
  {
    id: 'ja-001',
    language: 'japanese',
    title: 'Japanese Hiragana & Katakana',
    titleCn: '日语五十音图',
    description: '学习日语假名字母表，入门日语学习',
    level: 'beginner',
    totalLessons: 20,
    completedLessons: 20,
    coverImage: '/covers/ja-kana.png',
    chapters: [
      {
        id: 'ja-001-ch1',
        title: 'Hiragana',
        titleEn: '平假名',
        lessons: [
          { id: 'ja-001-ch1-l1', title: 'あ行 か行', titleEn: 'a row & ka row', duration: 25, type: 'vocabulary' },
          { id: 'ja-001-ch1-l2', title: 'さ行 た行', titleEn: 'sa row & ta row', duration: 25, type: 'vocabulary' },
          { id: 'ja-001-ch1-l3', title: 'な行 は行', titleEn: 'na row & ha row', duration: 25, type: 'vocabulary' },
        ],
      },
      {
        id: 'ja-001-ch2',
        title: 'Katakana',
        titleEn: '片假名',
        lessons: [
          { id: 'ja-001-ch2-l1', title: 'ア行 カ行', titleEn: 'a row & ka row (katakana)', duration: 25, type: 'vocabulary' },
          { id: 'ja-001-ch2-l2', title: 'サ行 タ行', titleEn: 'sa row & ta row (katakana)', duration: 25, type: 'vocabulary' },
        ],
      },
    ],
  },
  {
    id: 'ja-002',
    language: 'japanese',
    title: 'JLPT N5 Grammar',
    titleCn: 'JLPT N5 语法',
    description: '备考JLPT N5，系统学习基础语法',
    level: 'beginner',
    totalLessons: 35,
    completedLessons: 12,
    coverImage: '/covers/ja-n5.png',
    chapters: [
      {
        id: 'ja-002-ch1',
        title: 'Particles',
        titleEn: '助词',
        lessons: [
          { id: 'ja-002-ch1-l1', title: 'は・が・を', titleEn: 'wa, ga, wo', duration: 30, type: 'grammar' },
          { id: 'ja-002-ch1-l2', title: 'に・で・と', titleEn: 'ni, de, to', duration: 30, type: 'grammar' },
          { id: 'ja-002-ch1-l3', title: 'へ・から・まで', titleEn: 'he, kara, made', duration: 25, type: 'grammar' },
        ],
      },
      {
        id: 'ja-002-ch2',
        title: 'Verb Conjugation',
        titleEn: '动词变形',
        lessons: [
          { id: 'ja-002-ch2-l1', title: '动词分类', titleEn: 'Verb Classification', duration: 20, type: 'grammar' },
          { id: 'ja-002-ch2-l2', title: 'て形', titleEn: 'Te-form', duration: 30, type: 'grammar' },
        ],
      },
    ],
  },

  // 韩语课程
  {
    id: 'ko-001',
    language: 'korean',
    title: 'Korean Hangul',
    titleCn: '韩语字母表',
    description: '学习韩文基础字母和发音规则',
    level: 'beginner',
    totalLessons: 15,
    completedLessons: 15,
    coverImage: '/covers/ko-hangul.png',
    chapters: [
      {
        id: 'ko-001-ch1',
        title: 'Basic Vowels',
        titleEn: '基本元音',
        lessons: [
          { id: 'ko-001-ch1-l1', title: 'ㅏ ㅓ ㅗ ㅜ', titleEn: 'a, eo, o, u', duration: 20, type: 'vocabulary' },
          { id: 'ko-001-ch1-l2', title: 'ㅐ ㅔ ㅚ ㅟ', titleEn: 'ae, e, oe, wi', duration: 20, type: 'vocabulary' },
        ],
      },
      {
        id: 'ko-001-ch2',
        title: 'Basic Consonants',
        titleEn: '基本辅音',
        lessons: [
          { id: 'ko-001-ch2-l1', title: 'ㄱ ㄴ ㄷ ㄹ', titleEn: 'g, n, d, r', duration: 25, type: 'vocabulary' },
          { id: 'ko-001-ch2-l2', title: 'ㅁ ㅂ ㅅ ㅇ', titleEn: 'm, b, s, ng', duration: 25, type: 'vocabulary' },
        ],
      },
    ],
  },
  {
    id: 'ko-002',
    language: 'korean',
    title: 'Korean Basic Conversations',
    titleCn: '韩语基础会话',
    description: '掌握韩语日常交流用语',
    level: 'intermediate',
    totalLessons: 28,
    completedLessons: 5,
    coverImage: '/covers/ko-conversation.png',
    chapters: [
      {
        id: 'ko-002-ch1',
        title: 'Self Introduction',
        titleEn: '自我介绍',
        lessons: [
          { id: 'ko-002-ch1-l1', title: '基本自我介绍', titleEn: 'Basic Self Introduction', duration: 18, type: 'speaking' },
          { id: 'ko-002-ch1-l2', title: '询问他人信息', titleEn: 'Asking About Others', duration: 15, type: 'listening' },
          { id: 'ko-002-ch1-l3', title: '朋友间对话', titleEn: 'Conversation Between Friends', duration: 20, type: 'speaking' },
        ],
      },
      {
        id: 'ko-002-ch2',
        title: 'Shopping',
        titleEn: '购物用语',
        lessons: [
          { id: 'ko-002-ch2-l1', title: '询问价格', titleEn: 'Asking for Price', duration: 15, type: 'speaking' },
          { id: 'ko-002-ch2-l2', title: '试穿与尺寸', titleEn: 'Trying On and Sizes', duration: 18, type: 'speaking' },
        ],
      },
    ],
  },
];
