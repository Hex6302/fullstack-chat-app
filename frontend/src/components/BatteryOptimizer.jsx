import { useState, useEffect } from "react";
import { Battery, BatteryLow, Zap, ZapOff } from "lucide-react";
import toast from "react-hot-toast";

const BatteryOptimizer = () => {
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
      enablePowerSavingMode();
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
    toast.success("🔋 Low battery - Power saving mode enabled");
    
    // Reduce background sync frequency
    // Disable unnecessary animations
    // Lower image quality requests
  };

  const disablePowerSavingMode = () => {
    setPowerSavingMode(false);
    document.body.classList.remove("power-saving-mode");
    toast.success("🔋 Power saving mode disabled");
  };

  if (batteryLevel === null) return null;

  const getBatteryIcon = () => {
    if (batteryLevel < 20) return <BatteryLow className="size-4 text-error" />;
    if (batteryLevel < 50) return <Battery className="size-4 text-warning" />;
    return <Battery className="size-4 text-success" />;
  };

  return (
    <div className="flex items-center gap-2">
      {getBatteryIcon()}
      <span className="text-xs font-medium">{batteryLevel}%</span>
      {powerSavingMode && (
        <Zap className="size-4 text-warning animate-pulse" title="Power saving mode" />
      )}
    </div>
  );
};

export default BatteryOptimizer;











