import React from 'react';
import { AppBar, Toolbar, Typography, Button } from '@material-ui/core';
import { Link } from 'react-router-dom';

function MenuBar() {
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" style={{ flexGrow: 1 }}>
          My App
        </Typography>
        <Button color="inherit" component={Link} to="/page1">
          Page 1
        </Button>
        <Button color="inherit" component={Link} to="/page2">
          Page 2
        </Button>
        <Button color="inherit" component={Link} to="/page3">
          Page 3
        </Button>
        <Button color="inherit" component={Link} to="/page4">
          Page 4
        </Button>
        <Button color="inherit" component={Link} to="/page5">
          Page 5
        </Button>
      </Toolbar>
    </AppBar>
  );
}

export default MenuBar;
