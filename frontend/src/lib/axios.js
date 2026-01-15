import axios from "axios";

// Get API URL from environment variable or use default
const getApiUrl = () => {
  // In production, use environment variable or relative path
  if (import.meta.env.MODE === "production") {
    // If VITE_API_URL is set, use it; otherwise use relative path (same domain)
    return import.meta.env.VITE_API_URL || "/api";
  }
  // In development, use localhost
  return import.meta.env.VITE_API_URL || "http://localhost:5001/api";
};

export const axiosInstance = axios.create({
  baseURL: getApiUrl(),
  withCredentials: true,
});
