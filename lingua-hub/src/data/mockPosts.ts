export type PostType = 'question' | 'share' | 'discussion' | 'tips';

export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
  likes: number;
}

export interface Post {
  id: string;
  type: PostType;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  language?: 'english' | 'japanese' | 'korean' | 'mixed';
  title: string;
  content: string;
  createdAt: string;
  likes: number;
  comments: Comment[];
  tags?: string[];
  isLiked?: boolean;
}

export const mockPosts: Post[] = [
  {
    id: 'post-001',
    type: 'question',
    authorId: 'user-101',
    authorName: '日语初学者小明',
    language: 'japanese',
    title: '「は」和「が」的区别什么时候用？',
    content: '学习日语助词时总是分不清「は」和「が」的用法。请教各位大神，什么时候该用哪个？\n\n比如：\n- 私は学生です。\n- 私が学生です。\n\n这两个有什么区别呢？',
    createdAt: '2024-03-15T14:30:00Z',
    likes: 23,
    isLiked: false,
    comments: [
      {
        id: 'comment-001',
        authorId: 'user-102',
        authorName: '日语N1上岸',
        content: '简单来说，「は」强调的是后面部分，「が」强调的是前面部分。「私は学生です」强调的是"是学生"，「私が学生です」强调的是"我"是学生（暗示别人不是）。',
        createdAt: '2024-03-15T15:00:00Z',
        likes: 45,
      },
      {
        id: 'comment-002',
        authorId: 'user-103',
        authorName: 'JapaneseLearner',
        content: '还有一个区别就是「は」用于句子的主题，「が」用于句子的主语。当你想介绍自己或者谈论一个主题时用「は」。',
        createdAt: '2024-03-15T16:20:00Z',
        likes: 28,
      },
    ],
    tags: ['日语', '语法', '助词'],
  },
  {
    id: 'post-002',
    type: 'share',
    authorId: 'user-104',
    authorName: '英语达人Kate',
    language: 'english',
    title: '分享我的英语学习方法和资源',
    content: '学习英语已经3年了，从零基础到现在的流利交流，总结了一些方法和大家分享：\n\n📚 词汇：每天背20个单词，用Anki记忆卡\n🎧 听力：每天听BBC Learning English\n📝 语法：看English with Greg系列视频\n💬 口语：iTalki上找语伴练习\n\n坚持最重要！加油💪',
    createdAt: '2024-03-14T10:00:00Z',
    likes: 156,
    isLiked: true,
    comments: [
      {
        id: 'comment-003',
        authorId: 'user-105',
        authorName: '英语小白',
        content: '谢谢分享！想问下Anki是怎么用的？我也想开始背单词',
        createdAt: '2024-03-14T11:30:00Z',
        likes: 12,
      },
    ],
    tags: ['英语', '学习方法', '资源分享'],
  },
  {
    id: 'post-003',
    type: 'discussion',
    authorId: 'user-106',
    authorName: '韩剧迷妹',
    language: 'korean',
    title: '大家觉得学韩语最难的部分是什么？',
    content: '我先说：\n\n我觉得韩语最难的应该是语法顺序！\n\n韩语是主语-宾语-动词/形容词的结构，跟中文完全相反。\n\n比如"我吃饭"要说成"我饭吃"—— 저는 밥을 먹어요\n\n而且动词要放到最后，真的很不习惯 😅\n\n大家觉得呢？',
    createdAt: '2024-03-13T20:45:00Z',
    likes: 89,
    isLiked: false,
    comments: [
      {
        id: 'comment-004',
        authorId: 'user-107',
        authorName: '韩语TOPIK6',
        content: '我觉得是收音！很多收音发音相似但写法不同，比如ㄱ、ㄲ、ㅋ听起来都差不多',
        createdAt: '2024-03-13T21:15:00Z',
        likes: 34,
      },
      {
        id: 'comment-005',
        authorId: 'user-108',
        authorName: '韩语学习中',
        content: '对我来说敬语和平语的使用时机最难... 跟韩国人说话总是很紧张',
        createdAt: '2024-03-13T22:00:00Z',
        likes: 27,
      },
    ],
    tags: ['韩语', '学习困难', '讨论'],
  },
  {
    id: 'post-004',
    type: 'tips',
    authorId: 'user-109',
    authorName: '语言学习达人',
    language: 'mixed',
    title: '多语言学习者的时间分配经验',
    content: '同时学日语、韩语、英语一年多了，很多人问我是怎么安排的：\n\n⏰ 早上通勤：日语听力（30分钟）\n⏰ 午休时：英语单词（20分钟）\n⏰ 晚上：韩语语法（45分钟）\n⏰ 周末：复习+口语练习\n\n关键是：\n1. 不要同一天学太多语言，容易混淆\n2. 用不同场景关联不同语言\n3. 定期复习很重要\n\n希望大家都能坚持学习！🌟',
    createdAt: '2024-03-12T09:30:00Z',
    likes: 234,
    isLiked: true,
    comments: [],
    tags: ['多语言', '时间管理', '学习技巧'],
  },
  {
    id: 'post-005',
    type: 'question',
    authorId: 'user-110',
    authorName: '英语困惑者',
    language: 'english',
    title: '听力总是跟不上 native speaker 的速度怎么办？',
    content: '看美剧的时候英文字幕能看懂，但关掉字幕就完全听不懂了。\n\nNative speaker 说话速度太快，单词连读、弱读完全分辨不出来...\n\n有什么训练方法吗？',
    createdAt: '2024-03-11T18:20:00Z',
    likes: 67,
    isLiked: false,
    comments: [
      {
        id: 'comment-006',
        authorId: 'user-111',
        authorName: 'NativeEnglish',
        content: '建议从慢速英语开始，比如 VOA Learning English。然后慢慢过渡到正常速度。',
        createdAt: '2024-03-11T19:00:00Z',
        likes: 52,
      },
      {
        id: 'comment-007',
        authorId: 'user-112',
        authorName: '英语老师Amy',
        content: '可以试试精听方法：找一段材料，先听3遍看能听懂多少，然后看原文，再听3遍，最后脱稿听。坚持一个月会有明显进步！',
        createdAt: '2024-03-11T19:45:00Z',
        likes: 78,
      },
    ],
    tags: ['英语', '听力', '求助'],
  },
  {
    id: 'post-006',
    type: 'share',
    authorId: 'user-113',
    authorName: '日本語好き',
    language: 'japanese',
    title: 'JLPT N2 备考经验分享',
    content: '刚查到成绩，N2合格啦！给大家分享一下我的备考经验：\n\n📖 教材：\n- 新完全掌握N2系列\n- 考前对策\n- 历年真题\n\n📝 备考时间：4个月\n📱 App：沪江日语、MOJi辞书\n\n💡 建议：\n1. 词汇要日积月累\n2. 语法要理解本质\n3. 真题至少做3遍\n\n有问题可以问我～',
    createdAt: '2024-03-10T12:00:00Z',
    likes: 189,
    isLiked: false,
    comments: [
      {
        id: 'comment-008',
        authorId: 'user-114',
        authorName: 'N3考生',
        content: '恭喜！请问新完全掌握系列难度怎么样？适合N3水平的同学吗？',
        createdAt: '2024-03-10T13:30:00Z',
        likes: 15,
      },
    ],
    tags: ['日语', 'JLPT', 'N2', '备考'],
  },
];
