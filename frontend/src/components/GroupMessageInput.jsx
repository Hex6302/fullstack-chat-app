import { useState, useRef, useEffect } from "react";
import { Send, Image, Smile, Paperclip, X } from "lucide-react";
import { useGroupStore } from "../store/useGroupStore";
import { useAuthStore } from "../store/useAuthStore";

const GroupMessageInput = () => {
  const [message, setMessage] = useState("");
  const [image, setImage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const { selectedGroup, sendGroupMessage } = useGroupStore();
  const { socket, setGroupTypingStatus } = useAuthStore();

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() && !image) return;

    try {
      const messageData = {
        text: message.trim(),
        image: image,
      };

      await sendGroupMessage(messageData);
      setMessage("");
      setImage("");
      
      // Stop typing indicator
      if (isTyping) {
        setGroupTypingStatus(selectedGroup._id, false);
        setIsTyping(false);
      }
    } catch (error) {
      console.error("Error sending group message:", error);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTyping = () => {
    if (!selectedGroup) return;

    if (!isTyping) {
      setIsTyping(true);
      setGroupTypingStatus(selectedGroup._id, true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      setGroupTypingStatus(selectedGroup._id, false);
    }, 2000);
  };

  const removeImage = () => {
    setImage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const addEmoji = (emoji) => {
    setMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Common emojis
  const commonEmojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣',
    '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰',
    '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜',
    '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏',
    '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
    '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠',
    '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨',
    '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥',
    '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧',
    '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐',
    '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑',
    '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻',
    '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸',
    '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '👶',
    '👧', '🧒', '👦', '👩', '🧑', '👨', '👱', '👱‍♀️',
    '👱‍♂️', '🧔', '👵', '🧓', '👴', '👲', '👳', '👳‍♀️',
    '👳‍♂️', '🧕', '👮', '👮‍♀️', '👮‍♂️', '👷', '👷‍♀️', '👷‍♂️',
    '💂', '💂‍♀️', '💂‍♂️', '🕵️', '🕵️‍♀️', '🕵️‍♂️', '👩‍⚕️', '👨‍⚕️',
    '👩‍🌾', '👨‍🌾', '👩‍🍳', '👨‍🍳', '👩‍🎓', '👨‍🎓', '👩‍🎤', '👨‍🎤',
    '👩‍🏫', '👨‍🏫', '👩‍🏭', '👨‍🏭', '👩‍💻', '👨‍💻', '👩‍💼', '👨‍💼',
    '👩‍🔧', '👨‍🔧', '👩‍🔬', '👨‍🔬', '👩‍🎨', '👨‍🎨', '👩‍🚒', '👨‍🚒',
    '👩‍✈️', '👨‍✈️', '👩‍🚀', '👨‍🚀', '👩‍⚖️', '👨‍⚖️', '👰', '🤵',
    '👸', '🤴', '🦸', '🦸‍♀️', '🦸‍♂️', '🦹', '🦹‍♀️', '🦹‍♂️',
    '🤶', '🎅', '🧙', '🧙‍♀️', '🧙‍♂️', '🧚', '🧚‍♀️', '🧚‍♂️',
    '🧛', '🧛‍♀️', '🧛‍♂️', '🧜', '🧜‍♀️', '🧜‍♂️', '🧝', '🧝‍♀️',
    '🧝‍♂️', '🧞', '🧞‍♀️', '🧞‍♂️', '🧟', '🧟‍♀️', '🧟‍♂️', '🙍',
    '🙍‍♀️', '🙍‍♂️', '🙎', '🙎‍♀️', '🙎‍♂️', '🙅', '🙅‍♀️', '🙅‍♂️',
    '🙆', '🙆‍♀️', '🙆‍♂️', '💁', '💁‍♀️', '💁‍♂️', '🙋', '🙋‍♀️',
    '🙋‍♂️', '🧏', '🧏‍♀️', '🧏‍♂️', '🙇', '🙇‍♀️', '🙇‍♂️', '🤦',
    '🤦‍♀️', '🤦‍♂️', '🤷', '🤷‍♀️', '🤷‍♂️', '👨‍⚕️', '👩‍⚕️', '👨‍⚕️'
  ];

  if (!selectedGroup) return null;

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="flex-1 relative">
          <div className="flex items-center gap-2 bg-base-200 rounded-2xl px-4 py-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-ghost btn-sm btn-circle"
              title="Attach file"
            >
              <Paperclip className="size-4" />
            </button>
            
            <input
              type="text"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                handleTyping();
              }}
              onKeyPress={handleKeyPress}
              placeholder={`Message ${selectedGroup.name}...`}
              className="flex-1 bg-transparent border-none outline-none text-sm"
              disabled={!selectedGroup}
            />
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-ghost btn-sm btn-circle"
              title="Add image"
            >
              <Image className="size-4" />
            </button>
            
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`btn btn-ghost btn-sm btn-circle ${showEmojiPicker ? 'bg-primary/20' : ''}`}
              title="Add emoji"
            >
              <Smile className="size-4" />
            </button>
          </div>

          {/* Image Preview */}
          {image && (
            <div className="absolute bottom-full left-0 mb-2 p-2 bg-base-100 rounded-lg border border-base-300 shadow-lg">
              <div className="flex items-center gap-2">
                <img
                  src={image}
                  alt="preview"
                  className="w-16 h-16 object-cover rounded"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="btn btn-error btn-sm btn-circle"
                >
                  <X className="size-3" />
                </button>
              </div>
            </div>
          )}

          {/* Emoji Picker */}
          {showEmojiPicker && (
            <div className="absolute bottom-full right-0 mb-2 p-3 bg-base-100 rounded-lg border border-base-300 shadow-lg max-h-48 overflow-y-auto w-64">
              <div className="grid grid-cols-8 gap-1">
                {commonEmojis.slice(0, 64).map((emoji, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => addEmoji(emoji)}
                    className="btn btn-ghost btn-sm p-1 hover:bg-base-200 text-lg"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>

        <button
          type="submit"
          disabled={!message.trim() && !image}
          className="btn btn-primary btn-circle"
          title="Send message"
        >
          <Send className="size-4" />
        </button>
      </form>

      {/* Click outside to close emoji picker */}
      {showEmojiPicker && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowEmojiPicker(false)}
        />
      )}
    </div>
  );
};

export default GroupMessageInput;
