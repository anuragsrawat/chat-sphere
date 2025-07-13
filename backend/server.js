// ==== server.js ====

import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import axios from "axios"; // ⬅️ Added for API calls

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// ==== SOCKET.IO VIDEO CALL SETUP ====

const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for development
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("✅ New user connected:", socket.id);

  // Send ID to user
  socket.emit("your-id", socket.id);

  // WebRTC Signaling
  socket.on("call-user", ({ offer, to }) => {
    io.to(to).emit("call-made", { offer, from: socket.id });
  });

  socket.on("make-answer", ({ answer, to }) => {
    io.to(to).emit("answer-made", { answer, from: socket.id });
  });

  socket.on("ice-candidate", ({ candidate, to }) => {
    io.to(to).emit("ice-candidate", { candidate, from: socket.id });
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

// ==== WORD SUGGESTION API ====

app.get("/api/suggestions", async (req, res) => {
  const query = req.query.query;
  if (!query) return res.status(400).json({ error: "Query is required" });

  try {
    const response = await axios.get(`https://api.datamuse.com/sug?s=${query}`);
    res.json(response.data); // Return word suggestions
  } catch (error) {
    console.error("❌ Datamuse API Error:", error.message);
    res.status(500).json({ error: "Suggestion fetch failed" });
  }
});

// ==== START SERVER ====

server.listen(5000, () => {
  console.log("✅ Server running at http://localhost:5000");
});
