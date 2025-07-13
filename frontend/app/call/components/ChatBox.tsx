"use client";

import { useEffect, useRef, useState } from "react";

interface ChatBoxProps {
  userName: string;
  chatLog: string[];
  chatInput: string;
  setChatInput: (value: string) => void;
  sendChatMessage: () => void;
  isRecording: boolean;
  toggleRecording: () => void;
}

export function ChatBox({
  userName,
  chatLog,
  chatInput,
  setChatInput,
  sendChatMessage,
  isRecording,
  toggleRecording,
}: ChatBoxProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [lastAnimatedIndex, setLastAnimatedIndex] = useState<number | null>(null);
  const [animationFinished, setAnimationFinished] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    if (chatLog.length > 0) {
      setLastAnimatedIndex(chatLog.length - 1);
      setAnimationFinished(false);
    }
  }, [chatLog]);

  return (
    <div className="bg-gray-800 p-4 rounded-2xl shadow-md h-[480px] flex flex-col">
      <h2 className="text-2xl font-bold mb-3 text-center">チャット</h2>

      {/* メッセージ表示エリア */}
      <div className="flex-1 overflow-y-auto space-y-4 px-2 mb-3">
        {chatLog.map((msg, i) => {
          const [sender, ...textParts] = msg.split(": ");
          const text = textParts.join(": ");
          const isSelf = sender === userName || sender === "You";

          const isAnimated = i === lastAnimatedIndex && !animationFinished;

          return (
            <div key={i} className={`flex flex-col ${isSelf ? "items-end" : "items-start"}`}>
              <span className="text-sm text-gray-400 mb-1">{isSelf ? "あなた" : sender}</span>
<div
  className={`max-w-[70%] px-5 py-3 text-xl rounded-2xl shadow-md break-words transition-all duration-500
    ${isSelf
      ? "bg-blue-500 text-white rounded-br-none"
      : "bg-pink-300 text-black rounded-bl-none"
    }
    ${isAnimated ? "animate-fly-to-chat" : ""}
  `}
  onAnimationEnd={() => setAnimationFinished(true)}
>
  {text}
</div>

            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* 入力エリア */}
      <div className="flex gap-2 mt-2">
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder="メッセージを入力..."
          className="flex-1 bg-gray-700 text-white px-4 py-3 rounded-lg text-lg placeholder-gray-400 outline-none"
        />
        <button
          onClick={sendChatMessage}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold text-lg"
        >
          送信
        </button>
        <button
          onClick={toggleRecording}
          title={isRecording ? "停止" : "音声入力"}
          className={`p-3 rounded-lg text-white transition-colors duration-200 ${
            isRecording
              ? "bg-red-600 hover:bg-red-700 animate-pulse"
              : "bg-blue-600 hover:bg-green-700"
          }`}
          {...isRecording ? (
            // 停止アイコン
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M6 6h12v12H6z"></path></svg>
          ) : (
            // マイクアイコン
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>
          )}>
          </button>
      </div>
    </div>
  );
}
