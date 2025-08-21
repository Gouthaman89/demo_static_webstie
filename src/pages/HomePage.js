import React, { useEffect } from 'react'; // Import useEffect
import { useAuth } from '../components/AuthContext';
import { useHistory } from 'react-router-dom';
import i18n from '../i18n';

export default function HomePage() {
  const { token } = useAuth();
  const history = useHistory();
  const t = (key) => (i18n && typeof i18n.t === 'function' ? i18n.t(key) : key);

  useEffect(() => {
    // If the user is not authenticated, redirect to the login page
    if (!token) {
      history.push('/login');
    }
  }, [token, history]);

  // Only render the home page if the user is authenticated
  if (!token) {
    return null; // Prevent rendering while checking authentication
  }

  return (
    <div>
      <h1>{t('home')}</h1>
    </div>
  );
}