import { THEMES } from "../constants";
import { useThemeStore } from "../store/useThemeStore";
import { Send, Activity, Battery, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import BandwidthMonitor from "../components/BandwidthMonitor";
import offlineManager from "../lib/offlineManager";
import toast from "react-hot-toast";

const PREVIEW_MESSAGES = [
  { id: 1, content: "Hey! How's it going?", isSent: false },
  { id: 2, content: "I'm doing great! Just working on some new features.", isSent: true },
];

const SettingsPage = () => {
  const { theme, setTheme } = useThemeStore();
  const [showBandwidthMonitor, setShowBandwidthMonitor] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState(null);
  const [isCharging, setIsCharging] = useState(false);
  const [powerSavingMode, setPowerSavingMode] = useState(false);

  useEffect(() => {
    if ("getBattery" in navigator) {
      navigator.getBattery().then((battery) => {
        updateBatteryInfo(battery);
        addBatteryListeners(battery);
      });
    }
  }, []);

  const updateBatteryInfo = (battery) => {
    setBatteryLevel(Math.round(battery.level * 100));
    setIsCharging(battery.charging);

    // Enable power saving mode if battery is low
    if (battery.level < 0.2 && !battery.charging) {
      setPowerSavingMode(true);
    }
  };

  const addBatteryListeners = (battery) => {
    battery.addEventListener("levelchange", () => {
      updateBatteryInfo(battery);
    });

    battery.addEventListener("chargingchange", () => {
      updateBatteryInfo(battery);
    });
  };

  const enablePowerSavingMode = () => {
    setPowerSavingMode(true);
    document.body.classList.add("power-saving-mode");
    toast.success("🔋 Power saving mode enabled");
  };

  const disablePowerSavingMode = () => {
    setPowerSavingMode(false);
    document.body.classList.remove("power-saving-mode");
    toast.success("🔋 Power saving mode disabled");
  };

  return (
    <div className="h-screen container mx-auto px-4 pt-20 max-w-5xl">
      <div className="space-y-6">
        {/* Battery Status */}
        {batteryLevel !== null && (
          <div className="bg-base-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Battery className="size-5 text-primary" />
                <h2 className="text-lg font-semibold">Battery Status</h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">{batteryLevel}%</span>
                {isCharging && (
                  <span className="badge badge-success badge-sm">Charging</span>
                )}
              </div>
            </div>

            {/* Battery Progress */}
            <div className="w-full bg-base-300 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  batteryLevel < 20 ? "bg-error" : batteryLevel < 50 ? "bg-warning" : "bg-success"
                }`}
                style={{ width: `${batteryLevel}%` }}
              />
            </div>

            {/* Power Saving Mode */}
            <div className="flex items-center justify-between pt-2 border-t border-base-300">
              <div className="flex items-center gap-2">
                <Zap className={`size-4 ${powerSavingMode ? "text-warning" : "text-base-content/50"}`} />
                <span className="text-sm font-medium">Power Saving Mode</span>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={powerSavingMode}
                onChange={(e) => {
                  if (e.target.checked) {
                    enablePowerSavingMode();
                  } else {
                    disablePowerSavingMode();
                  }
                }}
              />
            </div>

            {batteryLevel < 20 && !isCharging && (
              <div className="alert alert-warning">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="stroke-current shrink-0 size-6"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span className="text-xs">Low battery. Power saving mode recommended.</span>
              </div>
            )}
          </div>
        )}

        {/* Advanced Settings */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">Advanced Settings</h2>
            <p className="text-sm text-base-content/70">Monitor bandwidth and optimize performance</p>
          </div>
          <button
            onClick={() => setShowBandwidthMonitor(true)}
            className="btn btn-outline btn-sm gap-2"
          >
            <Activity className="size-4" />
            Bandwidth Monitor
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Theme</h2>
          <p className="text-sm text-base-content/70">Choose a theme for your chat interface</p>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {THEMES.map((t) => (
            <button
              key={t}
              className={`
                group flex flex-col items-center gap-1.5 p-2 rounded-lg transition-colors
                ${theme === t ? "bg-base-200" : "hover:bg-base-200/50"}
              `}
              onClick={() => setTheme(t)}
            >
              <div className="relative h-8 w-full rounded-md overflow-hidden" data-theme={t}>
                <div className="absolute inset-0 grid grid-cols-4 gap-px p-1">
                  <div className="rounded bg-primary"></div>
                  <div className="rounded bg-secondary"></div>
                  <div className="rounded bg-accent"></div>
                  <div className="rounded bg-neutral"></div>
                </div>
              </div>
              <span className="text-[11px] font-medium truncate w-full text-center">
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </span>
            </button>
          ))}
        </div>

        {/* Preview Section */}
        <h3 className="text-lg font-semibold mb-3">Preview</h3>
        <div className="rounded-xl border border-base-300 overflow-hidden bg-base-100 shadow-lg">
          <div className="p-4 bg-base-200">
            <div className="max-w-lg mx-auto">
              {/* Mock Chat UI */}
              <div className="bg-base-100 rounded-xl shadow-sm overflow-hidden">
                {/* Chat Header */}
                <div className="px-4 py-3 border-b border-base-300 bg-base-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-content font-medium">
                      J
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">John Doe</h3>
                      <p className="text-xs text-base-content/70">Online</p>
                    </div>
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="p-4 space-y-4 min-h-[200px] max-h-[200px] overflow-y-auto bg-base-100">
                  {PREVIEW_MESSAGES.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.isSent ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`
                          max-w-[80%] rounded-xl p-3 shadow-sm
                          ${message.isSent ? "bg-primary text-primary-content" : "bg-base-200"}
                        `}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p
                          className={`
                            text-[10px] mt-1.5
                            ${message.isSent ? "text-primary-content/70" : "text-base-content/70"}
                          `}
                        >
                          12:00 PM
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chat Input */}
                <div className="p-4 border-t border-base-300 bg-base-100">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="input input-bordered flex-1 text-sm h-10"
                      placeholder="Type a message..."
                      value="This is a preview"
                      readOnly
                    />
                    <button className="btn btn-primary h-10 min-h-0">
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bandwidth Monitor Modal */}
      <BandwidthMonitor
        isOpen={showBandwidthMonitor}
        onClose={() => setShowBandwidthMonitor(false)}
      />
    </div>
  );
};
export default SettingsPage;
