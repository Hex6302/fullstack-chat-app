// Utility functions for online status display

export const getOnlineStatusColor = (isOnline, isRecentlyOffline) => {
  if (isOnline) {
    return 'bg-green-500 animate-pulse';
  } else if (isRecentlyOffline) {
    return 'bg-blue-500';
  } else {
    return 'bg-gray-400';
  }
};

export const getOnlineStatusText = (isOnline, isRecentlyOffline) => {
  if (isOnline) {
    return 'Online';
  } else if (isRecentlyOffline) {
    return 'Recently offline';
  } else {
    return 'Offline';
  }
};

export const getOnlineStatusDot = (isOnline, isRecentlyOffline, size = 'w-2 h-2') => {
  const colorClass = getOnlineStatusColor(isOnline, isRecentlyOffline);
  return (
    <div className={`${size} rounded-full ${colorClass}`}></div>
  );
};

export const formatLastSeen = (lastSeenTimestamp) => {
  if (!lastSeenTimestamp) return 'Never';
  
  const now = Date.now();
  const diff = now - lastSeenTimestamp;
  
  // Less than 1 minute
  if (diff < 60000) {
    return 'Just now';
  }
  
  // Less than 1 hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  }
  
  // Less than 24 hours
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  
  // More than 24 hours
  const days = Math.floor(diff / 86400000);
  return `${days} day${days > 1 ? 's' : ''} ago`;
};

