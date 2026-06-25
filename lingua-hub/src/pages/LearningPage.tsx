import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProgressStore, Progress } from '@/store/progressStore';
import FlashCard from '@/components/learning/FlashCard';
import GrammarExercise from '@/components/learning/GrammarExercise';
import SpeakingRecorder from '@/components/learning/SpeakingRecorder';
import AudioPlayer from '@/components/learning/AudioPlayer';
import { ProgressBar } from '@/components/common/ProgressBar';

type ModuleType = 'vocabulary' | 'grammar' | 'speaking' | 'listening';

interface LearningPageProps {
  courseId?: string;
  lessonId?: string;
}

interface VocabularyItem {
  word: string;
  translation: string;
  phonetic?: string;
}

interface GrammarItem {
  question: string;
  options: { id: string; text: string }[];
  correctId: string;
  explanation: string;
}

interface SpeakingItem {
  text: string;
}

interface ListeningItem {
  src: string;
  title: string;
}

const mockVocabularyData: VocabularyItem[] = [
  { word: 'Hello', translation: '你好', phonetic: '/həˈloʊ/' },
  { word: 'World', translation: '世界', phonetic: '/wɜːrld/' },
  { word: 'Learn', translation: '学习', phonetic: '/lɜːrn/' },
  { word: 'English', translation: '英语', phonetic: '/ˈɪŋɡlɪʃ/' },
  { word: 'Practice', translation: '练习', phonetic: '/ˈpræktɪs/' },
];

const mockGrammarData: GrammarItem[] = [
  {
    question: '请选择正确的冠词： ___ apple a day keeps the doctor away.',
    options: [
      { id: 'A', text: 'An' },
      { id: 'B', text: 'A' },
      { id: 'C', text: 'The' },
      { id: 'D', text: '不填' },
    ],
    correctId: 'A',
    explanation: '"An" 用于以元音音素开头的单词前。apple 以元音音素 /æ/ 开头，所以用 "An"。',
  },
  {
    question: '请选择正确的时态：She ___ to school every day.',
    options: [
      { id: 'A', text: 'go' },
      { id: 'B', text: 'goes' },
      { id: 'C', text: 'going' },
      { id: 'D', text: 'went' },
    ],
    correctId: 'B',
    explanation: '一般现在时中，当主语是第三人称单数时，动词需要加 s 或 es。She 是第三人称单数，所以用 "goes"。',
  },
];

const mockSpeakingData: SpeakingItem[] = [
  { text: 'The quick brown fox jumps over the lazy dog.' },
  { text: 'She sells seashells by the seashore.' },
  { text: 'How much wood would a woodchuck chuck?' },
];

const mockListeningData: ListeningItem[] = [
  { src: '', title: '基础对话练习 1' },
  { src: '', title: '基础对话练习 2' },
  { src: '', title: '基础对话练习 3' },
];

const moduleLabels: Record<ModuleType, string> = {
  vocabulary: '单词记忆',
  grammar: '语法练习',
  speaking: '口语跟读',
  listening: '听力训练',
};

