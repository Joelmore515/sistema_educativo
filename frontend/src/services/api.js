import axios from 'axios';

const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.includes('localhost')) {
    return import.meta.env.VITE_API_URL;
  }
  return `http://${window.location.hostname}:5000/api`;
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
