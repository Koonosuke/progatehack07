// CallPage.tsx（MediaPipe統合版）
'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export default function CallPage() {
  const localVideo = useRef<HTMLVideoElement>(null);
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

  const [roomId, setRoomId] = useState('default');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const room = params.get('room') || 'default';
      const user = params.get('user') || `User${Math.floor(Math.random() * 1000)}`;
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
    `https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.5.1675471629/${file}`,
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
      if (localVideo.current) {
        holistic.send({ image: localVideo.current });
        requestAnimationFrame(inferenceLoop);
      }
    };
    inferenceLoop();
  }, [loaded]);

  const startInference = () => {
    landmarkBuffer.current = [];
    setIsCollecting(true);
    isCollectingRef.current = true;
  };

  const getWebSocketURL = (): string => {
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    const host = process.env.NEXT_PUBLIC_FASTAPI_HOST || location.hostname;
    return `${protocol}://${host}/ws/${roomId}`;
  };

  const start = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    if (localVideo.current) localVideo.current.srcObject = stream;

    pc.current = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    stream.getTracks().forEach(track => pc.current?.addTrack(track, stream));

    pc.current.ontrack = event => {
      if (remoteVideo.current && !remoteVideo.current.srcObject) {
        remoteVideo.current.srcObject = event.streams[0];
      }
    };

    const iceCandidateQueue: RTCIceCandidate[] = [];
    ws.current = new WebSocket(getWebSocketURL());
    let isOfferer = false;

    ws.current.onopen = () => {
      ws.current?.send(JSON.stringify({ type: 'join', user: userName }));
    };

    ws.current.onmessage = async event => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'userList':
          setUsers(data.users);
          if (data.users.length === 1 && pc.current && !isOfferer) {
            isOfferer = true;
            const offer = await pc.current.createOffer();
            await pc.current.setLocalDescription(offer);
            ws.current?.send(JSON.stringify(offer));
          }
          break;
        case 'offer':
          if (!isOfferer) {
            await pc.current?.setRemoteDescription(new RTCSessionDescription(data));
            const answer = await pc.current?.createAnswer();
            await pc.current?.setLocalDescription(answer!);
            ws.current?.send(JSON.stringify(pc.current?.localDescription));
          }
          break;
        case 'answer':
          if (isOfferer) {
            await pc.current?.setRemoteDescription(new RTCSessionDescription(data));
            while (iceCandidateQueue.length > 0) {
              await pc.current?.addIceCandidate(iceCandidateQueue.shift()!);
            }
          }
          break;
        case 'left':
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

    pc.current.onicecandidate = event => {
      if (event.candidate && ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify(event.candidate));
      }
    };

    setStarted(true);
  };

  const leaveCall = () => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'leave', user: userName }));
      ws.current.close();
    }
    if (localVideo.current?.srcObject) {
      const tracks = (localVideo.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      localVideo.current.srcObject = null;
    }
    if (remoteVideo.current) remoteVideo.current.srcObject = null;
    alert('通話を終了しました。');
    router.push('/users');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-start py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">WebRTC + 手話推論</h1>

      <div className="flex flex-col lg:flex-row gap-6 w-full max-w-6xl justify-center relative">
        <video ref={localVideo} autoPlay muted playsInline className="w-full lg:w-1/2 rounded-lg shadow-lg border border-gray-700" />
        <video ref={remoteVideo} autoPlay playsInline className="w-full lg:w-1/2 rounded-lg shadow-lg border border-gray-700" />
        <canvas ref={canvasRef} width="640" height="480" className="absolute top-0 left-0" />
      </div>

      {!started && (
        <button onClick={start} className="mt-8 bg-blue-600 hover:bg-blue-700 transition px-6 py-3 rounded-lg font-semibold text-lg">
          通話を開始する
        </button>
      )}

      {started && (
        <>
          <button onClick={leaveCall} className="mt-4 bg-red-600 hover:bg-red-700 transition px-6 py-3 rounded-lg font-semibold text-lg">
            通話を終了する
          </button>
          <button onClick={startInference} disabled={isCollecting} className="mt-4 bg-green-600 hover:bg-green-700 transition px-6 py-3 rounded-lg font-semibold text-lg">
            {isCollecting ? '推論中...' : '手話を認識する'}
          </button>
        </>
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
