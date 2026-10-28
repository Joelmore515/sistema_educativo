import { useState } from 'react';
import api from '../services/api';
import { AuthContext } from './authContextValue';

const isTokenExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return !payload.exp || payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
};

const getStoredUser = () => {
  const storedUser = localStorage.getItem('user');
  const token = localStorage.getItem('token');

  if (storedUser && token && !isTokenExpired(token)) {
    try {
      return JSON.parse(storedUser);
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return null;
    }
  }

  if (storedUser || token) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  return null;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getStoredUser);
  const loading = false;

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { token, user: loggedUser } = response.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(loggedUser));
    setUser(loggedUser);
    return loggedUser;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
