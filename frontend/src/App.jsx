import Navbar from "./components/Navbar";

import HomePage from "./pages/HomePage";
import SignUpPage from "./pages/SignUpPage";
import LoginPage from "./pages/LoginPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import GroupProfilePage from "./pages/GroupProfilePage";

import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/useAuthStore";
import { useThemeStore } from "./store/useThemeStore";
import { useChatStore } from "./store/useChatStore";
import { useGroupStore } from "./store/useGroupStore";
import { useNotificationStore } from "./store/useNotificationStore";
import { useEffect } from "react";

import { Loader } from "lucide-react";
import { Toaster } from "react-hot-toast";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./styles/modern-toast.css";
import offlineManager from "./lib/offlineManager";

const App = () => {
  const { authUser, checkAuth, isCheckingAuth, onlineUsers } = useAuthStore();
  const { theme } = useThemeStore();
  const { selectedUser } = useChatStore();
  const { selectedGroup } = useGroupStore();
  const { initNotifications } = useNotificationStore();

  console.log({ onlineUsers });

  useEffect(() => {
    checkAuth();
    initNotifications();
    offlineManager.initializeBatteryOptimization();
  }, [checkAuth, initNotifications]);

  console.log({ authUser });

  if (isCheckingAuth && !authUser)
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="size-10 animate-spin" />
      </div>
    );

  const hasSelectedChat = selectedUser || selectedGroup;

  return (
    <div data-theme={theme}>
      {!hasSelectedChat && <Navbar />}

      <Routes>
        <Route path="/" element={authUser ? <HomePage /> : <Navigate to="/login" />} />
        <Route path="/signup" element={!authUser ? <SignUpPage /> : <Navigate to="/" />} />
        <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to="/" />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile" element={authUser ? <ProfilePage /> : <Navigate to="/login" />} />
        <Route path="/group-profile/:groupId" element={authUser ? <GroupProfilePage /> : <Navigate to="/login" />} />
      </Routes>

      <Toaster />
      <ToastContainer
        position="top-right"
        autoClose={6000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        limit={5}
        toastClassName="modern-toast"
        bodyClassName="modern-toast-body"
        progressClassName="modern-toast-progress"
      />
    </div>
  );
};
export default App;
