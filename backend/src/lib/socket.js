import { Server } from "socket.io";
import http from "http";
import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  "http://localhost:5173",                      // local dev
  "https://chatsphere-1-6u5o.onrender.com",     // your deployed frontend
];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Track userId → socketId
const userSocketMap = {};

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

io.on("connection", (socket) => {
  console.log("✅ A user connected:", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId) {
    userSocketMap[userId] = socket.id;
  }

  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("disconnect", () => {
    console.log("❌ A user disconnected:", socket.id);

    for (const id in userSocketMap) {
      if (userSocketMap[id] === socket.id) {
        delete userSocketMap[id];
        break;
      }
    }

    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });

  // ✅ WebRTC Signaling Events

  // Step 1: Caller sends offer
  socket.on("call-user", ({ offer, to }) => {
    io.to(to).emit("call-made", { offer, from: socket.id });
  });

  // Step 2: Callee sends answer
  socket.on("make-answer", ({ answer, to }) => {
    io.to(to).emit("answer-made", { answer, from: socket.id });
  });

  // Step 3: ICE candidate exchange
  socket.on("ice-candidate", ({ candidate, to }) => {
    io.to(to).emit("ice-candidate", { candidate, from: socket.id });
  });
});

export { io, app, server };
