import React, { createContext, useState, useEffect, useContext } from 'react';
import API from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const res = await API.get('/auth/me');
      if (res.data && res.data.user) {
        setUser(res.data.user);
      }
    } catch (err) {
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    setLoading(false);
    try {
      const res = await API.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      setUser(res.data.user);
      return res.data;
    } catch (err) {
      throw err.response?.data?.message || 'Login failed';
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const registerRequestOTP = async (email, name, password) => {
    try {
      const res = await API.post('/auth/register', { email, name, password });
      return res.data;
    } catch (err) {
      throw err.response?.data?.message || 'Registration request failed';
    }
  };

  const verifyOTP = async (email, otp) => {
    try {
      const res = await API.post('/auth/verify-otp', { email, otp });
      localStorage.setItem('token', res.data.token);
      setUser(res.data.user);
      return res.data;
    } catch (err) {
      throw err.response?.data?.message || 'Verification failed';
    }
  };

  const updateProfileState = (updatedUser) => {
    setUser(updatedUser);
  };

  const refreshUser = fetchCurrentUser;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        registerRequestOTP,
        verifyOTP,
        updateProfileState,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);