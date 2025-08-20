import './styles/globals.css';
import Layout from './components/Layout';
import { AuthProvider, useAuth } from './components/AuthContext';
import { GlobalProvider } from './components/GlobalContext';
import { useEffect } from 'react';
import { useHistory } from 'react-router-dom';

function AuthRedirect({ children }) {
  const { token, loading } = useAuth();
  const history = useHistory();

  useEffect(() => {
    if (!loading) {
      if (!token && history.location.pathname !== '/login') {
        // Redirect to login if not authenticated
        history.push('/login');
      } else if (token && history.location.pathname === '/') {
        // Redirect to profile page if authenticated and on the root page
        history.push('/profile');
      }
    }
  }, [token, loading, history]);

  if (loading) {
    // Use a more user-friendly loading indicator, like a spinner
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        Loading...
      </div>
    );
  }

  return children; // Render children when not loading
}

function MyApp({ Component, pageProps }) {
  const getLayout = Component.getLayout || ((page) => <Layout>{page}</Layout>);

  return (
    <AuthProvider>
      <GlobalProvider>
        <AuthRedirect>
          {getLayout(<Component {...pageProps} />)}
        </AuthRedirect>
      </GlobalProvider>
    </AuthProvider>
  );
}

export default MyApp;