"use client";

import { useEffect, useRef } from "react";

export default function RippleBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    type Ripple = {
      x: number;
      y: number;
      radius: number;
      alpha: number;
    };

    const ripples: Ripple[] = [];

    const addRipple = () => {
      ripples.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 0,
        alpha: 1,
      });
    };

    let animationFrameId: number;
    let intervalId: NodeJS.Timeout;

    const draw = () => {
      if (!ctx || document.hidden) return; // 非表示なら描画しない

      ctx.fillStyle = "rgba(59, 42, 120, 1)";
      ctx.fillRect(0, 0, width, height);

      ripples.forEach((ripple, i) => {
        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(173, 216, 230, ${ripple.alpha})`;
        ctx.lineWidth = 3;
        ctx.stroke();

        ripple.radius += 2;
        ripple.alpha -= 0.015;

        if (ripple.alpha <= 0) {
          ripples.splice(i, 1);
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    const startAnimation = () => {
      draw();
      intervalId = setInterval(addRipple, 800);
    };

    const stopAnimation = () => {
      clearInterval(intervalId);
      cancelAnimationFrame(animationFrameId);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        startAnimation();
      } else {
        stopAnimation();
      }
    };

    // 初期開始
    startAnimation();

    window.addEventListener("resize", () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    });

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopAnimation();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: -1,
        pointerEvents: "none",
      }}
    />
  );
}
