// call/components/PredictedWords.tsx
import React from "react";

interface Props {
  predictedWords: string[];
  isGenerating: boolean;
  onGenerate: () => void;
}

export const PredictedWords: React.FC<Props> = ({
  predictedWords,
  isGenerating,
  onGenerate,
}) => {
  if (predictedWords.length === 0) return null;

  return (
    <div className="mt-8 w-full max-w-4xl bg-gray-800 p-4 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-3 text-center">出力単語リスト</h2>
      <div className="flex flex-wrap justify-center gap-3">
        {predictedWords.map((word, index) => (
          <span
            key={index}
            className="bg-indigo-600 px-4 py-2 rounded-full text-base font-medium"
          >
            {word}
          </span>
        ))}
      </div>
      <div className="text-center mt-6">
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray^500 text-white font-bold py-2 px-6 rounded-lg transition-all">
          {isGenerating ? "生成中..." : "文章を生成する"}
        </button>
      </div>
    </div>
  );
};
