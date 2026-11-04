import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('gymzone-token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// If any request gets 401, the token is stale — clear it and send to login.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('gymzone-token');
      localStorage.removeItem('gymzone-user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  return error.response?.data?.message || fallback;
}

export default api;
