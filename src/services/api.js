// frontend/src/services/api.js

import axios from 'axios';

// Helper to ensure URL has trailing slash
const ensureTrailingSlash = (url) => url.endsWith('/') ? url : `${url}/`;

// Determine the base URL with validation
const getBaseUrl = () => {
  const url = process.env.REACT_APP_API_URL || 'https://hiq-be.onrender.com';
  console.log('API Base URL:', url);
  return ensureTrailingSlash(url);
};

// Configure axios instance
const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true, // Important for CORS
});

// Enhanced request interceptor
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

    // Log request details in development
    if (process.env.NODE_ENV === 'development') {
      console.log('API Request:', {
        url: config.url,
        method: config.method,
        data: config.data,
        headers: config.headers
      });
    }

    return config;
  },
  (error) => {
    console.error('Request error:', {
      message: error.message,
      config: error.config
    });
    return Promise.reject(error);
  }
);

// Enhanced response interceptor
api.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    if (process.env.NODE_ENV === 'development') {
      console.log('API Response:', {
        url: response.config.url,
        status: response.status,
        data: response.data
      });
    }
    return response;
  },
  async (error) => {
    // Enhanced error logging
    console.error('API Error Details:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers,
        baseURL: error.config?.baseURL
      }
    });

    // Handle specific error types
    if (!error.response) {
      // Network error
      return Promise.reject(new Error('Network error - Unable to connect to the server'));
    }

    // Handle 401 Unauthorized
    if (error.response.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
      return Promise.reject(new Error('Session expired - Please log in again'));
    }

    // Handle CORS errors
    if (error.message.includes('CORS')) {
      console.error('CORS Error Details:', {
        origin: window.location.origin,
        target: error.config?.url
      });
      return Promise.reject(new Error('Cross-origin request blocked - Please contact support'));
    }

    // Handle rate limiting
    if (error.response.status === 429) {
      return Promise.reject(new Error('Too many requests - Please try again later'));
    }

    // Handle validation errors
    if (error.response.status === 400) {
      return Promise.reject(new Error(error.response.data.error || 'Validation error'));
    }

    // Create enhanced error object
    const enhancedError = new Error(
      error.response?.data?.error?.message || 
      error.response?.data?.message || 
      error.message || 
      'An unexpected error occurred'
    );
    
    // Add additional error properties
    enhancedError.status = error.response?.status;
    enhancedError.data = error.response?.data;
    enhancedError.timestamp = new Date().toISOString();

    return Promise.reject(enhancedError);
  }
);

// Health check function
api.checkHealth = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    console.error('Health check failed:', error);
    throw error;
  }
};

export default api;