// CallPage.tsx（MediaPipe統合版
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function CallPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pc = useRef<RTCPeerConnection | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const [started, setStarted] = useState(false);
  const [users, setUsers] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isCollecting, setIsCollecting] = useState(false);
  const landmarkBuffer = useRef<number[][]>([]);
  const isCollectingRef = useRef(false);
  const router = useRouter();
  const [roomId, setRoomId] = useState("default");
  const [userName, setUserName] = useState("");

  const holisticRef = useRef<any>(null);

  const startInference = () => {
    landmarkBuffer.current = [];
    setIsCollecting(true);
    isCollectingRef.current = true;
  };

  // Holisticのresultsから右手・左手ランドマークを平坦化して配列化
  const flattenLandmarks = (results: any): number[] => {
    const right =
      results.rightHandLandmarks ?? Array(21).fill({ x: 0, y: 0, z: 0 });
    const left =
      results.leftHandLandmarks ?? Array(21).fill({ x: 0, y: 0, z: 0 });
    const points = [...right, ...left];
    return points.flatMap((p) => [p.x, p.y, p.z]);
  };

  useEffect(() => {
    // カメラ起動
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("カメラ起動エラー:", err);
      }
    };
    initCamera();

    // MediaPipe HolisticをCDNから読み込み初期化
    const loadHolistic = async () => {
      if (!(window as any).Holistic) {
        await new Promise<void>((resolve) => {
          const script = document.createElement("script");
          script.src =
            "https://cdn.jsdelivr.net/npm/@mediapipe/holistic/holistic.js";
          script.async = true;
          script.onload = () => resolve();
          document.body.appendChild(script);
        });
      }

      const Holistic = (window as any).Holistic;
      holisticRef.current = new Holistic({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`,
      });

      holisticRef.current.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        refineFaceLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      holisticRef.current.onResults((results: any) => {
        if (isCollectingRef.current) {
          if (landmarkBuffer.current.length < 30) {
            const frameData = flattenLandmarks(results);
            landmarkBuffer.current.push(frameData);
          }
          if (landmarkBuffer.current.length === 30) {
            const payload = { sequence: landmarkBuffer.current };
            fetch("http://localhost:8000/predict", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            })
              .then((res) => res.json())
              .then((data) => {
                console.log(
                  "予測ラベル:",
                  data.label,
                  "信頼度:",
                  data.confidence
                );
              })
              .catch((err) => {
                console.error("推論リクエスト失敗:", err);
              })
              .finally(() => {
                landmarkBuffer.current = [];
                setIsCollecting(false);
                isCollectingRef.current = false;
              });
          }
        }
      });

      // requestAnimationFrameループで動画フレームごとにHolistic推論を実行
      const onFrame = async () => {
        if (videoRef.current && videoRef.current.readyState >= 2) {
          await holisticRef.current.send({ image: videoRef.current });
        }
        requestAnimationFrame(onFrame);
      };
      onFrame();
    };

    loadHolistic();
  }, []);

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

  useEffect(() => {
    const loadScripts = async () => {
      const loadScript = (src: string): Promise<void> =>
        new Promise((resolve) => {
          const script = document.createElement('script');
          script.src = src;
          script.async = true;
          script.onload = () => resolve();
          document.body.appendChild(script);
        });

      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/holistic/holistic.js');
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js');
      setLoaded(true);
    };

    loadScripts();
  }, []);

  useEffect(() => {
    if (!loaded) return;

const holistic = new (window as any).Holistic({
  locateFile: (file: string) =>
    `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`,
});


    holistic.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      refineFaceLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    holistic.onResults((results: any) => {
      const canvasCtx = canvasRef.current?.getContext('2d');
      if (!canvasCtx || !results.image) return;

      canvasCtx.save();
      canvasCtx.clearRect(0, 0, 640, 480);
      canvasCtx.drawImage(results.image, 0, 0, 640, 480);

      const drawConnectors = (window as any).drawConnectors;
      const drawLandmarks = (window as any).drawLandmarks;

      if (results.rightHandLandmarks) {
        drawConnectors(canvasCtx, results.rightHandLandmarks, (window as any).HAND_CONNECTIONS, {
          color: '#00FF00', lineWidth: 2,
        });
        drawLandmarks(canvasCtx, results.rightHandLandmarks, { color: '#FF0000', lineWidth: 1 });
      }

      if (results.leftHandLandmarks) {
        drawConnectors(canvasCtx, results.leftHandLandmarks, (window as any).HAND_CONNECTIONS, {
          color: '#0000FF', lineWidth: 2,
        });
        drawLandmarks(canvasCtx, results.leftHandLandmarks, { color: '#FFFF00', lineWidth: 1 });
      }

      if (isCollectingRef.current) {
        if (landmarkBuffer.current.length < 30) {
          const points = [...(results.rightHandLandmarks ?? []), ...(results.leftHandLandmarks ?? [])];
          const frameData = points.flatMap((p) => [p.x, p.y, p.z]);
          landmarkBuffer.current.push(frameData);
        }

        if (landmarkBuffer.current.length === 30) {
          fetch('http://localhost:8000/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sequence: landmarkBuffer.current })
          })
            .then(res => res.json())
            .then(data => {
              alert(`予測: ${data.label}（信頼度: ${Math.round(data.confidence * 100)}%）`);
            })
            .catch(err => console.error('推論失敗:', err))
            .finally(() => {
              landmarkBuffer.current = [];
              isCollectingRef.current = false;
              setIsCollecting(false);
            });
        }
      }

      canvasCtx.restore();
    });

    const inferenceLoop = () => {
      if (videoRef.current) {
        holistic.send({ image: videoRef.current });
        requestAnimationFrame(inferenceLoop);
      }
    };
    inferenceLoop();
  }, [loaded]);

  const getWebSocketURL = (): string => {
    const protocol = location.protocol === "https:" ? "wss" : "ws";
    const host = process.env.NEXT_PUBLIC_FASTAPI_HOST || location.hostname;
    return `${protocol}://${host}/ws/${roomId}`;
  };

  const start = async () => {
    if (!videoRef.current) return;

    if (!videoRef.current.srcObject) {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      videoRef.current.srcObject = stream;
    }

    pc.current = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    const stream = videoRef.current?.srcObject as MediaStream;
    stream.getTracks().forEach((track) => pc.current?.addTrack(track, stream));

    pc.current.ontrack = (event) => {

      if (remoteVideo.current && !remoteVideo.current.srcObject) {
        remoteVideo.current.srcObject = event.streams[0];
      }
    };

    const iceCandidateQueue: RTCIceCandidate[] = [];
    ws.current = new WebSocket(getWebSocketURL());
    let isOfferer = false;

    ws.current.onopen = () => {
      ws.current?.send(JSON.stringify({ type: "join", user: userName }));
    };

    ws.current.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case "userList":
          setUsers(data.users);
          if (data.users.length === 1 && pc.current && !isOfferer) {
            isOfferer = true;
            const offer = await pc.current.createOffer();
            await pc.current.setLocalDescription(offer);
            ws.current?.send(JSON.stringify(offer));
          }
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
          if (isOfferer) {
            await pc.current?.setRemoteDescription(
              new RTCSessionDescription(data)
            );
            while (iceCandidateQueue.length > 0) {
              await pc.current?.addIceCandidate(iceCandidateQueue.shift()!);
            }
          }
          break;
        case "left":
          alert(`${data.user} が通話を退出しました。`);
          if (remoteVideo.current) remoteVideo.current.srcObject = null;
          break;
        default:
          if (data.candidate) {
            const candidate = new RTCIceCandidate(data);
            if (pc.current?.remoteDescription) {
              await pc.current.addIceCandidate(candidate);
            } else {
              iceCandidateQueue.push(candidate);
            }
          }
      }
    };

    pc.current.onicecandidate = (event) => {
      if (event.candidate && ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify(event.candidate));
      }
    };

    setStarted(true);
  };

  const leaveCall = () => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: "leave", user: userName }));
      ws.current.close();
    }
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    if (remoteVideo.current) remoteVideo.current.srcObject = null;
    alert("通話を終了しました。");
    router.push("/users");
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-start py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">WebRTC 通話モック</h1>
      <div className="flex flex-col lg:flex-row gap-6 w-full max-w-6xl justify-center">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full lg:w-1/2 rounded-lg shadow-lg border border-gray-700"
        />
        <video
          ref={remoteVideo}
          autoPlay
          playsInline
          className="w-full lg:w-1/2 rounded-lg shadow-lg border border-gray-700"
        />
      </div>
      {!started && (
        <button onClick={start} className="mt-8 bg-blue-600 hover:bg-blue-700 transition px-6 py-3 rounded-lg font-semibold text-lg">
          通話を開始する
        </button>
      )}
      {started && (
        <ul>
          <li>
            <button
              onClick={startInference}
              className="mt-4 bg-green-600 hover:bg-green-700 transition px-6 py-3 rounded-lg font-semibold text-lg"
            >
              音声認識を開始する
            </button>
            <button
              onClick={leaveCall}
              className="mt-4 bg-red-600 hover:bg-red-700 transition px-6 py-3 rounded-lg font-semibold text-lg"
            >
              通話を終了する
            </button>
          </li>
        </ul>
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
