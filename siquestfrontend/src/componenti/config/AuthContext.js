import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

// Create an axios instance with the base URL
const SERVER_BACKEND = process.env.REACT_APP_SERVER_BACKEND;
console.log('Server Backend URL:', SERVER_BACKEND);

export const endpoint = axios.create({
  baseURL: SERVER_BACKEND,
});

// Add a request interceptor to include the token in the headers
endpoint.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Create the AuthContext
export const AuthContext = createContext();

// Define the AuthProvider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check for token in localStorage when the component mounts
    const token = localStorage.getItem('token');
    if (token) {
      // Optionally, you can verify the token with the server here
      // For simplicity, we'll assume the token is valid and set the user state
      setUser({ token });
    }
  }, []);

  const login = async (username, password) => {
    try {
      const response = await endpoint.post('/login', { username, password });
      const { token } = response.data;
      // Store the token in localStorage
      localStorage.setItem('token', token);
      // Update the user state (you might need to adjust this based on your API response)
      setUser({ username });
    } catch (error) {
      console.error('Login error:', error);
      // Handle error (e.g., show error message to the user)
    }
  };

  const logout = () => {
    // Remove the token from localStorage
    localStorage.removeItem('token');
    // Reset the user state
    setUser(null);
  };

  // Provide the user object and authentication functions to the context
  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
