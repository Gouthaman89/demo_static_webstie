import React, { useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { makeStyles } from '@material-ui/core/styles';
import { Box, Button, TextField, Typography, Paper, CircularProgress } from '@material-ui/core';

const useStyles = makeStyles((theme) => ({
  '@keyframes gradientAnimation': {
    '0%': { backgroundPosition: '0% 50%' },
    '50%': { backgroundPosition: '100% 50%' },
    '100%': { backgroundPosition: '0% 50%' },
  },
  '@keyframes float': {
    '0%': { transform: 'translateY(0px)' },
    '50%': { transform: 'translateY(-20px)' },
    '100%': { transform: 'translateY(0px)' },
  },
  rootContainer: {
    height: '100vh',
    width: '100vw',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 0,
    padding: 0,
    overflow: 'hidden',
    background: 'linear-gradient(-45deg, #0f2027, #203a43, #2c5364, #1b5e20)',
    backgroundSize: '400% 400%',
    animation: '$gradientAnimation 18s ease infinite',
    position: 'relative',
  },
  shapesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    zIndex: 1,
  },
  shape: {
    position: 'absolute',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '50%',
    animation: '$float 6s ease-in-out infinite',
  },
  paper: {
    padding: theme.spacing(4),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'rgba(15, 32, 39, 0.4)',
    borderRadius: 16,
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
    color: '#ffffff',
    zIndex: 2,
  },
  title: {
    fontWeight: 'bold',
    color: '#FFFFFF',
    background: 'linear-gradient(90deg, #FFFFFF 30%, #43cea2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  form: {
    width: '100%',
    marginTop: theme.spacing(1),
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
  },
  textField: {
    '& label.Mui-focused': {
      color: '#43cea2',
    },
    '& .MuiInputLabel-root': {
      color: 'rgba(255, 255, 255, 0.7)',
    },
    '& .MuiOutlinedInput-root': {
      '& fieldset': {
        borderColor: 'rgba(255, 255, 255, 0.3)',
      },
      '&:hover fieldset': {
        borderColor: 'rgba(255, 255, 255, 0.5)',
      },
      '&.Mui-focused fieldset': {
        borderColor: '#43cea2',
        boxShadow: '0 0 15px rgba(67, 206, 162, 0.5)',
      },
      '& input': {
        color: '#ffffff',
      },
    },
  },
  button: {
    marginTop: theme.spacing(3),
    padding: theme.spacing(1.5),
    fontWeight: 'bold',
    background: 'linear-gradient(90deg, #43cea2 0%, #185a9d 100%)',
    boxShadow: '0 4px 20px rgba(67, 206, 162, 0.4)',
    color: '#fff',
    transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 6px 25px rgba(67, 206, 162, 0.6)',
    },
  },
  helperTextError: {
    marginTop: theme.spacing(2),
    color: theme.palette.error.main,
  },
}));

// The Login API function (unchanged)
const loginApi = async ({ userCode, password }) => {
  // ... (your existing API call logic remains the same)
  const response = await fetch(`https://icx-nodejs-linux-deh2fbcaahfrgyc6.australiaeast-01.azurewebsites.net/api/api/auth/loginweb`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userCode, password }),
  });
  if (!response.ok) throw new Error('Login failed');
  const data = await response.json();
  return { token: data.access_token, personId: data.personid };
};


const LoginPage = () => {
  const classes = useStyles();
  const { login } = useAuth();
  const [userCode, setUserCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!userCode || !password) {
      setError('Please enter both user code and password');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { token, personId } = await loginApi({ userCode, password });
      login(token, personId);
    } catch (err) {
      setError('Login failed. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={classes.rootContainer}>
      <div className={classes.shapesContainer}>
        <div className={classes.shape} style={{ width: '200px', height: '200px', top: '10%', left: '5%', animationDelay: '0s' }} />
        <div className={classes.shape} style={{ width: '100px', height: '100px', top: '70%', left: '15%', animationDelay: '2s' }} />
        <div className={classes.shape} style={{ width: '150px', height: '150px', top: '25%', left: '80%', animationDelay: '1s', animationDuration: '8s' }} />
        <div className={classes.shape} style={{ width: '80px', height: '80px', top: '85%', left: '90%', animationDelay: '4s' }} />
        <div className={classes.shape} style={{ width: '50px', height: '50px', top: '50%', left: '50%', animationDelay: '3s', animationDuration: '10s' }} />
      </div>

      <Paper elevation={12} className={classes.paper}>
        
        <Typography variant="h4" gutterBottom className={classes.title}>
          EZ Tracker
        </Typography>
        <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 4, textAlign: 'center' }}>
          Smart ESG Insights for a Sustainable Future.
        </Typography>
        
        <Box component="form" onSubmit={handleLogin} noValidate className={classes.form}>
          <TextField
            variant="outlined"
            margin="normal"
            fullWidth
            label="User Code"
            name="userCode"
            value={userCode}
            onChange={(e) => setUserCode(e.target.value)}
            autoComplete="off"
            autoFocus
            className={classes.textField}
          />
          <TextField
            variant="outlined"
            margin="normal"
            fullWidth
            name="password"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className={classes.textField}
          />
          {error && <Typography className={classes.helperTextError}>{error}</Typography>}
          <Button type="submit" fullWidth variant="contained" disabled={loading} className={classes.button}>
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
          </Button>
        </Box>
      </Paper>
    </div>
  );
};

LoginPage.getLayout = function PageLayout(page) {
  return <>{page}</>;
};

export default LoginPage;
