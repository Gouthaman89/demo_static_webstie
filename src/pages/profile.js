import React from 'react';
import { useAuth } from '../components/AuthContext';
import {
  Box,
  Card,
  Typography,
  Grid,
  Avatar,
  Container,
} from '@material-ui/core';
import Loader from '../components/Loader/loader';
import AccountCircleIcon from '@material-ui/icons/AccountCircle';
import i18n from '../i18n';

const ProfilePage = () => {
  const t = (key) => (i18n && typeof i18n.t === 'function' ? i18n.t(key) : key);
  const { profile, loading } = useAuth(); // Get profile, and loading state from AuthContext

  if (loading) {
    return <Loader />;
  }

  if (!profile) {
    return (
      <Container>
      
      </Container>
    );
  }

  return (
    <Container maxWidth="md" style={{ marginTop: 32 }}>
      <Card style={{ padding: 32, boxShadow: '0 3px 10px rgba(0,0,0,0.2)' }}>
        <Grid container spacing={4} alignItems="center">
          {/* Avatar and Name */}
          <Grid item xs={12} sm={4} style={{ display: 'flex', justifyContent: 'center' }}>
            <Avatar style={{ width: 120, height: 120 }}>
              <AccountCircleIcon style={{ fontSize: 80 }} />
            </Avatar>
          </Grid>

          {/* Profile Info */}
          <Grid item xs={12} sm={8}>
            <Typography variant="h4" style={{ fontWeight: 'bold' }} gutterBottom>
              {profile.name}
            </Typography>

            <Box style={{ marginTop: 16 }}>
              <Typography variant="subtitle1" color="textSecondary">
                <strong>{t('email')}:</strong> {profile.email}
              </Typography>
              <Typography variant="subtitle1" color="textSecondary">
                <strong>{t('phone')}:</strong> {profile.tel || t('notAvailable')}
              </Typography>
              <Typography variant="subtitle1" color="textSecondary">
                <strong>{t('personID')}:</strong> {profile.pid}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Card>

      {/* Additional Section for Future Info */}
      <Box style={{ marginTop: 32 }}>
        <Card style={{ padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
          <Typography variant="h6" color="primary" style={{ fontWeight: 'bold' }} gutterBottom>
            {t('additionalInformation')}
          </Typography>
          <Typography variant="body1" color="textSecondary">
            {t('additionalInformationDescription')}
          </Typography>
        </Card>
      </Box>
    </Container>
  );
};

export default ProfilePage;