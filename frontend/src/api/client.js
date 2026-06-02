import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const client = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const auth = {
  register: (data) => client.post('/auth/register', data),
  login: (data) => client.post('/auth/login', data),
  me: () => client.get('/auth/me')
};

export const users = {
  getAll: () => client.get('/users'),
  update: (id, data) => client.put(`/users/${id}`, data),
  delete: (id) => client.delete(`/users/${id}`)
};

export const allowedEmails = {
  getAll: () => client.get('/allowed-emails'),
  add: (data) => client.post('/allowed-emails', data),
  update: (id, data) => client.put(`/allowed-emails/${id}`, data),
  remove: (id) => client.delete(`/allowed-emails/${id}`)
};

export const shifts = {
  getAll: () => client.get('/shifts'),
  create: (data) => client.post('/shifts', data),
  update: (id, data) => client.put(`/shifts/${id}`, data),
  delete: (id) => client.delete(`/shifts/${id}`)
};

export const schedules = {
  getAll: (params) => client.get('/schedules', { params }),
  bulkAssign: (data) => client.post('/schedules/bulk', data),
  delete: (id) => client.delete(`/schedules/${id}`)
};

export const reports = {
  nightShift: (params) => client.get('/reports/night-shift', { params }),
  nightShiftExport: (params) => client.get('/reports/night-shift/export', { params, responseType: 'blob' })
};

export const auditLogs = {
  list: (params) => client.get('/audit-logs', { params }),
  actions: () => client.get('/audit-logs/actions')
};

export default client;
