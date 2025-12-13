import WebSocket, { WebSocketServer } from "ws";
import IORedis from "ioredis";
import logger from "../logger/logger.js";

const redisSub = new IORedis({
        host: process.env.REDIS_HOST || "yt-redis",
        port: 6379,
})

const wss = new WebSocketServer({ port: 8080 });
logger.info("WebSocket server started on port 8080");

// MAP to keep track of clients per videoId
// videoId => ws client
// ONE ws client per videoId + multiple video Ids per ws client supported

const videoClients = new Map();

wss.on('connection', function connect(ws) {
        ws.on('message', (msg) => {
                const { action, videoId } = JSON.parse(msg);

                if (action == 'subscribe' && videoId) {
                        videoClients.set(videoId, ws);
                        
                        ws.on('close', ()=>{
                                videoClients.delete(videoId);
                        })
                }
        })
})


// SUBSCRIPTION AND FORWARDING LOGIC

redisSub.psubscribe("video-progress:*");
redisSub.on('pmessage', (_, channel, message) => {
        const videoId = channel.split(':')[1];
        const ws = videoClients.get(videoId);

        if(ws && ws.readyState === WebSocket.OPEN) {
                ws.send(message);
        }
})

// RECIEVE MESSAGE FORMAT = 
//      JSON.stringify({
//        videoId,
//        stage: stageKey,
//        percent: stage.percent,
//        message: stage.message,
//        time: Date.now(),
//      })
