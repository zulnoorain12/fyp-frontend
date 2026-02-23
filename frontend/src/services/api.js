import axios from 'axios';

// Base API configuration
const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API Endpoints
export const apiEndpoints = {
  // Health check
  health: () => api.get('/'),

  // Models
  getModels: () => api.get('/models'),
  switchModel: (modelName) => {
    const formData = new FormData();
    formData.append('model_name', modelName);
    return api.post('/models/switch', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Detection
  detectObjects: (formData) => api.post('/detect', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  detectBoth: (formData) => api.post('/detect/both', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  detectFight: (formData) => api.post('/detect/fight', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  detectFightStream: (formData) => api.post('/detect/fight/stream', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),

  // Fight detection control
  resetFightBuffer: () => api.post('/fight/reset'),

  // Detections
  getDetections: (limit = 50) => api.get(`/detections?limit=${limit}`),
  getDetectionById: (id) => api.get(`/detections/${id}`),

  // Mark as read
  markDetectionRead: (id) => api.patch(`/detections/${id}/read`),
  markAllDetectionsRead: () => api.patch('/detections/read-all'),
};

export default api;
