import { redisClient } from "./config/redis.js";
import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";

const wss = new WebSocketServer({
    port: process.env.WS_PORT,
});

const init = async () => {
    console.log("Redis client connecting...");

    await redisClient.connect();

    console.log("Redis client connected.");

    /*
      roomSubscriptions:
      Map<
        videoId,
        Set<WebSocket>
      >
    */
    const roomSubscriptions = new Map();

    /*
      track:
      WebSocket -> Set<videoId>
    */
    const socketRooms = new Map();

    const addToRoom = (videoId, ws) => {
        if (!roomSubscriptions.has(videoId)) {
            roomSubscriptions.set(videoId, new Set());
        }

        roomSubscriptions.get(videoId).add(ws);

        if (!socketRooms.has(ws)) {
            socketRooms.set(ws, new Set());
        }

        socketRooms.get(ws).add(videoId);

        console.log(
            `Socket subscribed to video ${videoId}`
        );
    };

    const removeSocket = (ws) => {
        const rooms = socketRooms.get(ws);

        if (!rooms) return;

        for (const videoId of rooms) {
            const sockets = roomSubscriptions.get(videoId);

            if (!sockets) continue;

            sockets.delete(ws);

            if (sockets.size === 0) {
                roomSubscriptions.delete(videoId);
            }
        }

        socketRooms.delete(ws);
    };

    const closeVideoRoom = (
        videoId,
        reason
    ) => {
        const sockets =
            roomSubscriptions.get(videoId);

        if (!sockets) return;

        const payload = JSON.stringify({
            type: "VIDEO_PROCESSING_FINISHED",
            videoId,
            reason,
        });

        for (const ws of sockets) {
            if (
                ws.readyState === WebSocket.OPEN
            ) {
                ws.send(payload);
            }

            socketRooms
                .get(ws)
                ?.delete(videoId);
        }

        roomSubscriptions.delete(videoId);

        console.log(
            `Closed room for ${videoId}`
        );
    };
    wss.on("connection", async (ws, req) => {
        try {

            // secured route not needed, since its just a progress update ws.
            const token = req.headers.cookie?.accessToken;

            if (!token) {
                ws.close(1008, "Unauthorized");
                return;
            }

            const decoded = jwt.verify(
                token,
                process.env.ACCESS_TOKEN_SECRET
            );

            ws.user = decoded;

            console.log("WS connected:", ws.user);

            ws.on("message", (rawMessage) => {
                try {
                    const data = JSON.parse(
                        rawMessage.toString()
                    );

                    /*
                      frontend sends:
            
                      {
                        type: "SUBSCRIBE_VIDEO",
                        videoId: "123"
                      }
                    */

                    if (data.type === "SUBSCRIBE_VIDEO") {
                        const { videoId } = data;

                        if (!videoId) return;

                        addToRoom(videoId, ws);

                        ws.send(
                            JSON.stringify({
                                type: "SUBSCRIBED",
                                videoId,
                            })
                        );
                    }

                    /*
                      optional unsubscribe
                    */

                    if (data.type === "UNSUBSCRIBE_VIDEO") {
                        const { videoId } = data;

                        const sockets =
                            roomSubscriptions.get(videoId);

                        if (sockets) {
                            sockets.delete(ws);

                            if (sockets.size === 0) {
                                roomSubscriptions.delete(videoId);
                            }
                        }

                        socketRooms
                            .get(ws)
                            ?.delete(videoId);

                        console.log(
                            `Socket unsubscribed from ${videoId}`
                        );
                    }
                } catch (err) {
                    console.error("WS message error:", err);
                }
            });

            ws.on("close", () => {
                console.log("WS disconnected");

                removeSocket(ws);
            });

            ws.on("error", (err) => {
                console.error("WS error:", err);
            });
        } catch (err) {
            console.error("Connection auth error:", err);

            ws.close(1008, "Unauthorized");
        }
    });

    /*
      REDIS SUBSCRIBER
     
      worker publishes:
     
      channel:
        video:processor:123
     
      message:
        {
          "state": "pending" || "failed",
          "message": "transcoding",
          "completionRate": 65
        }
    */

    await redisClient.pSubscribe(
        "video:processor:*",
        async (message, channel) => {
            try {
                console.log(
                    "Redis message received:",
                    channel,
                    message
                );

                const videoId = channel.split(":")[2];

                const payload = JSON.parse(message);
                if (
                    payload.state === "ready" ||
                    payload.state === "failed"
                ) {
                    closeVideoRoom(
                        videoId,
                        payload.state
                    );

                    return;
                }
                const sockets =
                    roomSubscriptions.get(videoId);

                if (!sockets || sockets.size === 0) {
                    console.log(
                        `No active sockets for video ${videoId}`
                    );

                    return;
                }

                const wsPayload = JSON.stringify({
                    type: "VIDEO_PROCESSING_UPDATE",
                    videoId,
                    payload: payload.completionRate,
                });

                for (const ws of sockets) {
                    if (
                        ws.readyState === WebSocket.OPEN
                    ) {
                        ws.send(wsPayload);
                    }
                }

                console.log(
                    `Broadcasted update to ${sockets.size} sockets`
                );
            } catch (err) {
                console.error(
                    "Redis subscription error:",
                    err
                );
            }
        }
    );

    console.log("WS server running on 8080");
};

init();