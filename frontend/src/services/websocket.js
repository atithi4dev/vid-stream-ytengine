import { useAuthStore } from "../stores/authStore";
import { useUploadStore } from "../stores/uploadStore";

let wsConnection = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;
let isConnected = false;

export const initializeWebSocket = async () => {
  try {
    const wsUrl = `ws://localhost:8080`;
    console.log("Initializing WebSocket connection to: ws://localhost:8080");
    wsConnection = new WebSocket(wsUrl);

    wsConnection.onopen = () => {
      console.log("✅ WebSocket connected successfully");
      isConnected = true;
      reconnectAttempts = 0;
    };

    wsConnection.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("WebSocket message received:", data);

        if (data.type === "VIDEO_PROCESSING_UPDATE") {
          const { videoId, payload: completionRate } = data;
          console.log(`Updating progress for ${videoId}: ${completionRate}%`);
          useUploadStore.getState().updateProgress(videoId, completionRate);

          // When upload completes (100%), update status
          if (completionRate >= 100) {
            useUploadStore.getState().updateStatus(videoId, "completed");
          }
        }

        if (data.type === "VIDEO_PROCESSING_FINISHED") {
          const { videoId, reason } = data;
          console.log(`Video processing finished for ${videoId}: ${reason}`);
          
          // Remove from upload queue
          useUploadStore.getState().removeFromQueue(videoId);
          
          // Unsubscribe from video
          unsubscribeFromVideo(videoId);
          
          console.log(`🛑 Unsubscribed from ${videoId} after processing finished`);
        }

        if (data.type === "SUBSCRIBED") {
          console.log("✅ Subscribed to video:", data.videoId);
        }
      } catch (err) {
        console.error("WebSocket message parse error:", err);
      }
    };

    wsConnection.onerror = (error) => {
      console.error("❌ WebSocket error:", error);
      console.error("❌ Error details:", {
        message: error.message,
        code: wsConnection?.code,
        reason: wsConnection?.reason,
      });
      isConnected = false;
    };

    wsConnection.onclose = (event) => {
      console.log("⚠️ WebSocket disconnected");
      console.log("⚠️ Close details:", {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
      });
      isConnected = false;
      attemptReconnect();
    };
  } catch (err) {
    console.error("WebSocket initialization error:", err);
  }
};

const attemptReconnect = () => {
  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    reconnectAttempts++;
    console.log(
      `🔄 Attempting to reconnect... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`
    );
    setTimeout(() => {
      initializeWebSocket();
    }, RECONNECT_DELAY);
  } else {
    console.error("❌ Max reconnection attempts reached");
  }
};

export const isWebSocketReady = () => {
  return wsConnection && wsConnection.readyState === WebSocket.OPEN;
};

export const subscribeToVideo = (videoId) => {
  if (isWebSocketReady()) {
    const msg = {
      type: "SUBSCRIBE_VIDEO",
      videoId,
    };
    console.log("📤 Sending subscription:", msg);
    wsConnection.send(JSON.stringify(msg));
  } else {
    console.warn("⚠️ WebSocket not ready, cannot subscribe to video", videoId);
  }
};

export const subscribeWithRetry = (videoId, maxAttempts = 10) => {
  let attempts = 0;
  const retry = () => {
    if (isWebSocketReady()) {
      console.log(`✅ WebSocket ready, subscribing to ${videoId}`);
      subscribeToVideo(videoId);
    } else if (attempts < maxAttempts) {
      attempts++;
      console.log(`⏳ Waiting for WebSocket... (attempt ${attempts}/${maxAttempts}) for video ${videoId}`);
      setTimeout(retry, 300);
    } else {
      console.error(`❌ Failed to subscribe to ${videoId} after max attempts`);
    }
  };
  console.log(`🚀 Starting subscription retry for videoId: ${videoId}`);
  retry();
};

export const unsubscribeFromVideo = (videoId) => {
  if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
    wsConnection.send(
      JSON.stringify({
        type: "UNSUBSCRIBE_VIDEO",
        videoId,
      })
    );
  }
};

export const closeWebSocket = () => {
  if (wsConnection) {
    wsConnection.close();
    wsConnection = null;
  }
};
