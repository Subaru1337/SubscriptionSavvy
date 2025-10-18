import axios from 'axios';

// IMPORTANT: Make sure this URL matches your running Flask backend
const API_BASE_URL = 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// Interceptor to add the auth token to every request if it exists
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth endpoints
export const registerUser = (data) => apiClient.post('/auth/register', data);
export const loginUser = (data) => apiClient.post('/auth/login', data);
export const getCurrentUser = () => apiClient.get('/auth/me');

// Subscription endpoints
export const getSubscriptions = () => apiClient.get('/subscriptions');
export const createSubscription = (data) => apiClient.post('/subscriptions', data);
export const updateSubscription = (id, data) => apiClient.put(`/subscriptions/${id}`, data);
export const deleteSubscription = (id) => apiClient.delete(`/subscriptions/${id}`);
export const markSubscriptionAsPaid = (id) => apiClient.post(`/subscriptions/${id}/pay`);

// Analytics endpoints
export const getAnalyticsSummary = () => apiClient.get('/analytics/summary');
export const getCategoryBreakdown = () => apiClient.get('/analytics/category-breakdown');

// Export endpoints
export const exportToCSV = () => apiClient.get('/export/csv', { responseType: 'blob' });
export const exportToPDF = () => apiClient.get('/export/pdf', { responseType: 'blob' });