import { useState, useCallback } from 'react';

interface FlashCardProps {
  word: string;
  translation: string;
  phonetic?: string;
  onKnow?: () => void;
  onDontKnow?: () => void;
}

export default function FlashCard({
  word,
  translation,
  phonetic,
  onKnow,
  onDontKnow,
}: FlashCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleSpeak = useCallback(() => {
    if (isSpeaking) return;
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    speechSynthesis.speak(utterance);
  }, [word, isSpeaking]);

  const handleFlip = () => setIsFlipped((prev) => !prev);

  return (
    <div className="w-72 h-48 perspective-1000">
      <div
        className={`relative w-full h-full cursor-pointer transition-transform duration-500 transform-style-3d ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
        onClick={handleFlip}
      >
        {/* Front - Word */}
        <div className="absolute inset-0 backface-hidden bg-white rounded-xl shadow-md flex flex-col items-center justify-center p-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSpeak();
            }}
            className="absolute top-3 right-3 text-gray-400 hover:text-blue-500 transition-colors"
            disabled={isSpeaking}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          </button>
          <span className="text-3xl font-bold text-gray-800">{word}</span>
          {phonetic && <span className="text-sm text-gray-400 mt-1">{phonetic}</span>}
          <span className="text-xs text-gray-400 mt-4">点击翻转</span>
        </div>

        {/* Back - Translation */}
        <div className="absolute inset-0 backface-hidden bg-blue-50 rounded-xl shadow-md flex flex-col items-center justify-center p-4 rotate-y-180">
          <span className="text-2xl font-semibold text-blue-700">{translation}</span>
          <span className="text-xs text-gray-400 mt-4">点击返回</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mt-4 justify-center">
        <button
          onClick={onDontKnow}
          className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
        >
          不认识
        </button>
        <button
          onClick={onKnow}
          className="px-4 py-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
        >
          认识
        </button>
      </div>

      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
}
