import { useRef, useState, useEffect, memo, useCallback } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, X, Smile } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { saveDraft, getDraft, clearDraft } from "../lib/draftManager";
import offlineManager from "../lib/offlineManager";

const MessageInput = memo(() => {
  const { selectedUser, sendMessage, selfDestructMode, protectMode: _ } = useChatStore();
  const { authUser, setTypingStatus } = useAuthStore();
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const draftSaveTimeoutRef = useRef(null);

  // Load draft when chat changes
  useEffect(() => {
    if (selectedUser) {
      const draft = getDraft(selectedUser._id, "direct");
      if (draft) {
        setText(draft.text || "");
        if (draft.image) {
          setImage(draft.image);
        }
      }
    }
  }, [selectedUser]);

  // Auto-save draft
  useEffect(() => {
    if (draftSaveTimeoutRef.current) {
      clearTimeout(draftSaveTimeoutRef.current);
    }

    draftSaveTimeoutRef.current = setTimeout(() => {
      if (selectedUser && (text || image)) {
        saveDraft(selectedUser._id, "direct", text, image);
      }
    }, 1000); // Save after 1 second of inactivity

    return () => {
      if (draftSaveTimeoutRef.current) {
        clearTimeout(draftSaveTimeoutRef.current);
      }
    };
  }, [text, image, selectedUser]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleTyping = useCallback(() => {
    if (!selectedUser) return;

    if (!isTyping) {
      setIsTyping(true);
      setTypingStatus(selectedUser._id, true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      setTypingStatus(selectedUser._id, false);
    }, 2000);
  }, [selectedUser, isTyping, setTypingStatus]);

  const handleSendMessage = useCallback(async (e) => {
    e.preventDefault();
    if (!text.trim() && !image) return;

    try {
      const messageData = { text, image };
      
      // Add self-destruct data if enabled for this chat
      if (selfDestructMode.enabled && selfDestructMode.chatId === selectedUser._id) {
        if (selfDestructMode.duration) {
          // Timer-based
          messageData.selfDestruct = {
            enabled: true,
            expiresAfter: selfDestructMode.duration,
            destructOnRead: false,
          };
        } else {
          // Read-based
          messageData.selfDestruct = {
            enabled: true,
            destructOnRead: true,
          };
        }
      }
      
      // Add protection data if enabled
      const { protectMode } = useChatStore.getState();
      if (protectMode.chatId === selectedUser._id) {
        messageData.preventForwarding = protectMode.preventForwarding;
        messageData.disableCopy = protectMode.disableCopy;
      }

      // Track bandwidth
      const textSize = (messageData.text || "").length;
      offlineManager.trackBandwidth(textSize, "sent");
      
      // Try to send with offline support
      const success = await offlineManager.sendMessage(
        messageData,
        `/messages/send/${selectedUser._id}`
      );

      if (success || offlineManager.isOnline()) {
        await sendMessage(messageData);
      }

      // Clear draft and input
      if (selectedUser) {
        clearDraft(selectedUser._id, "direct");
      }
      setText("");
      setImage(null);
      setIsTyping(false);
      setTypingStatus(selectedUser._id, false);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }, [text, image, selectedUser, selfDestructMode, sendMessage, setTypingStatus]);

  const handleImageChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const removeImage = useCallback(() => {
    setImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const addEmoji = useCallback((emoji) => {
    setText(prev => prev + emoji);
    setShowEmojiPicker(false);
  }, []);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  }, [handleSendMessage]);

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

  if (!selectedUser) return null;

  return (
    <div className="relative">
      <form onSubmit={handleSendMessage} className="flex flex-col gap-2">
        {image && (
          <div className="relative w-32 h-32">
            <img
              src={image}
              alt="Preview"
              className="w-full h-full object-cover rounded-lg"
            />
            <button
              type="button"
              onClick={removeImage}
              className="absolute -top-2 -right-2 btn btn-circle btn-sm bg-base-100"
            >
              <X className="size-3" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              handleTyping();
            }}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="input input-bordered flex-1 text-sm sm:text-base"
          />
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageChange}
            accept="image/*"
            className="hidden"
          />
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-ghost btn-sm sm:btn-md"
            title="Add image"
          >
            <Image className="size-4 sm:size-5" />
          </button>

          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`btn btn-ghost btn-sm sm:btn-md ${showEmojiPicker ? 'bg-primary/20' : ''}`}
            title="Add emoji"
          >
            <Smile className="size-4 sm:size-5" />
          </button>
          
          <button
            type="submit"
            disabled={!text.trim() && !image}
            className="btn btn-primary btn-sm sm:btn-md"
            title="Send message"
          >
            <Send className="size-4 sm:size-5" />
          </button>
        </div>
      </form>

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="absolute bottom-full right-0 mb-2 p-3 bg-base-100 rounded-lg border border-base-300 shadow-lg max-h-48 overflow-y-auto w-64 z-20">
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

      {/* Click outside to close emoji picker */}
      {showEmojiPicker && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowEmojiPicker(false)}
        />
      )}
    </div>
  );
});

MessageInput.displayName = 'MessageInput';

export default MessageInput;
