import { useState, useRef, useCallback } from 'react';

interface SpeakingRecorderProps {
  text?: string;
  onRecordingComplete?: (blob: Blob) => void;
}

export default function SpeakingRecorder({
  text,
  onRecordingComplete,
}: SpeakingRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        onRecordingComplete?.(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('录音失败:', err);
    }
  }, [onRecordingComplete]);

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const playRecording = () => {
    if (audioUrl && audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handlePlayEnd = () => {
    setIsPlaying(false);
  };

  const speakText = () => {
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    speechSynthesis.speak(utterance);
  };

  return (
    <div className="w-full max-w-sm bg-white rounded-xl shadow-sm p-5">
      {text && (
        <div className="mb-4">
          <p className="text-gray-700 text-sm mb-2">朗读内容:</p>
          <p className="text-lg font-medium text-gray-800">{text}</p>
          <button
            onClick={speakText}
            className="mt-2 text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
            听发音
          </button>
        </div>
      )}

      <div className="flex items-center justify-center gap-4">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600 animate-pulse'
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {isRecording ? (
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="8" />
            </svg>
          )}
        </button>

        {audioUrl && !isRecording && (
          <button
            onClick={playRecording}
            disabled={isPlaying}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isPlaying
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        )}
      </div>

      <p className="text-center text-sm text-gray-500 mt-3">
        {isRecording ? '录音中...' : audioUrl ? '点击播放录音' : '点击开始录音'}
      </p>

      <audio ref={audioRef} src={audioUrl || undefined} onEnded={handlePlayEnd} />
    </div>
  );
}
