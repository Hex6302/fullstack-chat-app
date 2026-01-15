import { useState, useEffect } from "react";
import { Users, MessageSquare } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import { useAuthStore } from "../store/useAuthStore";
import Sidebar from "./Sidebar";
import GroupSidebar from "./GroupSidebar";

const ChatSidebar = () => {
  const [activeTab, setActiveTab] = useState("chats");
  
  const { getFriends } = useChatStore();
  const { getUserGroups } = useGroupStore();
  const { authUser } = useAuthStore();

  useEffect(() => {
    getFriends();
    getUserGroups();
  }, [getFriends, getUserGroups]);

  return (
    <div className="flex flex-col h-full">
      {/* Tab Navigation */}
      <div className="flex border-b border-base-300">
        <button
          onClick={() => setActiveTab("chats")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors ${
            activeTab === "chats"
              ? "bg-primary text-primary-content border-b-2 border-primary"
              : "text-base-content/70 hover:text-base-content hover:bg-base-200"
          }`}
        >
          <MessageSquare className="size-4" />
          <span>Chats</span>
        </button>
        <button
          onClick={() => setActiveTab("groups")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors ${
            activeTab === "groups"
              ? "bg-primary text-primary-content border-b-2 border-primary"
              : "text-base-content/70 hover:text-base-content hover:bg-base-200"
          }`}
        >
          <Users className="size-4" />
          <span>Groups</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "chats" ? <Sidebar /> : <GroupSidebar />}
      </div>
    </div>
  );
};

export default ChatSidebar;

