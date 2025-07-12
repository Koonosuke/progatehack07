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

    addRipple();
    const intervalId = setInterval(addRipple, 800);

    let animationFrameId: number;

    function draw() {
      if (!ctx) return;

      // 背景を塗りつぶし（透明感を維持）
      ctx.fillStyle = "rgba(0, 0, 30, 0.2)";
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
    }

    draw();

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener("resize", handleResize);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
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
