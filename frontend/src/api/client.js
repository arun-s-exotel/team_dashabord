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
  create: (data) => client.post('/users', data),
  update: (id, data) => client.put(`/users/${id}`, data),
  delete: (id) => client.delete(`/users/${id}`)
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

export const workStatus = {
  getAll: (params) => client.get('/work-status', { params }),
  update: (data) => client.put('/work-status', data),
  bulkUpdate: (data) => client.put('/work-status/bulk', data),
  delete: (date) => client.delete(`/work-status/${date}`)
};

export const reports = {
  getSummary: (params) => client.get('/reports/summary', { params }),
  exportCSV: (params) => client.get('/reports/export', { params, responseType: 'blob' })
};

export default client;
