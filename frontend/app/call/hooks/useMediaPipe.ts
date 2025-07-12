// app/call/hooks/useMediaPipe.ts
import { useEffect, useRef } from "react";

interface HolisticResults {
  image: CanvasImageSource;
  rightHandLandmarks?: { x: number; y: number; z: number }[];
  leftHandLandmarks?: { x: number; y: number; z: number }[];
}

interface UseMediaPipeProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onPredict: (label: string) => void;
  setIsCollecting: (val: boolean) => void;
}

export const useMediaPipe = ({
  videoRef,
  canvasRef,
  onPredict,
  setIsCollecting,
}: UseMediaPipeProps) => {
  const holisticRef = useRef<any>(null);
  const isCollectingRef = useRef(false);
  const landmarkBuffer = useRef<number[][]>([]);
const isInitialized = useRef(false);
  useEffect(() => {
    
    if (isInitialized.current) return;
    isInitialized.current = true;

    const initializeMediaPipe = async () => {
      const loadScript = (src: string) =>
        new Promise<void>((resolve) => {
          const script = document.createElement("script");
          script.src = src;
          script.crossOrigin = "anonymous";
          script.onload = () => resolve();
          document.body.appendChild(script);
        });

      const holisticVersion = "0.5.1635989137";
      const drawingUtilsVersion = "0.3.1620248257";

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

      holistic.onResults(onResults);
      holisticRef.current = holistic;

      await holistic.initialize();

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

    const startInferenceLoop = () => {
      const processFrame = async () => {
        const video = videoRef.current;
        const holistic = holisticRef.current;

        if (!video || video.readyState < 2 || !holistic) {
          requestAnimationFrame(processFrame);
          return;
        }

        try {
          await holistic.send({ image: video });
        } catch (err) {
          console.error("MediaPipe送信エラー:", err);
        }

        requestAnimationFrame(processFrame);
      };

      processFrame();
    };

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

      // 推論処理
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
          onPredict(data.label);
        })
        .catch((err) => console.error("Prediction request failed:", err))
        .finally(() => {
          landmarkBuffer.current = [];
          isCollectingRef.current = false;
          setIsCollecting(false);
        });
    };

    const flattenLandmarks = (results: any): number[] => {
      const right =
        results.rightHandLandmarks ?? Array(21).fill({ x: 0, y: 0, z: 0 });
      const left =
        results.leftHandLandmarks ?? Array(21).fill({ x: 0, y: 0, z: 0 });
      const points = [...right, ...left];
      return points.flatMap((p) => [p.x, p.y, p.z]);
    };

    initializeMediaPipe();

    return () => {
      holisticRef.current?.close();
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, []);

  const startInference = () => {
    landmarkBuffer.current = [];
    isCollectingRef.current = true;
    setIsCollecting(true);
  };

  return {
    startInference,
  };
};
