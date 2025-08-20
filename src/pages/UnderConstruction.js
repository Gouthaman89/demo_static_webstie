import React from 'react';
import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import Card from '@material-ui/core/Card';
import { useHistory } from 'react-router-dom';

const UnderConstruction = () => {
    const history = useHistory();

    return (
        <Box
            style={{
                height: '100vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                flexDirection: 'column',
                textAlign: 'center',
            }}
        >
            <Card elevation={3} style={{ padding: 32 }}>
                <Typography variant="h4" gutterBottom color="primary">
                    🚧 Under Construction 🚧
                </Typography>
                <Typography variant="body1" style={{ marginBottom: 24 }}>
                    This feature is currently under development. Please check back later!
                </Typography>
                <Button
                    variant="contained"
                    color="secondary"
                    onClick={() => history.goBack()} // Navigate back to the previous page
                >
                    Go Back
                </Button>
            </Card>
        </Box>
    );
};

export default UnderConstruction;