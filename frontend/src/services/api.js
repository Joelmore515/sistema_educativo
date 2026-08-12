import axios from 'axios';

const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, '');
  }

  const isLocalEnv = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  return isLocalEnv ? 'http://localhost:5000/api' : '/api';
};

const api = axios.create({
  baseURL: getBaseUrl(),
});
// Interceptor para añadir el token JWT a las peticiones
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
