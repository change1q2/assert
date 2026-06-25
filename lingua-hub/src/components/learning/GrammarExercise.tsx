import { useState } from 'react';

interface Option {
  id: string;
  text: string;
}

interface GrammarExerciseProps {
  question: string;
  options: Option[];
  correctId: string;
  explanation: string;
  onComplete?: (correct: boolean) => void;
}

export default function GrammarExercise({
  question,
  options,
  correctId,
  explanation,
  onComplete,
}: GrammarExerciseProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);

  const handleSelect = (id: string) => {
    if (isAnswered) return;
    setSelectedId(id);
    setIsAnswered(true);
    onComplete?.(id === correctId);
  };

  const getOptionStyle = (id: string) => {
    if (!isAnswered) {
      return 'bg-white border-gray-200 hover:border-blue-400 hover:bg-blue-50';
    }
    if (id === correctId) {
      return 'bg-green-50 border-green-500 text-green-700';
    }
    if (id === selectedId && id !== correctId) {
      return 'bg-red-50 border-red-500 text-red-700';
    }
    return 'bg-gray-50 border-gray-200 opacity-60';
  };

  return (
    <div className="w-full max-w-md bg-white rounded-xl shadow-sm p-5">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{question}</h3>

      <div className="space-y-2">
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => handleSelect(option.id)}
            disabled={isAnswered}
            className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${getOptionStyle(option.id)}`}
          >
            <span className="font-medium">{option.id}.</span> {option.text}
          </button>
        ))}
      </div>

      {isAnswered && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            {selectedId === correctId ? (
              <span className="text-green-600 font-semibold">✓ 回答正确</span>
            ) : (
              <span className="text-red-600 font-semibold">✗ 回答错误</span>
            )}
          </div>
          <p className="text-sm text-gray-600">{explanation}</p>
        </div>
      )}
    </div>
  );
}
