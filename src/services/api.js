// frontend/src/services/api.js

import axios from 'axios';

// Helper to ensure URL has trailing slash
const ensureTrailingSlash = (url) => url.endsWith('/') ? url : `${url}/`;

// Determine the base URL
const getBaseUrl = () => {
  return process.env.REACT_APP_API_URL || 'https://hiq-be.onrender.com';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Ensure paths are properly formatted
    if (!config.url.startsWith('/')) {
      config.url = `/${config.url}`;
    }

    // Ensure API prefix
    if (!config.url.startsWith('/api/')) {
      config.url = `/api${config.url}`;
    }

    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    console.error('API Error:', error.response?.data || error.message);

    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
      return Promise.reject(new Error('Session expired'));
    }

    // Enhance error messages
    const enhancedError = new Error(
      error.response?.data?.error?.message || 
      error.response?.data?.message || 
      error.message || 
      'An unexpected error occurred'
    );
    enhancedError.status = error.response?.status;
    enhancedError.data = error.response?.data;

    return Promise.reject(enhancedError);
  }
);

export default api;