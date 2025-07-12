"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useMediaPipe } from "./hooks/useMediaPipe";
import { useWebRTC } from "./hooks/useWebRTC";
import { useChatSocket } from "./hooks/useChatSocket";
import { ChatBox } from "./components/ChatBox";
import { UserList } from "./components/UserList";

export default function CallPage() {
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [started, setStarted] = useState(false);
  const [users, setUsers] = useState<string[]>([]);
  const [isCollecting, setIsCollecting] = useState(false);
  const [roomId, setRoomId] = useState("default");
  const [userName, setUserName] = useState("");
  const [predictedWords, setPredictedWords] = useState<string[]>([]);
  const [llmResponse, setLlmResponse] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatLog, setChatLog] = useState<string[]>([]);
  const [chatInput, setChatInput] = useState("");

  // クエリパラメータから roomId と userName を取得
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get("room") || "default";
    const user = params.get("user") || `User${Math.floor(Math.random() * 1000)}`;
    setRoomId(room);
    setUserName(user);
  }, []);

  // WebSocket チャット接続
  const { sendMessage } = useChatSocket({
    roomId,
    userName,
    onMessage: (msg) => setChatLog((prev) => [...prev, msg]),
  });

  // MediaPipe 推論処理
  const { startInference } = useMediaPipe({
    videoRef,
    canvasRef,
    setIsCollecting,
    onPredict: (newWord: string) => {
      setPredictedWords((prev) => Array.from(new Set([...prev, newWord])));
    },
  });

  // WebRTC 接続処理
  const { start, leave } = useWebRTC({
    videoRef,
    remoteVideoRef,
    userName,
    roomId,
    setUsers,
  });

  // チャット送信
  const sendChatMessage = () => {
    if (!chatInput.trim()) return;
    sendMessage(chatInput);
    setChatLog((prev) => [...prev, `You: ${chatInput}`]);
    setChatInput("");
  };

  // LLM 文章生成
  const handleGenerateText = async () => {
    if (predictedWords.length === 0) {
      alert("認識された単語がありません");
      return;
    }
    setIsGenerating(true);
    setLlmResponse("");
    try {
      const res = await fetch("/web/api/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words: predictedWords, chatHistory: chatLog }),
      });
      if (!res.ok) throw new Error("API応答エラー");
      const data = await res.json();
      setLlmResponse(data.generatedText);
      sendMessage(`AI解説: ${data.generatedText}`);
      setChatLog((prev) => [...prev, `AI解説: ${data.generatedText}`]);
      setPredictedWords([]);
    } catch (err) {
      console.error("生成失敗:", err);
      setLlmResponse("エラー: 文章を生成できませんでした");
    } finally {
      setIsGenerating(false);
    }
  };

return (
  <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex flex-col items-center py-8 px-4">
    <h1 className="text-3xl font-bold mb-6">WebRTC 手話認識通話</h1>

    {/* メインエリア */}
    <div className="flex w-full max-w-6xl h-[85vh]">
      {/* 左: 映像 */}
      <div className="flex flex-col gap-4 w-1/2 h-full">
        <div className="relative flex-1 rounded-2xl shadow-lg bg-gray-800 border border-gray-700 overflow-hidden">
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-contain" />
          <canvas
            ref={canvasRef}
            width="550"
            height="500"
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
          />
        </div>
        <div className="flex-1 rounded-2xl shadow-lg bg-black border border-gray-700 overflow-hidden">
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-contain" />
        </div>
      </div>

      {/* 右: チャット + 操作 */}
      <div className="flex flex-col w-1/2 px-4 h-full">
        <div className="flex-1 min-h-[320px] max-h-[500px] mb-4 overflow-y-auto">
          <ChatBox
            userName={userName}
            chatLog={chatLog}
            chatInput={chatInput}
            setChatInput={setChatInput}
            sendChatMessage={sendChatMessage}
          />
        </div>

        {/* ボタン + ユーザー */}
        <div className="space-y-4 pb-2">
          <div className="flex gap-4 justify-center">
            {!started ? (
              <button
                onClick={() => {
                  setStarted(true);
                  start();
                }}
                className="bg-blue-600 px-6 py-3 rounded-lg text-lg hover:bg-blue-700"
              >
                通話を開始する
              </button>
            ) : (
              <>
                <button
                  onClick={startInference}
                  disabled={isCollecting}
                  className="bg-green-600 px-6 py-3 rounded-lg text-lg hover:bg-green-700"
                >
                  {isCollecting ? "認識中..." : "アクションを認識"}
                </button>
                <button
                  onClick={() => {
                    leave();
                    router.push("/users");
                  }}
                  className="bg-red-600 px-6 py-3 rounded-lg text-lg hover:bg-red-700"
                >
                  通話を終了する
                </button>
              </>
            )}
          </div>
          {users.length > 0 && <UserList users={users} />}
        </div>
      </div>
    </div>

    {/* 出力単語リスト + 生成ボタン（上部に配置） */}
    {predictedWords.length > 0 && (
      <div className="mt-8 bg-gray-800 p-6 rounded-lg w-full max-w-4xl shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">出力単語リスト</h2>
          <button
            onClick={handleGenerateText}
            disabled={isGenerating}
            className="bg-purple-600 px-4 py-2 rounded-lg hover:bg-purple-700"
          >
            {isGenerating ? "生成中..." : "文章を生成する"}
          </button>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {predictedWords.map((word, i) => (
            <span key={i} className="bg-indigo-600 px-4 py-2 rounded-full">{word}</span>
          ))}
        </div>
      </div>
    )}

    {/* LLMの生成結果 */}
    {(isGenerating || llmResponse) && (
      <div className="mt-6 w-full max-w-4xl bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-3">生成された文章</h2>
        <div className="bg-gray-900 p-4 rounded-md min-h-[100px] whitespace-pre-wrap">
          {isGenerating ? (
            <p className="text-gray-400">AIが文章を生成しています...</p>
          ) : (
            <p>{llmResponse}</p>
          )}
        </div>
      </div>
    )}
  </div>
);


}
