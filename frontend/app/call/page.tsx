// CallPage.tsx（MediaPipe統合版
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface HolisticResults {
  image: CanvasImageSource;
  rightHandLandmarks?: { x: number; y: number; z: number }[];
  leftHandLandmarks?: { x: number; y: number; z: number }[];
}

export default function CallPage() {
  const router = useRouter();
  //DOM
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  //webRTC
  const pc = useRef<RTCPeerConnection | null>(null);
  const ws = useRef<WebSocket | null>(null);
  //MediaPipe
  const holisticRef = useRef<any>(null);
  const landmarkBuffer = useRef<number[][]>([]);
  const isCollectingRef = useRef(false);
  //Component
  const [started, setStarted] = useState(false);
  const [users, setUsers] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isCollecting, setIsCollecting] = useState(false);
  const [roomId, setRoomId] = useState("default");
  const [predictedWords, setPredictedWords] = useState<string[]>([]);
  const [llmResponse, setLlmResponse] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [userName, setUserName] = useState("");

  const chatSocket = useRef<WebSocket | null>(null);
  const [chatLog, setChatLog] = useState<string[]>([]);
  const [chatInput, setChatInput] = useState("");

  //ルームID&ユーザ名取得
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const room = params.get("room") || "default";
      const user =
        params.get("user") || `User${Math.floor(Math.random() * 1000)}`;
      setRoomId(room);
      setUserName(user);
    }
  }, []);

  const isInitialized = useRef(false);

  //初期化処理
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;
    //MediaPipeとカメラ初期化
    const initializeMediaPipe = async () => {
      const loadScript = (src: string) =>
        new Promise<void>((resolve) => {
          const script = document.createElement("script");
          script.src = src;
          script.crossOrigin = "anonymous";
          script.onload = () => resolve();
          document.body.appendChild(script);
        });

      //バージョン固定
      const holisticVersion = "0.5.1635989137";
      const drawingUtilsVersion = "0.3.1620248257";

      //スクリプト読み込み
      await Promise.all([
        loadScript(
          `https://cdn.jsdelivr.net/npm/@mediapipe/holistic@${holisticVersion}/holistic.js`
        ),
        loadScript(
          `https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils@${drawingUtilsVersion}/drawing_utils.js`
        ),
      ]);

      const Holistic = (window as any).Holistic;
      if (!Holistic) {
        console.error("Holistic ライブラリが見つかりませんでした");
        return;
      }

      //Holisticインスタンスの作成
      const holistic = new Holistic({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/holistic@${holisticVersion}/${file}`,
      });
      holistic.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        refineFaceLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      //処理結果
      holistic.onResults(onResults);
      holisticRef.current = holistic;

      await holistic.initialize();

      //カメラを起動
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.addEventListener("loadeddata", startInferenceLoop);
        }
      } catch (err) {
        console.error("カメラの起動に失敗しました:", err);
      }
    };
    //推論開始
    const startInferenceLoop = () => {
      const processFrame = async () => {
        const video = videoRef.current;
        const holistic = holisticRef.current;

        // 安全チェック：videoとholisticが存在し、映像準備ができているか
        if (!video || video.readyState < 2 || !holistic) {
          requestAnimationFrame(processFrame); // 次のフレームで再試行
          return;
        }

        try {
          await holistic.send({ image: video });
        } catch (err) {
          console.error("MediaPipe送信エラー:", err);
        }

        requestAnimationFrame(processFrame); // 次のフレーム処理をスケジュール
      };

      processFrame();
    };

    initializeMediaPipe();

    //クリーンアップ
    return () => {
      holisticRef.current?.close();
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }
      ws.current?.close();
      pc.current?.close();
    };
  }, []);

  //MediaPipeの結果を処理する関数
  const onResults = (results: HolisticResults) => {
    const canvasCtx = canvasRef.current?.getContext("2d");
    if (!canvasCtx || !canvasRef.current) return;

    canvasCtx.save();
    canvasCtx.clearRect(
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    );
    canvasCtx.drawImage(
      results.image,
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    );

    const drawConnectors = (window as any).drawConnectors;
    const drawLandmarks = (window as any).drawLandmarks;
    const HAND_CONNECTIONS = (window as any).HAND_CONNECTIONS;

    if (results.rightHandLandmarks) {
      drawConnectors(canvasCtx, results.rightHandLandmarks, HAND_CONNECTIONS, {
        color: "#00FF00",
        lineWidth: 2,
      });
      drawLandmarks(canvasCtx, results.rightHandLandmarks, HAND_CONNECTIONS, {
        color: "#FF0000",
        lineWidth: 1,
      });
    }
    if (results.leftHandLandmarks) {
      drawConnectors(canvasCtx, results.leftHandLandmarks, HAND_CONNECTIONS, {
        color: "#00FF00",
        lineWidth: 2,
      });
      drawLandmarks(canvasCtx, results.leftHandLandmarks, HAND_CONNECTIONS, {
        color: "#FF0000",
        lineWidth: 1,
      });
    }
    canvasCtx.restore();
    //データ収集
    if (isCollectingRef.current) {
      if (landmarkBuffer.current.length < 30) {
        const frameData = flattenLandmarks(results);
        landmarkBuffer.current.push(frameData);
      }
      if (landmarkBuffer.current.length === 30) {
        predictAction();
      }
    }
  };

  //手話予想
  const predictAction = () => {
    const baseURL = `https://${process.env.NEXT_PUBLIC_FASTAPI_HOST}`;
    const payload = { sequence: landmarkBuffer.current };
    fetch(`${baseURL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((data) => {
        //alert(`予測: ${data.label}(信頼度: ${Math.round(data.confidence * 100)}%)`);
        const newWord = data.label;
        setPredictedWords((prevWords) => {
          const wordSet = new Set(prevWords);
          wordSet.add(newWord);
          return Array.from(wordSet);
        });
      })
      .catch((err) => console.error("Prediction request failed:", err))
      .finally(() => {
        landmarkBuffer.current = [];
        isCollectingRef.current = false;
        setIsCollecting(false);
      });
  };

  //ランドマーク平坦化
  const flattenLandmarks = (results: any): number[] => {
    const right =
      results.rightHandLandmarks ?? Array(21).fill({ x: 0, y: 0, z: 0 });
    const left =
      results.leftHandLandmarks ?? Array(21).fill({ x: 0, y: 0, z: 0 });
    const points = [...right, ...left];
    return points.flatMap((p) => [p.x, p.y, p.z]);
  };

  // 認識開始ボタンの処理
  const handleStartInference = () => {
    landmarkBuffer.current = [];
    isCollectingRef.current = true;
    setIsCollecting(true);
  };

  //文章生成(Ollama API呼び出し)
  const handleGenerateText = async () => {
    if (predictedWords.length === 0) {
      alert("認識された単語がありません．");
      return;
    }

    setIsGenerating(true);
    setLlmResponse("");

    try {
      const response = await fetch("/web/api/llm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ words: predictedWords, chatHistory: chatLog }),
      });

      if (!response.ok) {
        throw new Error("APIからの応答エラー");
      }

      const data = await response.json();
      setLlmResponse(data.generatedText);
      //チャットに結果を送信
      if (chatSocket.current && chatSocket.current.readyState === WebSocket.OPEN){
        const message=`AI解説: ${data.generatedText}`;
        chatSocket.current.send(message);
        setChatLog((prev) => [...prev, message]);
      }

      setPredictedWords([]);
    } catch (error) {
      console.error("文章生成に失敗しました．", error);
      setLlmResponse("エラー: 文章を生成できませんでした.");
    } finally {
      setIsGenerating(false);
    }
  };

  // WebRTCの接続を開始
  const start = async () => {
    if (!videoRef.current?.srcObject) {
      alert("カメラが準備できていません。");
      return;
    }

    setStarted(true);

    const iceServers = [
      { urls: "stun:stun.l.google.com:19302" },
      {
        urls: process.env.NEXT_PUBLIC_TURN_URL!,
        username: process.env.NEXT_PUBLIC_TURN_USERNAME!,
        credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL!,
      },
    ];

    pc.current = new RTCPeerConnection({
      iceServers: iceServers,
    });

    const stream = videoRef.current.srcObject as MediaStream;
    stream.getTracks().forEach((track) => pc.current?.addTrack(track, stream));

    pc.current.ontrack = (event) => {
      if (remoteVideo.current) {
        remoteVideo.current.srcObject = event.streams[0];
      }
    };

    const protocol = location.protocol === "https:" ? "wss" : "ws";
    const host = process.env.NEXT_PUBLIC_FASTAPI_HOST || location.hostname;
    const wsURL = `${protocol}://${host}/ws/${roomId}`;
    ws.current = new WebSocket(wsURL);

    const iceCandidateQueue: RTCIceCandidate[] = [];
    let isOfferer = false;

    ws.current.onopen = () => {
      ws.current?.send(JSON.stringify({ type: "join", user: userName }));
    };

    pc.current.onicecandidate = (event) => {
      if (!pc.current) return;
      if (event.candidate && ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify(event.candidate.toJSON()));
      }
    };

    ws.current.onmessage = async (event) => {
      if (!pc.current) return;
      const data = JSON.parse(event.data);
      if (data.candidate) {
        const candidate = new RTCIceCandidate(data);
        if (pc.current?.remoteDescription) {
          await pc.current.addIceCandidate(candidate);
        } else {
          iceCandidateQueue.push(candidate);
        }
      } else {
        switch (data.type) {
          case "userList":
            setUsers(data.users);
            if (data.users.length === 1 && pc.current && !isOfferer) {
              isOfferer = true;
              const offer = await pc.current.createOffer();
              await pc.current.setLocalDescription(offer);
              ws.current?.send(JSON.stringify(offer));
            }

            // if (data.users.length > 1 && !pc.current?.currentRemoteDescription) {
            //   isOfferer = true;
            //   const offer = await pc.current.createOffer();
            //   await pc.current.setLocalDescription(offer);
            //   ws.current?.send(JSON.stringify(offer));
            // }
            break;
          case "offer":
            if (!isOfferer) {
              await pc.current?.setRemoteDescription(
                new RTCSessionDescription(data)
              );
              const answer = await pc.current?.createAnswer();
              await pc.current?.setLocalDescription(answer!);
              ws.current?.send(JSON.stringify(pc.current?.localDescription));
            }
            break;
          case "answer":
            await pc.current?.setRemoteDescription(
              new RTCSessionDescription(data)
            );
            while (iceCandidateQueue.length > 0) {
              await pc.current?.addIceCandidate(iceCandidateQueue.shift()!);
            }
            break;
          case "left":
            alert(`${data.user} が通話を退出しました。`);
            if (remoteVideo.current) remoteVideo.current.srcObject = null;
            break;
        }
      }
    };
  };

  // 通話終了
  const leaveCall = () => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: "leave", user: userName }));
    }
    alert("通話を終了しました。");
    router.push("/users");
  };

  // チャットメッセージ送信
  useEffect(() => {
    if (!roomId) return;
    const protocol = location.protocol === "https:" ? "wss" : "ws";
    const host = process.env.NEXT_PUBLIC_FASTAPI_HOST || location.hostname;
    const chatURL = `${protocol}://${host}/ws/chat/${roomId}`;

    const socket = new WebSocket(chatURL);
    chatSocket.current = socket;

    socket.onmessage = (event) => {
      setChatLog((prev) => [...prev, event.data]);
    };

    return () => {
      socket.close();
    };
  }, [roomId]);

  const sendChatMessage = () => {
    if (
      chatSocket.current &&
      chatSocket.current.readyState === WebSocket.OPEN
    ) {
      chatSocket.current.send(`${userName}: ${chatInput}`);
      setChatLog((prev) => [...prev, `You: ${chatInput}`]);
      setChatInput("");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-start py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">WebRTC 手話認識通話</h1>

      <div className="flex w-full max-w-6xl">
        <div className="flex flex-col gap-6 w-full max-w-6xl justify-start items-start">
          {/* ローカルビデオとCanvas */}
          <div className="relative w-1/2 aspect-video">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full rounded-lg shadow-lg border border-gray-700 object-contain"
            />
            <canvas
              ref={canvasRef}
              width="640"
              height="480"
              className="absolute top-0 left-0 w-full h-full rounded-lg pointer-events-none"
            />
          </div>

          {/* リモートビデオ */}
          <div className="w-1/2 aspect-video">
            <video
              ref={remoteVideo}
              autoPlay
              playsInline
              className="w-full h-full bg-black rounded-lg shadow-lg border border-gray-700 object-contain"
            />
          </div>
        </div>
        {/* 右側：チャット欄 */}
        <div className="w-1/2 px-4">
          <div className="bg-gray-800 p-4 rounded-lg shadow-md h-[480px] flex flex-col">
            <h2 className="text-xl font-semibold mb-2">チャット欄</h2>
            <div
              className="flex-1 overflow-y-auto space-y-2 mb-2"
              id="chat-log"
            >
              {chatLog.map((msg, index) => (
                <div key={index} className="text-sm text-white">
                  {msg}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="メッセージを入力..."
                className="flex-1 bg-gray-700 rounded px-3 py-2 text-white outline-none"
              />
              <button
                onClick={sendChatMessage}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white"
              >
                送信
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex gap-4">
        {!started ? (
          <button
            onClick={start}
            className="bg-blue-600 hover:bg-blue-700 transition px-6 py-3 rounded-lg font-semibold text-lg"
          >
            通話を開始する
          </button>
        ) : (
          <>
            <button
              onClick={handleStartInference}
              disabled={isCollecting}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-500 transition px-6 py-3 rounded-lg font-semibold text-lg"
            >
              {isCollecting ? "認識中..." : "アクションを認識"}
            </button>
            <button
              onClick={leaveCall}
              className="bg-red-600 hover:bg-red-700 transition px-6 py-3 rounded-lg font-semibold text-lg"
            >
              通話を終了する
            </button>
          </>
        )}
      </div>
      {predictedWords.length > 0 && (
        <div className="mt-8 w-full max-w-4xl bg-gray-800 p-4 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-3 text-center">
            出力単語リスト
          </h2>
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
          {/*文章生成ボタン*/}
          <div className="text-center mt-6">
            <button
              onClick={handleGenerateText}
              disabled={isGenerating}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray^500 text-white font-bold py-2 px-6 rounded-lg transition-all">
            {isGenerating ? "生成中..." : "文章を生成する"}
            </button>
          </div>
        </div>
      )}
      {/*LLMからの応答表示エリアを追加*/}
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
      {users.length > 0 && (
        <div className="mt-10 bg-gray-800 p-4 rounded-lg shadow-md w-full max-w-md">
          <h2 className="text-xl font-semibold mb-2">接続中のユーザー:</h2>
          <ul className="list-disc pl-6 space-y-1">
            {users.map((user) => (
              <li key={user}>{user}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
