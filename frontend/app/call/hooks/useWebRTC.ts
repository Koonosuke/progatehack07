// app/call/hooks/useWebRTC.ts
import { useRef } from "react";

interface UseWebRTCProps {
videoRef: React.RefObject<HTMLVideoElement | null>;
remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  userName: string;
  roomId: string;
  setUsers: (users: string[]) => void;
}

export const useWebRTC = ({
  videoRef,
  remoteVideoRef,
  userName,
  roomId,
  setUsers,
}: UseWebRTCProps) => {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const start = async () => {
    if (!videoRef.current?.srcObject) {
      alert("カメラが準備できていません");
      return;
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        {
          urls: process.env.NEXT_PUBLIC_TURN_URL!,
          username: process.env.NEXT_PUBLIC_TURN_USERNAME!,
          credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL!,
        },
      ],
    });

    pcRef.current = pc;

    const stream = videoRef.current.srcObject as MediaStream;
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    const protocol = location.protocol === "https:" ? "wss" : "ws";
    const host = process.env.NEXT_PUBLIC_FASTAPI_HOST || location.hostname;
    const wsURL = `${protocol}://${host}/ws/${roomId}`;
    const ws = new WebSocket(wsURL);
    wsRef.current = ws;

    const iceCandidateQueue: RTCIceCandidate[] = [];
    let isOfferer = false;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "join", user: userName }));
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(event.candidate.toJSON()));
      }
    };

    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);

      if (data.candidate) {
        const candidate = new RTCIceCandidate(data);
        if (pc.remoteDescription) {
          await pc.addIceCandidate(candidate);
        } else {
          iceCandidateQueue.push(candidate);
        }
        return;
      }

      switch (data.type) {
        case "userList":
          setUsers(data.users);
          if (data.users.length >= 2 && userName === data.users.sort()[0] && !pc.localDescription) {
            isOfferer = true;
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            ws.send(JSON.stringify(offer));
          }
          break;

        case "offer":
          if (!isOfferer) {
            await pc.setRemoteDescription(new RTCSessionDescription(data));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            ws.send(JSON.stringify(pc.localDescription));
          }
          break;

        case "answer":
          if (!pc.remoteDescription) {
            await pc.setRemoteDescription(new RTCSessionDescription(data));
            while (iceCandidateQueue.length > 0) {
              await pc.addIceCandidate(iceCandidateQueue.shift()!);
            }
          }
          break;

        case "left":
          alert(`${data.user} が退出しました`);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
          }
          break;
      }
    };
  };

  const leave = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "leave", user: userName }));
    }

    pcRef.current?.close();
    wsRef.current?.close();
  };

  return {
    start,
    leave,
    wsRef,
    pcRef,
  };
};
