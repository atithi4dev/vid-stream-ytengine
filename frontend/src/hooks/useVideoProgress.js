import { useEffect, useState } from "react";

export default function useVideoProgress(videoId, enabled) {
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    if (!videoId || !enabled) return;

    const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8080";
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      socket.send(JSON.stringify({ action: "subscribe", videoId }));
    };

    socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        setProgress(parsed);
      } catch {
        setProgress({ message: event.data });
      }
    };

    socket.onerror = () => {
      setProgress((prev) => prev || { message: "Realtime progress unavailable." });
    };

    return () => {
      socket.close();
    };
  }, [videoId, enabled]);

  return progress;
}
