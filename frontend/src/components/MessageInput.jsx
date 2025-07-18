import { useRef, useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, X } from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const fileInputRef = useRef(null);
  const { sendMessage } = useChatStore();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file?.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result); // base64 string
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ✅ Handle pasted image from clipboard
  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result;

          // ✅ Ensure it starts with "data:image/"
          if (typeof result === "string" && result.startsWith("data:image/")) {
            setImagePreview(result);
          } else {
            toast.error("Unsupported image format");
          }
        };
        reader.readAsDataURL(file);
        e.preventDefault();
        break;
      }
    }
  };

  // ✅ Smart suggestion based on last word
  useEffect(() => {
    const lastWord = text.trim().split(" ").pop();

    if (!lastWord || lastWord.length < 2) {
      setSuggestions([]);
      return;
    }

    const delay = setTimeout(() => {
      axios
        .get(`http://localhost:5000/api/suggestions?query=${lastWord}`)
        .then((res) => setSuggestions(res.data))
        .catch((err) => console.error("Suggestion fetch error:", err));
    }, 300);

    return () => clearTimeout(delay);
  }, [text]);

  const handleSelectSuggestion = (word) => {
    const words = text.trim().split(" ");
    words.pop();
    words.push(word);
    setText(words.join(" ") + " ");
    setSuggestions([]);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;

    try {
      // Optional: Log base64 preview to verify
      console.log("Sending image base64 preview:", imagePreview?.substring(0, 50));

      await sendMessage({
        text: text.trim(),
        image: imagePreview, // base64 string
      });

      setText("");
      setImagePreview(null);
      setSuggestions([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  return (
    <div className="p-4 w-full">
      {imagePreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
            />
            <button
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300 flex items-center justify-center"
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex flex-col gap-1 relative">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex gap-2 relative">
            <input
              type="text"
              className="w-full input input-bordered rounded-lg input-sm sm:input-md"
              placeholder="Type a message..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onPaste={handlePaste}
              autoComplete="off"
            />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImageChange}
            />

            <button
              type="button"
              className={`hidden sm:flex btn btn-circle ${
                imagePreview ? "text-emerald-500" : "text-zinc-400"
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <Image size={20} />
            </button>
          </div>

          <button
            type="submit"
            className="btn btn-sm btn-circle"
            disabled={!text.trim() && !imagePreview}
          >
            <Send size={22} />
          </button>
        </div>

        {suggestions.length > 0 && (
          <ul className="absolute bottom-14 left-4 z-10 bg-base-100 text-base-content border border-base-300 rounded shadow w-[90%] max-h-40 overflow-y-auto">
            {suggestions.map((s, i) => (
              <li
                key={i}
                onClick={() => handleSelectSuggestion(s.word)}
                className="p-2 hover:bg-base-200 cursor-pointer"
              >
                {s.word}
              </li>
            ))}
          </ul>
        )}
      </form>
    </div>
  );
};

export default MessageInput;
