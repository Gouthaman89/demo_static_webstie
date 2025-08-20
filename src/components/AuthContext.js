// src/components/AuthContext.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useHistory, useLocation } from 'react-router-dom';

const API_BASE =
  process.env.REACT_APP_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || '';

export const AuthContext = React.createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [personId, setPersonId] = useState(null);
  const [reportId, setReportId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const history = useHistory();
  const location = useLocation();

  const logout = useCallback(() => {
    setToken(null);
    setPersonId(null);
    setProfile(null);
    setReportId(null);
    localStorage.removeItem('token');
    localStorage.removeItem('personId');
    localStorage.removeItem('reportId');
    history.push('/login');
  }, [history]);

  const fetchProfile = useCallback(
    async (tok, pid) => {
      try {
        const resp = await axios.post(
          `${API_BASE}/profile`,
          { personid: pid },
          { headers: { Authorization: `Bearer ${tok}` } }
        );
        setProfile(resp.data?.[0] ?? null);
      } catch (err) {
        console.error('Error fetching profile:', err);
        logout(); // token invalid or request failed
      } finally {
        setLoading(false);
      }
    },
    [logout]
  );

  // Initialize auth state
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedPersonId = localStorage.getItem('personId');
    const savedReportId = localStorage.getItem('reportId');

    if (savedToken && savedPersonId) {
      setToken(savedToken);
      setPersonId(savedPersonId);
      setReportId(savedReportId);

      // Only fetch if we don't already have a profile
      if (!profile) {
        fetchProfile(savedToken, savedPersonId);
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
      if (location.pathname !== '/login') {
        history.push('/login');
      }
    }
    // Include fetchProfile and history to satisfy exhaustive-deps
  }, [location, profile, fetchProfile, history]);

  const login = useCallback(
    (newToken, newPersonId) => {
      setToken(newToken);
      setPersonId(newPersonId);
      localStorage.setItem('token', newToken);
      localStorage.setItem('personId', newPersonId);
      fetchProfile(newToken, newPersonId);
      history.push('/profile');
    },
    [fetchProfile, history]
  );

  return (
    <AuthContext.Provider
      value={{
        token,
        personId,
        reportId,
        profile,
        loading,
        login,
        logout,
        setReportId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => React.useContext(AuthContext);