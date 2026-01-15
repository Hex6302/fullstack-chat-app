import { useState, useEffect } from "react";
import { Activity, Database, Upload, Download, Trash2 } from "lucide-react";
import offlineManager from "../lib/offlineManager";

const BandwidthMonitor = ({ isOpen, onClose }) => {
  const [usage, setUsage] = useState({ sent: 0, received: 0 });
  const [stats, setStats] = useState({
    totalMessages: 0,
    totalImages: 0,
    avgMessageSize: 0,
  });

  useEffect(() => {
    if (isOpen) {
      const bandwidthUsage = offlineManager.getBandwidthUsage();
      setUsage(bandwidthUsage);
    }
  }, [isOpen]);

  const handleClearStats = () => {
    offlineManager.resetBandwidthUsage();
    setUsage({ sent: 0, received: 0 });
  };

  if (!isOpen) return null;

  const totalBandwidth = usage.sent + usage.received;
  const sentPercent = totalBandwidth > 0 ? (usage.sent / totalBandwidth) * 100 : 50;
  const receivedPercent = totalBandwidth > 0 ? (usage.received / totalBandwidth) * 100 : 50;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <div className="flex items-center gap-2">
            <Activity className="size-5" />
            <h3 className="text-lg font-semibold">Bandwidth Usage</h3>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Upload Bandwidth */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Upload className="size-4 text-blue-500" />
                <span className="text-sm font-medium">Uploaded</span>
              </div>
              <span className="text-sm font-bold">
                {offlineManager.formatBandwidth(usage.sent)}
              </span>
            </div>
            <div className="w-full bg-base-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${sentPercent}%` }}
              />
            </div>
          </div>

          {/* Download Bandwidth */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Download className="size-4 text-green-500" />
                <span className="text-sm font-medium">Downloaded</span>
              </div>
              <span className="text-sm font-bold">
                {offlineManager.formatBandwidth(usage.received)}
              </span>
            </div>
            <div className="w-full bg-base-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${receivedPercent}%` }}
              />
            </div>
          </div>

          {/* Total */}
          <div className="pt-3 border-t border-base-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="size-4 text-primary" />
                <span className="text-sm font-medium">Total Bandwidth</span>
              </div>
              <span className="text-sm font-bold text-primary">
                {offlineManager.formatBandwidth(totalBandwidth)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleClearStats}
              className="btn btn-outline btn-error btn-sm flex-1"
            >
              <Trash2 className="size-4" />
              Clear Stats
            </button>
          </div>

          {/* Tips */}
          <div className="alert alert-info">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              className="stroke-current shrink-0 size-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-xs">
              This tracks data usage for messages sent and received in your chat app.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BandwidthMonitor;











