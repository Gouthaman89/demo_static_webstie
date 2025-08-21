import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import apiClient from '../utils/apiclient';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [personId, setPersonId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [reportId, setReportId] = useState(null);
  const [loading, setLoading] = useState(true); // To manage loading state for profile fetching
  const history = useHistory();
  const location = useLocation();

  const fetchProfile = useCallback(async (tok, pid) => {
    try {
      const response = await apiClient.post('/profile', { personid: pid });
      setProfile(response[0]);
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Clear auth and redirect without calling logout to avoid hook deps loop
      setToken(null);
      setPersonId(null);
      setProfile(null);
      setReportId(null);
      localStorage.removeItem('token');
      localStorage.removeItem('personId');
      localStorage.removeItem('reportId');
      history.push('/login');
    } finally {
      setLoading(false);
    }
  }, [history]);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedPersonId = localStorage.getItem('personId');
    const savedReportId = localStorage.getItem('reportId');

    if (savedToken && savedPersonId) {
      setToken(savedToken);
      setPersonId(savedPersonId);
      setReportId(savedReportId);

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
  }, [location, profile, history, fetchProfile]);

  const login = (newToken, newPersonId) => {
    setToken(newToken);
    setPersonId(newPersonId);
    localStorage.setItem('token', newToken);
    localStorage.setItem('personId', newPersonId);
    fetchProfile(newToken, newPersonId);
    history.push('/profile');
  };

  const setGlobalReportId = (newReportId) => {
    setReportId(newReportId);
    localStorage.setItem('reportId', newReportId);
  };

  const logout = () => {
    setToken(null);
    setPersonId(null);
    setProfile(null);
    setReportId(null);
    localStorage.removeItem('token');
    localStorage.removeItem('personId');
    localStorage.removeItem('reportId');
    history.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        personId,
        profile,
        reportId,
        login,
        logout,
        setGlobalReportId,
        loading,
      }}
    >
      {!loading ? children : <div>Loading...</div>} {/* Display a loading indicator or skeleton while loading */}
    </AuthContext.Provider>
  );
}
