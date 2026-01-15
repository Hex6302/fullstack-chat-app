import { Users, UserPlus, MailCheck } from "lucide-react";

const SidebarSkeleton = () => {
  // Create 6 skeleton items for a cleaner look
  const skeletonContacts = Array(6).fill(null);

  return (
    <div className="flex flex-col bg-base-100 rounded-lg shadow-lg">
      {/* Header Skeleton */}
      <div className="sticky top-0 z-10 bg-base-100 border-b border-base-300 p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="size-5" />
            <span className="text-base font-semibold">Chats</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="skeleton w-4 h-4 rounded" />
            <div className="skeleton w-16 h-3 rounded" />
          </div>
        </div>
        
        {/* Search Skeleton */}
        <div className="flex gap-2 mb-3">
          <div className="skeleton h-8 w-20 rounded-lg" />
          <div className="skeleton h-8 w-16 rounded-lg" />
        </div>
        
        {/* Friend Requests Skeleton */}
        <div className="p-2 bg-base-200/30 rounded-lg border border-base-300">
          <div className="flex items-center justify-between p-2">
            <div className="flex items-center gap-2">
              <MailCheck className="size-4 text-primary" />
              <div className="skeleton h-4 w-24 rounded" />
            </div>
            <div className="skeleton w-4 h-4 rounded" />
          </div>
        </div>
      </div>

      {/* Chat List Skeleton */}
      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-8rem)]">
        <div className="space-y-1">
          {skeletonContacts.map((_, idx) => (
            <div key={idx} className="w-full p-3 flex items-center gap-3 border-b border-base-200 animate-pulse">
              {/* Avatar skeleton */}
              <div className="flex-shrink-0">
                <div className="skeleton size-10 rounded-full" />
              </div>

              {/* User info skeleton */}
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-2 mb-1">
                  <div className="skeleton h-4 w-24 rounded" />
                  <div className="skeleton h-3 w-8 rounded" />
                  <div className="skeleton size-2 rounded-full" />
                </div>
                <div className="skeleton h-3 w-16 rounded" />
              </div>

              {/* Unread count skeleton */}
              <div className="flex-shrink-0">
                <div className="skeleton size-5 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SidebarSkeleton;
