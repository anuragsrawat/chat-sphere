import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

// 🧾 Get all users for sidebar (excluding the logged-in user)
export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user?._id;
    if (!loggedInUserId) {
      return res.status(401).json({ error: "Unauthorized: Missing user ID" });
    }

    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");
    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// 📩 Get all messages between logged-in user and another user
export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user?._id;
    if (!myId) {
      return res.status(401).json({ error: "Unauthorized: Missing user ID" });
    }

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ✉️ Send a message (text or image)
export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user?._id;
    if (!senderId) {
      return res.status(401).json({ error: "Unauthorized: Missing sender ID" });
    }

    let imageUrl;

    // 📤 Upload image to Cloudinary if it is base64 data
    if (image?.startsWith("data:image/")) {
      const uploadResponse = await cloudinary.uploader.upload(image, {
        resource_type: "image",
        folder: "chatsphere_images",
      });
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
    });

    await newMessage.save();

    // 📡 Emit message in real-time to receiver
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
