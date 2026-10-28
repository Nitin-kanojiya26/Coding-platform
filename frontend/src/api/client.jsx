import axios from 'axios';
import { toast } from 'react-hot-toast';

// In production, fallback to relative '/api' if VITE_API_URL is not set.
// In dev, fallback to 'http://localhost:5000/api'.
const resolveBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (import.meta.env.PROD) {
    return '/api';
  }
  return 'http://localhost:5000/api';
};

const api = axios.create({
  baseURL: resolveBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
    }
    if (error.response?.status === 429) {
      toast.error(error.response?.data?.message || 'Too many requests. Please try again later.');
    }
    if (error.response?.status === 503) {
      toast.error(
        error.response?.data?.message ||
          'The code execution engine is temporarily offline. Please try again shortly.',
        { id: 'service-unavailable-toast' }
      );
    }
    return Promise.reject(error);
  }
);

export default api;