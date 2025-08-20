import React, { Suspense } from 'react';
import { Switch, Route, Redirect } from 'react-router-dom';
import { useAuth } from './components/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/profile';
import UnderConstruction from './pages/UnderConstruction';

// A wrapper for <Route> that redirects to the login
// screen if you're not yet authenticated.
function PrivateRoute({ children, ...rest }) {
  let auth = useAuth();
  return (
    <Route
      {...rest}
      render={({ location }) =>
        auth.token ? (
          children
        ) : (
          <Redirect
            to={{
              pathname: '/login',
              state: { from: location },
            }}
          />
        )
      }
    />
  );
}

function App() {
  return (
    <Layout>
      <Suspense fallback={<div>Loading...</div>}>
        <Switch>
          <Route path="/login">
            <LoginPage />
          </Route>
          <PrivateRoute path="/profile">
            <ProfilePage />
          </PrivateRoute>
          <Route path="*">
            <UnderConstruction />
          </Route>
        </Switch>
      </Suspense>
    </Layout>
  );
}

export default App;