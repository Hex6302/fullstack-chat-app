const DRAFT_KEY_PREFIX = "hexchat_draft_";

export const saveDraft = (chatId, chatType, draftText, draftImage = null) => {
  const key = `${DRAFT_KEY_PREFIX}${chatType}_${chatId}`;
  const draft = {
    text: draftText,
    image: draftImage,
    timestamp: Date.now(),
  };

  localStorage.setItem(key, JSON.stringify(draft));
};

export const getDraft = (chatId, chatType) => {
  const key = `${DRAFT_KEY_PREFIX}${chatType}_${chatId}`;
  const stored = localStorage.getItem(key);
  
  if (!stored) return null;
  
  const draft = JSON.parse(stored);
  
  // Check if draft is older than 30 days
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  if (draft.timestamp < thirtyDaysAgo) {
    clearDraft(chatId, chatType);
    return null;
  }
  
  return draft;
};

export const clearDraft = (chatId, chatType) => {
  const key = `${DRAFT_KEY_PREFIX}${chatType}_${chatId}`;
  localStorage.removeItem(key);
};

export const getAllDrafts = () => {
  const drafts = [];
  const keys = Object.keys(localStorage);
  
  keys.forEach((key) => {
    if (key.startsWith(DRAFT_KEY_PREFIX)) {
      const chatInfo = key.replace(DRAFT_KEY_PREFIX, "").split("_");
      const chatType = chatInfo[0];
      const chatId = chatInfo[1];
      const draft = JSON.parse(localStorage.getItem(key));
      
      drafts.push({
        chatId,
        chatType,
        ...draft,
      });
    }
  });
  
  return drafts;
};











