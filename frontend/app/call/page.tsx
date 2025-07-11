// CallPage.tsx（MediaPipe統合版
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface HolisticResults {
  image: CanvasImageSource;
  rightHandLandmarks?:{x: number; y: number; z: number;}[];
  leftHandLandmarks?: {x: number; y: number; z: number;}[];
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
  const [userName, setUserName] = useState("");

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

  //初期化処理
  useEffect(() => {
    //MediaPipeとカメラ初期化
    const initializeMediaPipe = async () => {
      const loadScript = (src: string) => new Promise<void>((resolve) => {
        const script = document.createElement('script');
        script.src = src;
        script.crossOrigin = 'anonymous';
        script.onload = () => resolve();
        document.body.appendChild(script);
      });

      //スクリプト読み込み
      await Promise.all([
        loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/holistic/holistic.js'),
        loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js'),
      ]);

      const Holistic = (window as any).Holistic;
      if(!Holistic){
        console.error("Holistic ライブラリが見つかりませんでした");
        return;
      }

      //Holisticインスタンスの作成
      const holistic = new Holistic({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`,
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

      //カメラを起動
      try{
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true});
        if (videoRef.current){
          videoRef.current.srcObject = stream;
          videoRef.current.addEventListener('loadeddata', startInferenceLoop);
        }
      } catch (err){
        console.error("カメラの起動に失敗しました:", err);
      }
    };
    //推論開始
    const startInferenceLoop = () => {
      if(!videoRef.current || !holisticRef.current) return;
      const processFrame = async () => {
        await holisticRef.current.send({ image: videoRef.current });
        requestAnimationFrame(processFrame);
      };
      processFrame();
    };

    initializeMediaPipe();

    //クリーンアップ
    return () => {
      holisticRef.current?.close();
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
      ws.current?.close();
      pc.current?.close();
    };
  },[]);

  //MediaPipeの結果を処理する関数
  const onResults = (results: HolisticResults) => {
    const canvasCtx = canvasRef.current?.getContext('2d');
    if (!canvasCtx || !canvasRef.current) return;

    canvasCtx.save();
    canvasCtx.clearRect(0,0, canvasRef.current.width, canvasRef.current.height);
    canvasCtx.drawImage(results.image, 0,0, canvasRef.current.width, canvasRef.current.height);

    const drawConnectors = (window as any).drawConnectors;
    const drawLandmarks = (window as any).drawLandmarks;
    const HAND_CONNECTIONS = (window as any).HAND_CONNECTIONS;

    if(results.rightHandLandmarks){
      drawConnectors(canvasCtx, results.rightHandLandmarks, HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 2});
      drawLandmarks(canvasCtx, results.rightHandLandmarks, HAND_CONNECTIONS, { color: '#FF0000', lineWidth: 1});
    }
    if(results.leftHandLandmarks){
      drawConnectors(canvasCtx,results.leftHandLandmarks, HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 2});
      drawLandmarks(canvasCtx, results.leftHandLandmarks, HAND_CONNECTIONS, { color: '#FF0000', lineWidth: 1});
    }
    canvasCtx.restore();
    //データ収集
    if (isCollectingRef.current){
      if(landmarkBuffer.current.length < 30){
        const frameData = flattenLandmarks(results);
        landmarkBuffer.current.push(frameData);
      }
      if (landmarkBuffer.current.length === 30){
        predictAction();
      }
    }
  };

  //手話予想
  const predictAction = () => {
    const payload = { sequence: landmarkBuffer.current };
    fetch("http://localhost:8000/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json"},
      body: JSON.stringify(payload),
    })
    .then((res) => res.json())
    .then((data) => {
      alert(`予測: ${data.label}(信頼度: ${Math.round(data.confidence * 100)}%)`);
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
    const right = results.rightHandLandmarks ?? Array(21).fill({ x: 0, y: 0, z: 0 });
    const left = results.leftHandLandmarks ?? Array(21).fill({ x: 0, y: 0, z: 0 });
    const points = [...right, ...left];
    return points.flatMap((p) => [p.x, p.y, p.z]);
};

// 認識開始ボタンの処理
const handleStartInference = () => {
    landmarkBuffer.current = [];
    isCollectingRef.current = true;
    setIsCollecting(true);
  };

// WebRTCの接続を開始
  const start = async () => {
    if (!videoRef.current?.srcObject) {
      alert("カメラが準備できていません。");
      return;
    }

    setStarted(true);

    const iceServers = [
      {urls: "stun:stun.l.google.com:19302"},
      {
        urls: "turn:54.188.61.175:3478",
        username: "testuser",
        credential: "testpass",
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
              await pc.current?.setRemoteDescription(new RTCSessionDescription(data));
              const answer = await pc.current?.createAnswer();
              await pc.current?.setLocalDescription(answer!);
              ws.current?.send(JSON.stringify(pc.current?.localDescription));
            }
            break;
          case "answer":
            await pc.current?.setRemoteDescription(new RTCSessionDescription(data));
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
    if(ws.current && ws.current.readyState === WebSocket.OPEN){
      ws.current.send(JSON.stringify({ type: "leave", user: userName}));
    }
    alert("通話を終了しました。");
    router.push("/users");
  };
return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-start py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">WebRTC 手話認識通話</h1>
      
      <div className="flex flex-col lg:flex-row gap-6 w-full max-w-6xl justify-center">
        {/* ローカルビデオとCanvas */}
        <div className="relative w-full lg:w-1/2">
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full rounded-lg shadow-lg border border-gray-700" />
          <canvas ref={canvasRef} width="640" height="480" className="absolute top-0 left-0 w-full h-full rounded-lg" />
        </div>
        
        {/* リモートビデオ */}
        <video ref={remoteVideo} autoPlay playsInline className="w-full lg:w-1/2 bg-black rounded-lg shadow-lg border border-gray-700" />
      </div>

      <div className="mt-8 flex gap-4">
        {!started ? (
          <button onClick={start} className="bg-blue-600 hover:bg-blue-700 transition px-6 py-3 rounded-lg font-semibold text-lg">
            通話を開始する
          </button>
        ) : (
          <>
            <button onClick={handleStartInference} disabled={isCollecting} className="bg-green-600 hover:bg-green-700 disabled:bg-gray-500 transition px-6 py-3 rounded-lg font-semibold text-lg">
              {isCollecting ? "認識中..." : "アクションを認識"}
            </button>
            <button onClick={leaveCall} className="bg-red-600 hover:bg-red-700 transition px-6 py-3 rounded-lg font-semibold text-lg">
              通話を終了する
            </button>
          </>
        )}
      </div>

      {users.length > 0 && (
        <div className="mt-10 bg-gray-800 p-4 rounded-lg shadow-md w-full max-w-md">
          <h2 className="text-xl font-semibold mb-2">接続中のユーザー:</h2>
          <ul className="list-disc pl-6 space-y-1">
            {users.map((user) => <li key={user}>{user}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
};