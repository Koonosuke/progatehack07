// app/call/hooks/useChatSocket.ts
import { useEffect, useRef } from "react";

interface UseChatSocketOptions {
  roomId: string;
  userName: string;
  onMessage: (msg: string) => void;
}

export const useChatSocket = ({
  roomId,
  userName,
  onMessage,
}: UseChatSocketOptions) => {
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = location.protocol === "https:" ? "wss" : "ws";
    const host = process.env.NEXT_PUBLIC_FASTAPI_HOST || location.hostname;
    const chatURL = `${protocol}://${host}/ws/chat/${roomId}`;
    const socket = new WebSocket(chatURL);
    socketRef.current = socket;

    socket.onmessage = (event) => {
      onMessage(event.data);
    };

    return () => {
      socket.close();
    };
  }, [roomId, userName]);

  const sendMessage = (message: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(`${userName}: ${message}`);
    }
  };

  return { sendMessage };
};