export default function LearningPage({ courseId, lessonId }: LearningPageProps) {
  const [activeModule, setActiveModule] = useState<ModuleType>('vocabulary');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [knownWords, setKnownWords] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [completedModules, setCompletedModules] = useState<Set<ModuleType>>(new Set());
  const [isLessonComplete, setIsLessonComplete] = useState(false);
  const [startTime] = useState(Date.now());

  const { addProgress } = useProgressStore();

  const getTotalItems = (module: ModuleType): number => {
    switch (module) {
      case 'vocabulary':
        return mockVocabularyData.length;
      case 'grammar':
        return mockGrammarData.length;
      case 'speaking':
        return mockSpeakingData.length;
      case 'listening':
        return mockListeningData.length;
      default:
        return 0;
    }
  };

  const totalItems = getTotalItems(activeModule);

  const handleVocabularyKnow = useCallback(() => {
    setKnownWords((prev) => prev + 1);
    if (currentIndex < totalItems - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCompletedModules((prev) => new Set(prev).add('vocabulary'));
    }
  }, [currentIndex, totalItems]);

  const handleVocabularyDontKnow = useCallback(() => {
    if (currentIndex < totalItems - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCompletedModules((prev) => new Set(prev).add('vocabulary'));
    }
  }, [currentIndex, totalItems]);

  const handleGrammarComplete = useCallback(
    (correct: boolean) => {
      if (correct) {
        setCorrectAnswers((prev) => prev + 1);
      }
      if (currentIndex < totalItems - 1) {
        setTimeout(() => setCurrentIndex((prev) => prev + 1), 1500);
      } else {
        setCompletedModules((prev) => new Set(prev).add('grammar'));
      }
    },
    [currentIndex, totalItems]
  );

  const handleSpeakingComplete = useCallback(() => {
    if (currentIndex < totalItems - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCompletedModules((prev) => new Set(prev).add('speaking'));
    }
  }, [currentIndex, totalItems]);

  const handleListeningComplete = useCallback(() => {
    if (currentIndex < totalItems - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCompletedModules((prev) => new Set(prev).add('listening'));
    }
  }, [currentIndex, totalItems]);

  useEffect(() => {
    const allCompleted = ['vocabulary', 'grammar', 'speaking', 'listening'].every(
      (mod) => completedModules.has(mod as ModuleType)
    );
    setIsLessonComplete(allCompleted);
  }, [completedModules]);

  const handleComplete = useCallback(() => {
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    const progress: Progress = {
      courseId,
      lessonId,
      completed: true,
      completedAt: new Date().toISOString(),
      timeSpent,
    };
    addProgress(progress);
    alert('恭喜完成本课学习！');
  }, [courseId, lessonId, startTime, addProgress]);

  const handleModuleChange = (module: ModuleType) => {
    setActiveModule(module);
    setCurrentIndex(0);
  };

  const getProgress = (): number => {
    if (completedModules.size === 4) return 100;
    const moduleProgress: Record<ModuleType, number> = {
      vocabulary: activeModule === 'vocabulary' ? ((currentIndex + 1) / totalItems) * 100 : 0,
      grammar: activeModule === 'grammar' ? ((currentIndex + 1) / totalItems) * 100 : 0,
      speaking: activeModule === 'speaking' ? ((currentIndex + 1) / totalItems) * 100 : 0,
      listening: activeModule === 'listening' ? ((currentIndex + 1) / totalItems) * 100 : 0,
    };

    let total = 0;
    if (completedModules.has('vocabulary')) total += 25;
    else if (activeModule === 'vocabulary') total += moduleProgress.vocabulary * 0.25;

    if (completedModules.has('grammar')) total += 25;
    else if (activeModule === 'grammar') total += moduleProgress.grammar * 0.25;

    if (completedModules.has('speaking')) total += 25;
    else if (activeModule === 'speaking') total += moduleProgress.speaking * 0.25;

    if (completedModules.has('listening')) total += 25;
    else if (activeModule === 'listening') total += moduleProgress.listening * 0.25;

    return Math.round(total);
  };

  const renderModuleContent = () => {
    switch (activeModule) {
      case 'vocabulary':
        return (
          <div className="flex flex-col items-center">
            <FlashCard
              word={mockVocabularyData[currentIndex].word}
              translation={mockVocabularyData[currentIndex].translation}
              phonetic={mockVocabularyData[currentIndex].phonetic}
              onKnow={handleVocabularyKnow}
              onDontKnow={handleVocabularyDontKnow}
            />
            <p className="text-gray-500 mt-4 text-sm">
              进度: {currentIndex + 1} / {totalItems} | 已掌握: {knownWords}
            </p>
          </div>
        );

      case 'grammar':
        return (
          <div className="flex flex-col items-center">
            <GrammarExercise
              key={currentIndex}
              question={mockGrammarData[currentIndex].question}
              options={mockGrammarData[currentIndex].options}
              correctId={mockGrammarData[currentIndex].correctId}
              explanation={mockGrammarData[currentIndex].explanation}
              onComplete={handleGrammarComplete}
            />
            <p className="text-gray-500 mt-4 text-sm">
              进度: {currentIndex + 1} / {totalItems} | 正确: {correctAnswers}
            </p>
          </div>
        );

      case 'speaking':
        return (
          <div className="flex flex-col items-center">
            <SpeakingRecorder
              text={mockSpeakingData[currentIndex].text}
              onRecordingComplete={() => {
                setTimeout(handleSpeakingComplete, 500);
              }}
            />
            <p className="text-gray-500 mt-4 text-sm">
              进度: {currentIndex + 1} / {totalItems}
            </p>
          </div>
        );

      case 'listening':
        return (
          <div className="flex flex-col items-center gap-6">
            <AudioPlayer
              src={mockListeningData[currentIndex].src}
              title={mockListeningData[currentIndex].title}
            />
            <button
              onClick={handleListeningComplete}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              完成听力练习
            </button>
            <p className="text-gray-500 text-sm">
              进度: {currentIndex + 1} / {totalItems}
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden"
        >
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">学习模块</h1>

            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span>学习进度</span>
                <span>{getProgress()}%</span>
              </div>
              <ProgressBar value={getProgress()} />
            </div>

            <div className="flex flex-wrap gap-2">
              {(['vocabulary', 'grammar', 'speaking', 'listening'] as ModuleType[]).map((module) => (
                <button
                  key={module}
                  onClick={() => handleModuleChange(module)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeModule === module
                      ? 'bg-blue-600 text-white'
                      : completedModules.has(module)
                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  {completedModules.has(module) && (
                    <span className="mr-1">✓</span>
                  )}
                  {moduleLabels[module]}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6 min-h-[400px] flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeModule}-${currentIndex}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {renderModuleContent()}
              </motion.div>
            </AnimatePresence>
          </div>

          {isLessonComplete && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 border-t border-gray-200 dark:border-gray-700 bg-green-50 dark:bg-green-900/20"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🎉</span>
                  <span className="text-green-700 dark:text-green-400 font-semibold">
                    恭喜完成所有学习模块！
                  </span>
                </div>
                <button
                  onClick={handleComplete}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  完成学习
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
