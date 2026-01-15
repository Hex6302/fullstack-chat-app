const QUEUE_KEY = "hexchat_message_queue";
const MAX_QUEUE_SIZE = 100;

export const queueMessages = (message) => {
  const queue = getQueuedMessages();
  
  if (queue.length >= MAX_QUEUE_SIZE) {
    console.warn("Message queue is full. Removing oldest message.");
    queue.shift();
  }

  queue.push({
    id: Date.now() + Math.random(),
    ...message,
  });

  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

export const getQueuedMessages = () => {
  const stored = localStorage.getItem(QUEUE_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const removeQueuedMessage = (messageId) => {
  const queue = getQueuedMessages();
  const filtered = queue.filter((msg) => msg.id !== messageId);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
};

export const clearQueuedMessages = () => {
  localStorage.removeItem(QUEUE_KEY);
};











