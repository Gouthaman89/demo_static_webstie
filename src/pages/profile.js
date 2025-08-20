import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthContext';
import axios from 'axios';
import {
  Box,
  Card,
  Typography,
  Grid,
  Avatar,
  Container,
  Alert,
} from '@material-ui/core';
import Loader from '../components/Loader/loader';
import AccountCircleIcon from '@material-ui/icons/AccountCircle';
import { useTranslation } from 'react-i18next';

const ProfilePage = () => {
  const { t } = useTranslation();
  const { token, personId } = useAuth(); // Get the token and personId from AuthContext
  const [profile, setProfile] = useState(null); // State to store profile data
  const [error, setError] = useState(null); // State to handle errors

  // Fetch profile data when the component mounts
  useEffect(() => {
    const fetchProfile = async () => {
      if (!personId || personId === '') {
        setError(t('invalidPersonID'));
        return;
      }

      try {
        const response = await axios.post(
          `${process.env.REACT_APP_API_BASE_URL}/profile`, // API endpoint
          {
            personid: personId, // Send personId in the body
          },
          {
            headers: {
              Authorization: `Bearer ${token}`, // Include token in headers
            },
          }
        );
        // Set the profile data from API response
        setProfile(response.data[0]);
      } catch (error) {
        console.error(t('errorFetchingProfileData'), error);
        setError(t('failedToFetchProfileData'));
      }
    };

    if (token && personId) {
      fetchProfile(); // Fetch profile data if token and personId are available
    }
  }, [token, personId, t]);

  if (error) {
    return (
      <Container>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!profile) {
    return <Loader />;
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