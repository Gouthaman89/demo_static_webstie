import React, { useState, useEffect, useCallback } from 'react';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import Box from '@material-ui/core/Box';
import TranslateIcon from '@material-ui/icons/Translate';
import AccountCircle from '@material-ui/icons/AccountCircle';
import MenuIcon from '@material-ui/icons/Menu';
import { Link } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { useGlobalContext } from '../components/GlobalContext';
import * as PageController from '../controllers/PageControllers';
import Chat from "../pages/Chat";
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import i18n from '../i18n';

const Layout = ({ children }) => {
  const t = (key) => (i18n && typeof i18n.t === 'function' ? i18n.t(key) : key);
  const {
    token,
    logout,
    profile,
    personId
  } = useAuth();

  // Do not render layout chrome before login
  if (!token) {
    return <>{children}</>;
  }

  const {
    globalCompanyId,
    setGlobalCompanyId,
    globalOrgId,
    setGlobalOrgId,
    companyList,
    setCompanyList,
    organizationList,
    setOrganizationList
  } = useGlobalContext();
  const [languageAnchor, setLanguageAnchor] = useState(null);
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);
  const [menuItems, setMenuItems] = useState([]); // Initialize menuItems as an empty array

  // ---- Persist selections across refresh (per user) ----
  const isBrowser = typeof window !== 'undefined';
  const getLS = useCallback((key) => (isBrowser ? window.localStorage.getItem(key) : null), [isBrowser]);
  const setLS = useCallback((key, val) => { if (isBrowser) window.localStorage.setItem(key, val); }, [isBrowser]);
  const rmLS = useCallback((key) => { if (isBrowser) window.localStorage.removeItem(key); }, [isBrowser]);
  const storagePrefix = `eztracker:${personId || 'anon'}`;
  const COMPANY_KEY = `${storagePrefix}:companyId`;
  const ORG_KEY = `${storagePrefix}:orgId`;

  const endpoint = `/api/menu?personid=${personId}`;

  const handleLanguageMenuOpen = (event) => {
    setLanguageAnchor(event.currentTarget);
  };

  const handleLanguageMenuClose = () => {
    setLanguageAnchor(null);
  };

  const handleLanguageChange = (lng) => {
    i18n.changeLanguage(lng);
    setCurrentLanguage(lng);
    handleLanguageMenuClose();
  };

  const fetchOrganizations = useCallback(async (companyId, { tryRestoreOrg = false } = {}) => {
    try {
      await PageController.getData(
        `/f000110e30/organizations?personid=${personId}&companyId=${companyId}`,
        (data) => {
          const list = data || [];
          setOrganizationList(list);
          if (tryRestoreOrg) {
            const storedOrg = getLS(ORG_KEY);
            if (storedOrg && list.some(o => o.organizationid === storedOrg)) {
              setGlobalOrgId(storedOrg);
            } else if (!globalOrgId && list.length > 0) {
              setGlobalOrgId(list[0].organizationid);
            }
          }
        },
        { companyId, personid: personId }
      );
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
    }
  }, [personId, getLS, ORG_KEY, globalOrgId, setGlobalOrgId, setOrganizationList]);
  const fetchCompanies = useCallback(async () => {
    try {
      await PageController.getData(
        `/f000110e30/companies?personid=${personId}`,
        (data) => {
          const list = data || [];
          setCompanyList(list);
          // Try to restore company selection from LS if none selected
          const storedCompany = getLS(COMPANY_KEY);
          if (!globalCompanyId && list.length > 0) {
            if (storedCompany && list.some(c => c.companyid === storedCompany)) {
              setGlobalCompanyId(storedCompany);
              // Also fetch orgs and try to restore org
              fetchOrganizations(storedCompany, { tryRestoreOrg: true });
            } else {
              const firstCompany = list[0];
              setGlobalCompanyId(firstCompany.companyid);
              fetchOrganizations(firstCompany.companyid, { tryRestoreOrg: true });
            }
          }
        },
        { personid: personId }
      );
    } catch (err) {
      console.error('Failed to fetch companies:', err);
    }
  }, [personId, getLS, COMPANY_KEY, globalCompanyId, setGlobalCompanyId, fetchOrganizations, setCompanyList]);
  const fetchMenuItems = useCallback(async () => {
    if (!token) return;
    try {
      PageController.getData(endpoint, (data) => {
        if (!data || data.length === 0) {
          logout();
          return;
        }
        setMenuItems(data);
      });
    } catch (error) {
      console.error('Error fetching menu items:', error);
    }
  }, [token, endpoint, logout, setMenuItems]);

  // Initial load: fetch menu + companies (restores saved company/org if present)
  useEffect(() => {
    if (!token) return;
    const initialize = async () => {
      await fetchMenuItems();
      await fetchCompanies(); // handles restore + org fetch internally
    };
    initialize();
  }, [token, personId, fetchMenuItems, fetchCompanies]);

  // Persist selections when they change
  useEffect(() => {
    if (globalCompanyId) {
      setLS(COMPANY_KEY, globalCompanyId);
    }
  }, [globalCompanyId, COMPANY_KEY, setLS]);
  useEffect(() => {
    if (globalOrgId) {
      setLS(ORG_KEY, globalOrgId);
    }
  }, [globalOrgId, ORG_KEY, setLS]);
  
  // If the company list changes and current selection is invalid, fix it
  useEffect(() => {
    if (companyList?.length) {
      if (!globalCompanyId || !companyList.some(c => c.companyid === globalCompanyId)) {
        const stored = getLS(COMPANY_KEY);
        const next = (stored && companyList.some(c => c.companyid === stored))
          ? stored
          : companyList[0]?.companyid;
        if (next && next !== globalCompanyId) {
          setGlobalCompanyId(next);
          fetchOrganizations(next, { tryRestoreOrg: true });
        }
      }
    }
  }, [companyList, globalCompanyId, COMPANY_KEY, getLS, setGlobalCompanyId, fetchOrganizations]);
  
  // If the org list changes and current selection is invalid, fix it
  useEffect(() => {
    if (organizationList?.length && globalCompanyId) {
      if (!globalOrgId || !organizationList.some(o => o.organizationid === globalOrgId)) {
        const stored = getLS(ORG_KEY);
        const next = (stored && organizationList.some(o => o.organizationid === stored))
          ? stored
          : organizationList[0]?.organizationid;
        if (next && next !== globalOrgId) {
          setGlobalOrgId(next);
        }
      }
    }
  }, [organizationList, globalCompanyId, globalOrgId, ORG_KEY, getLS, setGlobalOrgId]);

  

  // Guard Select values against out-of-range values
  const safeCompanyValue = (companyList || []).some(c => c.companyid === globalCompanyId) ? globalCompanyId : '';
  const safeOrgValue = (organizationList || []).some(o => o.organizationid === globalOrgId) ? globalOrgId : '';

  return (
    <div>
      <AppBar position="static" style={{ backgroundColor: '#FFFFFF', color: '#000000' }}>
        <Toolbar>
          {/* Menu Icon and App Title */}
          <IconButton edge="start" color="inherit" aria-label="menu">
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" style={{ marginRight: 16 }}>
  EZ Tracker1
</Typography>

          <Box style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto' }}>
            <FormControl style={{ minWidth: 150, marginRight: 16 }}>
              <Select
                displayEmpty
                value={safeCompanyValue}
                onChange={(e) => {
                  const nextCompany = e.target.value;
                  setGlobalCompanyId(nextCompany);
                  setLS(COMPANY_KEY, nextCompany);
                  // Reset org selection (and its LS) because company changed
                  setGlobalOrgId('');
                  rmLS(ORG_KEY);
                  setOrganizationList([]);
                  fetchOrganizations(nextCompany, { tryRestoreOrg: true });
                }}
              >
                <MenuItem value=""><em>{t('Select Company')}</em></MenuItem>
                {(companyList || []).map((comp) => (
                  <MenuItem key={comp.companyid} value={comp.companyid}>
                    {comp.companyname}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl style={{ minWidth: 150, marginRight: 16 }} disabled={!globalCompanyId}>
              <Select
                displayEmpty
                value={safeOrgValue}
                onChange={(e) => {
                  setGlobalOrgId(e.target.value);
                  setLS(ORG_KEY, e.target.value);
                }}
              >
                <MenuItem value=""><em>{t('Select Organization')}</em></MenuItem>
                {(organizationList || []).map((org) => (
                  <MenuItem key={org.organizationid} value={org.organizationid}>
                    {org.organization}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <IconButton color="inherit" onClick={handleLanguageMenuOpen}>
              <TranslateIcon />
            </IconButton>
            <Typography variant="body1" style={{ marginLeft: 8 }}>
              {currentLanguage.toUpperCase()}
            </Typography>
            <Menu
              anchorEl={languageAnchor}
              open={Boolean(languageAnchor)}
              onClose={handleLanguageMenuClose}
            >
              <MenuItem onClick={() => handleLanguageChange('zh-TW')}>中文 (Chinese)</MenuItem>
              <MenuItem onClick={() => handleLanguageChange('en-US')}>English</MenuItem>
              <MenuItem onClick={() => handleLanguageChange('ja-JP')}>日本語 (Japanese)</MenuItem>
            </Menu>

            <Box style={{ display: 'flex', alignItems: 'center' }}>
              <IconButton edge="end" color="inherit">
                <AccountCircle />
              </IconButton>
              <Typography variant="body1" style={{ marginLeft: 8 }}>
                {profile?.name || 'User'}
              </Typography>
            </Box>

            <Button onClick={logout} variant="outlined" color="primary" style={{ marginLeft: 16 }}>
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Layout */}
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        {/* Sidebar */}
        <div style={{ width: '180px', backgroundColor: '#0000000D', padding: '20px' }}>
          <List>
            {menuItems.map((item, index) => (
              <ListItem button component={Link} to={item.path} key={index}>
                <ListItemText
                  primary={t(item.label)}
                  primaryTypographyProps={{
                    style: {
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: 'block',
                    },
                  }}
                />
              </ListItem>
            ))}
          </List>
        </div>

        {/* Content Area */}
        <div style={{ flexGrow: 1, padding: '20px' }}>
          {children}
        </div>
      </div>

   {/* Chatbot (Only loads in browser) */}
<Chat user={profile?.name || "Guest"} />

    </div>
  );
};

export default Layout;