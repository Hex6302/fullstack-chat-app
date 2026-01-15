import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import { useEffect } from "react";
import Navbar from "../components/Navbar";
import ChatSidebar from "../components/ChatSidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";
import GroupChatContainer from "../components/GroupChatContainer";

const HomePage = () => {
  const { selectedUser } = useChatStore();
  const { selectedGroup } = useGroupStore();

  // Add mobile-specific layout handling
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) { // Desktop
        document.body.classList.remove('mobile-chat-open');
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const hasSelectedChat = selectedUser || selectedGroup;

  return (
    <div className="min-h-screen bg-base-200">
      {/* Show navbar only when no chat is selected */}
      {!hasSelectedChat && (
        <div className="fixed top-0 left-0 right-0 z-50">
          <Navbar />
        </div>
      )}

      {/* Main content - adjust padding when navbar is visible */}
      <div className={`min-h-screen ${!hasSelectedChat ? 'pt-16' : ''}`}>
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="h-full">
            {/* Sidebar - only shown when no chat is selected */}
            {!hasSelectedChat && (
              <div className="h-full">
                <ChatSidebar />
              </div>
            )}

            {/* Chat Container - full width when chat is selected */}
            <div className="h-full">
              {selectedUser ? (
                <ChatContainer />
              ) : selectedGroup ? (
                <GroupChatContainer />
              ) : (
                <NoChatSelected />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
