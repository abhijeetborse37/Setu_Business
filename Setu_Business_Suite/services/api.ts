import axios from 'axios';

// Determine API URL based on environment
const getAPIUrl = (): string => {
  // For development: check if we're accessing from localhost or a network IP
  const hostname = window.location.hostname;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Direct localhost access
    return 'http://localhost:5039/api';
  } else {
    // Network access from mobile or other device - replace localhost with the actual hostname
    return `http://${hostname}:5039/api`;
  }
};

const API_URL = getAPIUrl();

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const userString = localStorage.getItem('setu_user');
  if (userString) {
    const { token } = JSON.parse(userString);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export const authService = {
  login: (credentials: any) => api.post('/auth/login', credentials),
  createUser: (data: any) => api.post('/auth/create-user', data),
  requestOtp: (data: any) => api.post('/auth/request-otp', data),
  updateProfile: (data: any) => api.post('/auth/update-profile', data),
  setUserTabs: (userId: string, allowedTabsPattern: string) =>
    api.put(`/auth/users/${userId}/tabs`, { allowedTabsPattern }),
};

export const companyService = {
  getAll: () => api.get('/companies'),
  create: (data: any) => api.post('/companies', data),
  update: (id: string, data: any) => api.put(`/companies/${id}`, data),
  delete: (id: string) => api.delete(`/companies/${id}`),
};

export const customerService = {
  getAll: () => api.get('/customers'),
  create: (data: any) => api.post('/customers', data),
  update: (id: string, data: any) => api.put(`/customers/${id}`, data),
  delete: (id: string) => api.delete(`/customers/${id}`),
};

export const productService = {
  getByCompany: (companyId: string) => api.get(`/products/${companyId}`),
  create: (data: any) => api.post('/products', data),
  update: (id: string, data: any) => api.put(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
};

export const transactionService = {
  getByCompany: (companyId: string) => api.get(`/transactions/${companyId}`),
  create: (data: any) => api.post('/transactions', data),
  update: (id: string, data: any) => api.put(`/transactions/${id}`, data),
  delete: (id: string) => api.delete(`/transactions/${id}`),
};

export const subscriptionService = {
  getPlans: () => api.get('/subscription/plans'),
  getStatus: () => api.get('/subscription/status'),
  requestSubscription: (planId: string) => api.post('/subscription/request', { planId }),
};

export const adminService = {
  getStats: () => api.get('/admin/stats'),
  getUsers: () => api.get('/admin/users'),
  getPendingSubscriptions: () => api.get('/admin/subscriptions/pending'),
  approveSubscription: (id: string) => api.post(`/admin/subscriptions/${id}/approve`),
  rejectSubscription: (id: string) => api.post(`/admin/subscriptions/${id}/reject`),
  createSubscription: (data: any) => api.post('/admin/subscriptions/create', data),
  registerCompanyForUser: (data: any) => api.post('/admin/companies/register', data),
  getPlans: () => api.get('/admin/plans'),
  createPlan: (plan: any) => api.post('/admin/plans', plan),
  updatePlan: (id: string, plan: any) => api.put(`/admin/plans/${id}`, plan),
  deletePlan: (id: string) => api.delete(`/admin/plans/${id}`),
  toggleUserStatus: (userId: string) => api.post(`/admin/users/${userId}/toggle-status`),
  resetUserPassword: (userId: string, newPassword: string) => api.post(`/admin/users/${userId}/reset-password`, { newPassword }),
};

export default api;
