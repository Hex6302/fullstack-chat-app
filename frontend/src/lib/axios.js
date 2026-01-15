import axios from "axios";

// Get API URL from environment variable or use default
const getApiUrl = () => {
  if (import.meta.env.MODE === "production") {
    return import.meta.env.VITE_API_URL || "/api";
  }
  return import.meta.env.VITE_API_URL || "http://localhost:5001/api";
};

export const axiosInstance = axios.create({
  baseURL: getApiUrl(),
  withCredentials: true,
});

// Add token to requests from localStorage (for mobile)
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Save token from response headers
axiosInstance.interceptors.response.use((response) => {
  const token = response.headers["x-auth-token"];
  if (token) {
    localStorage.setItem("token", token);
  }
  return response;
});
