import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

// 👇 Connect to deployed backend (same origin)
const socket = io("https://chatsphere-1-6u5o.onrender.com", { autoConnect: false });

const VideoCall = () => {
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const [myId, setMyId] = useState("Loading...");
  const [peerId, setPeerId] = useState("");
  const peerConnection = useRef(null);

  useEffect(() => {
    socket.connect();

    socket.on("connect", () => {
      console.log("✅ Connected with ID:", socket.id);
      setMyId(socket.id);
    });

    // Get user's video/audio stream
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // ✅ Create peer connection with STUN server
      peerConnection.current = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" }
        ]
      });

      // Add user's stream tracks to the peer connection
      stream.getTracks().forEach((track) => {
        peerConnection.current.addTrack(track, stream);
      });

      // Handle remote stream when received
      peerConnection.current.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // Send ICE candidates
      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("ice-candidate", {
            to: peerId,
            candidate: event.candidate,
          });
        }
      };
    });

    // Receive offer and send answer
    socket.on("call-made", async ({ offer, from }) => {
      console.log("📞 Incoming call from:", from);
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      socket.emit("make-answer", { answer, to: from });
    });

    // Receive answer
    socket.on("answer-made", async ({ answer }) => {
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
    });

    // Receive ICE candidate
    socket.on("ice-candidate", async ({ candidate }) => {
      try {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("❌ Failed to add ICE candidate", err);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [peerId]);

  const startCall = async () => {
    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);
    socket.emit("call-user", { offer, to: peerId });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 space-y-6 p-4">
      <h2 className="text-2xl font-bold">Video Call</h2>

      <p className="text-sm text-gray-700">
        Your ID: <span className="font-mono">{myId}</span>
      </p>

      <input
        className="border border-gray-300 rounded px-4 py-2 w-full max-w-md"
        type="text"
        placeholder="Enter other user's ID"
        value={peerId}
        onChange={(e) => setPeerId(e.target.value)}
      />

      <button
        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        onClick={startCall}
      >
        Call
      </button>

      <div className="flex gap-6 mt-6 flex-wrap justify-center">
        <div>
          <h4 className="text-center">Your Video</h4>
          <video ref={localVideoRef} autoPlay playsInline muted className="w-64 h-48 bg-black rounded" />
        </div>
        <div>
          <h4 className="text-center">Remote Video</h4>
          <video ref={remoteVideoRef} autoPlay playsInline className="w-64 h-48 bg-black rounded" />
        </div>
      </div>
    </div>
  );
};

export default VideoCall;
