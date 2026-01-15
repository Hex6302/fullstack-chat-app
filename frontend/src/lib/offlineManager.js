import { queueMessages, getQueuedMessages, removeQueuedMessage, clearQueuedMessages } from "./messageQueue";
import { saveDraft, getDraft, clearDraft } from "./draftManager";

class OfflineManager {
  constructor() {
    this.onlineStatus = navigator.onLine;
    this.initializeListeners();
  }

  initializeListeners() {
    window.addEventListener("online", () => {
      console.log("🌐 Connection restored!");
      this.onlineStatus = true;
      this.processQueuedMessages();
    });

    window.addEventListener("offline", () => {
      console.log("📴 Connection lost");
      this.onlineStatus = false;
    });
  }

  isOnline() {
    return navigator.onLine;
  }

  async processQueuedMessages() {
    if (!this.isOnline()) {
      console.log("📴 Still offline, waiting for connection...");
      return;
    }

    const queuedMessages = getQueuedMessages();
    console.log(`📨 Processing ${queuedMessages.length} queued messages...`);

    for (const message of queuedMessages) {
      try {
        // Import dynamic axios instance
        const { axiosInstance } = await import("./axios");
        await axiosInstance.post(message.endpoint, message.data);
        
        console.log(`✅ Sent queued message:`, message.id);
        removeQueuedMessage(message.id);
      } catch (error) {
        console.error(`❌ Failed to send queued message:`, error);
      }
    }

    if (queuedMessages.length > 0) {
      console.log(`📨 Finished processing queued messages`);
    }
  }

  async sendMessage(messageData, endpoint) {
    if (this.isOnline()) {
      try {
        // Try to send immediately
        const { axiosInstance } = await import("./axios");
        await axiosInstance.post(endpoint, messageData);
        return true;
      } catch (error) {
        // If sending fails and we're online, might be a server error
        console.error("Failed to send message:", error);
        return false;
      }
    } else {
      // Queue message for later
      queueMessages({ data: messageData, endpoint, timestamp: Date.now() });
      console.log("📴 Message queued for offline delivery");
      return false;
    }
  }

  getQueuedCount() {
    return getQueuedMessages().length;
  }

  clearQueue() {
    clearQueuedMessages();
  }

  // Battery optimization
  initializeBatteryOptimization() {
    if ("getBattery" in navigator) {
      navigator.getBattery().then((battery) => {
        console.log(`🔋 Battery level: ${Math.round(battery.level * 100)}%`);
        
        battery.addEventListener("levelchange", () => {
          const level = Math.round(battery.level * 100);
          console.log(`🔋 Battery level changed: ${level}%`);
          
          if (level < 20) {
            console.log("🔋 Low battery - enabling power saving mode");
            this.enablePowerSavingMode();
          } else if (level > 50) {
            console.log("🔋 Battery OK - disabling power saving mode");
            this.disablePowerSavingMode();
          }
        });
      });
    }
  }

  enablePowerSavingMode() {
    // Reduce background sync frequency
    // Disable unnecessary animations
    // Lower image quality
    document.body.classList.add("power-saving-mode");
  }

  disablePowerSavingMode() {
    document.body.classList.remove("power-saving-mode");
  }

  // Bandwidth monitoring
  getBandwidthUsage() {
    const stored = localStorage.getItem("bandwidthUsage");
    return stored ? JSON.parse(stored) : { sent: 0, received: 0 };
  }

  trackBandwidth(dataSize, direction = "sent") {
    const usage = this.getBandwidthUsage();
    usage[direction] += dataSize;
    localStorage.setItem("bandwidthUsage", JSON.stringify(usage));
  }

  resetBandwidthUsage() {
    localStorage.setItem("bandwidthUsage", JSON.stringify({ sent: 0, received: 0 }));
  }

  formatBandwidth(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  }
}

export default new OfflineManager();











