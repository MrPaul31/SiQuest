import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const SERVER_BACKEND = process.env.REACT_APP_SERVER_BACKEND;
console.log('Server Backend URL:', SERVER_BACKEND);

export const endpoint = axios.create({
  baseURL: SERVER_BACKEND,
});

// Interceptor to include the token in requests
endpoint.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to handle session expiration
endpoint.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Only redirect if not already on the login page.
      if (window.location.pathname !== "/login") {
        localStorage.removeItem('token');
        // Dispatch session expired event
        window.dispatchEvent(new Event('sessionExpired'));
      }
    }
    return Promise.reject(error);
  }
);

// Add this array of public routes
const publicRoutes = [
  '/login',
  '/register',
  '/questionari',  // This will match all /questionari/xxx routes
  '/conferma'
];

// Updated helper function to check if current route is public
const isPublicRoute = (path) => {
  // Check exact matches first
  if (publicRoutes.includes(path)) {
    return true;
  }
  
  // Check for nested routes (like /questionari/123)
  for (const route of publicRoutes) {
    if (path.startsWith(route + '/')) {
      return true;
    }
  }
  
  return false;
};

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [permissions, setPermissions] = useState({}); // state for permissions
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const navigate = useNavigate();

  // Modify the checkToken function
  const checkToken = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsAuthenticated(false);
      setSessionExpired(true);
      return false;
    }
    return true;
  };

  // On startup, if a token exists, set the state and attempt to retrieve permissions
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
      // Optionally, you can fetch permissions here if needed
    }
    setLoading(false);
  }, []);

  // Update the handleSessionExpired function in your useEffect
  useEffect(() => {
    // Initial check when component mounts
    const hasToken = checkToken();
    if (!hasToken && !isPublicRoute(window.location.pathname)) {
      alert("Sessione scaduta. Effettuare nuovamente il login.");
      navigate('/login');
    }
    
    // Function to handle session expiration
    const handleSessionExpired = () => {
      setIsAuthenticated(false);
      setSessionExpired(true);
      
      // Only show alert if not on a public route
      if (!isPublicRoute(window.location.pathname)) {
        alert("Sessione scaduta. Effettuare nuovamente il login.");
        navigate('/login');
      }
    };
    
    window.addEventListener('sessionExpired', handleSessionExpired);
    
    // Check token periodically (every minute)
    const interval = setInterval(() => {
      if (!checkToken() && !isPublicRoute(window.location.pathname)) {
        alert("Sessione scaduta. Effettuare nuovamente il login.");
        navigate('/login');
      }
    }, 60000);
    
    return () => {
      window.removeEventListener('sessionExpired', handleSessionExpired);
      clearInterval(interval);
    };
  }, [navigate]);

  // Function for login: expects the backend to return { token, permissions }
  const login = async (username, password) => {
    try {
      const response = await endpoint.post('/api/autenticazione/login', { username, password });
      // Assuming the backend returns { token, permissions }
      const { token, permissions } = response.data;
      localStorage.setItem('token', token);
      setIsAuthenticated(true);
      setSessionExpired(false);
      setPermissions(permissions);
    } catch (error) {
      console.error('Login error:', error);
      // Handle error messages to show in the Login component
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setPermissions({});
  };

  // New registration function that posts to /register endpoint
  const register = async (username, password, email) => {
    try {
      const response = await endpoint.post('/api/autenticazione/register', { username, password, email });
      // Auto-login after successful registration
      const { token, permissions } = response.data;
      localStorage.setItem('token', token);
      setIsAuthenticated(true);
      setSessionExpired(false);
      setPermissions(permissions);
    } catch (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, sessionExpired, loading, login, logout, register, permissions }}>
      {children}
    </AuthContext.Provider>
  );
};