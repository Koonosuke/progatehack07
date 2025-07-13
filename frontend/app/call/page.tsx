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
    const generatedText = data.generatedText;

    // 👇 修正ポイント
    sendMessage(generatedText); // AI解説: を消す
    setChatLog((prev) => [...prev, `You: ${generatedText}`]);

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
        {/* 👇 自分の映像 + canvas + 認識中オーバーレイ */}
       {/* 👇 自分の映像 + canvas + 認識中バッジ */} 
<div className="relative flex-1 rounded-2xl shadow-lg bg-gray-800 border border-gray-700 overflow-hidden">
  <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-contain" />
  <canvas
    ref={canvasRef}
    width="550"
    height="500"
    className="absolute top-0 left-0 w-full h-full pointer-events-none"
  />
  
  {/* 認識中バッジ */}
  {isCollecting && (
    <div className="absolute top-3 right-3 z-20">
      <div className="flex items-center gap-2 bg-white bg-opacity-90 text-black px-3 py-1 rounded-full shadow-md">
        <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
        <span className="text-sm font-semibold">認識中...</span>
      </div>
    </div>
  )}
</div>


        {/* 相手の映像 */}
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

{/* 出力単語リスト + 生成ボタン */}
{predictedWords.length > 0 && (
  <div className="mt-12 bg-gray-800 p-8 rounded-3xl w-full max-w-4xl shadow-2xl border border-gray-700">
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-2xl font-extrabold text-white tracking-wide">
        ✨ 出力単語リスト
      </h2>

      {/* 生成ボタン */}
      <button
        onClick={handleGenerateText}
        disabled={isGenerating}
        className={`relative overflow-hidden px-6 py-3 rounded-xl text-lg font-bold shadow-xl transition-all duration-300
          ${
            isGenerating
              ? "bg-purple-400 cursor-not-allowed"
              : "bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-600 hover:to-indigo-600"
          }
          text-white
        `}
      >
        {isGenerating ? "生成中..." : "🎨 文章を生成する"}

        {/* 輝きのエフェクト */}
        {!isGenerating && (
          <span className="absolute top-0 left-0 w-full h-full rounded-xl animate-glow bg-white opacity-10"></span>
        )}
      </button>
    </div>

    {/* 単語表示 */}
    <div className="flex flex-wrap justify-center gap-3">
      {predictedWords.map((word, i) => (
        <span
          key={i}
          className="bg-indigo-600 text-white px-4 py-2 rounded-full text-lg font-semibold shadow-md"
        >
          {word}
        </span>
      ))}
    </div>
  </div>
)}

{/* LLMの生成結果（中央演出＋派手表示） */}
{llmResponse && !isGenerating && (
  <div className="mt-16 max-w-4xl w-full px-6 sm:px-8 animate-fade-in-up">
<div
  className="relative bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600 text-white px-10 py-12 rounded-[2rem] shadow-[0_0_40px_rgba(0,255,255,0.25)] border-4 border-white border-opacity-20 transform transition hover:scale-[1.03] hover:rotate-[0.3deg] animate-fly-to-chat"
  onAnimationEnd={() => {
    sendMessage(llmResponse);
    setChatLog((prev) => [...prev, `You: ${llmResponse}`]);
    setLlmResponse(""); // 吸い込んだら消す
  }}
>

      {/* ポップアップ：生成完了！ */}
{llmResponse && !isGenerating && (
  <div className="fixed top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 animate-flash-popup">
    <div className="bg-white text-blue-800 text-3xl font-bold px-10 py-6 rounded-3xl shadow-2xl border-4 border-blue-400">
      ✨ 生成完了！
    </div>
  </div>
)}

      <h2 className="text-4xl font-extrabold mb-6 text-center tracking-wider animate-bounce">
        🌟 生成されたメッセージ 🌟
      </h2>
      <p className="text-2xl text-center font-medium tracking-wide whitespace-pre-wrap leading-loose">
        {llmResponse}
      </p>
    </div>
  </div>
)}


{/* 生成中ローディング */}
{isGenerating && (
  <div className="mt-12 max-w-4xl w-full px-6 sm:px-8 text-center">
    <div className="bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-700">
      <p className="text-gray-400 animate-pulse text-lg">
        🧠 AIが文章を生成しています...
      </p>
    </div>
  </div>
)}


  </div>
);

}
