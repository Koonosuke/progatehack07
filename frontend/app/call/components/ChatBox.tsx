"use client";

import { useEffect, useRef, useState } from "react";

interface ChatBoxProps {
  userName: string;
  chatLog: string[];
  chatInput: string;
  setChatInput: (value: string) => void;
  sendChatMessage: () => void;
}

export function ChatBox({
  userName,
  chatLog,
  chatInput,
  setChatInput,
  sendChatMessage,
}: ChatBoxProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLog]);

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-md h-[480px] flex flex-col">
      <h2 className="text-xl font-semibold mb-2">チャット欄</h2>
      <div className="flex-1 overflow-y-auto space-y-2 mb-2">
        {chatLog.map((msg, i) => (
          <div
            key={i}
            className={`text-sm px-2 py-1 rounded-lg max-w-[80%] break-words ${
              msg.startsWith(userName)
                ? "bg-blue-500 text-white self-end"
                : msg.startsWith("You")
                ? "bg-green-600 text-white self-end"
                : "bg-gray-700 text-white self-start"
            }`}
          >
            {msg}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2 mt-2">
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          className="flex-1 bg-gray-700 px-3 py-2 rounded"
          placeholder="メッセージを入力..."
        />
        <button onClick={sendChatMessage} className="bg-blue-600 px-4 py-2 rounded">
          送信
        </button>
      </div>
    </div>
  );
}
