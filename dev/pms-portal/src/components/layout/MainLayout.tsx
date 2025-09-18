import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Badge,
  Avatar,
  Tab,
  Tabs,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material';
import {
  Search,
  Notifications,
  AccountCircle,
  BusinessCenter,
  LocalHospital,
  Settings,
  ExitToApp,
  Dashboard,
  CalendarMonth,
  Receipt,
  People,
  Analytics,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  // Map routes to tab indices
  const getTabValue = () => {
    switch (location.pathname) {
      case '/dashboard':
        return 0;
      case '/appointments':
        return 1;
      case '/billing':
        return 2;
      case '/patients':
        return 3;
      case '/reports':
        return 4;
      case '/settings':
        return 5;
      default:
        return 0;
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    const routes = ['/dashboard', '/appointments', '/billing', '/patients', '/reports', '/settings'];
    navigate(routes[newValue]);
  };

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSwitchToEHR = () => {
    window.location.href = 'http://localhost:5173';
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleProfile = () => {
    navigate('/profile');
    handleClose();
  };

  const handleSettings = () => {
    navigate('/settings');
    handleClose();
  };

  // Get user initials
  const getUserInitials = () => {
    if (user?.email) {
      const parts = user.email.split('@')[0].split('.');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return parts[0].substring(0, 2).toUpperCase();
    }
    return 'US';
  };

  return (
    <Box sx={{ flexGrow: 1, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Top Navigation Bar */}
      <AppBar
        position="sticky"
        sx={{
          bgcolor: 'white',
          color: 'black',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          borderBottom: '1px solid #e0e0e0',
          zIndex: 1100,
        }}
      >
        <Toolbar>
          <BusinessCenter sx={{ mr: 2, color: '#1976d2' }} />
          <Typography
            variant="h6"
            sx={{
              fontWeight: 'bold',
              color: '#1976d2',
              mr: 4,
            }}
          >
            Practice Management Portal
          </Typography>

          <Tabs
            value={getTabValue()}
            onChange={handleTabChange}
            sx={{
              flexGrow: 1,
              '& .MuiTab-root': {
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 500,
                minHeight: 64,
              },
            }}
          >
            <Tab icon={<Dashboard sx={{ fontSize: 20 }} />} iconPosition="start" label="Dashboard" />
            <Tab icon={<CalendarMonth sx={{ fontSize: 20 }} />} iconPosition="start" label="Appointments" />
            <Tab icon={<Receipt sx={{ fontSize: 20 }} />} iconPosition="start" label="Billing" />
            <Tab icon={<People sx={{ fontSize: 20 }} />} iconPosition="start" label="Patients" />
            <Tab icon={<Analytics sx={{ fontSize: 20 }} />} iconPosition="start" label="Reports" />
            <Tab icon={<Settings sx={{ fontSize: 20 }} />} iconPosition="start" label="Settings" />
          </Tabs>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Portal Switcher */}
            <Tooltip title="Switch to Clinical EHR">
              <IconButton color="inherit" onClick={handleSwitchToEHR}>
                <LocalHospital />
              </IconButton>
            </Tooltip>

            <IconButton color="inherit">
              <Search />
            </IconButton>

            <IconButton color="inherit">
              <Badge badgeContent={4} color="error">
                <Notifications />
              </Badge>
            </IconButton>

            {/* User Menu */}
            <IconButton onClick={handleMenu} color="inherit">
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: '#1976d2',
                }}
              >
                {getUserInitials()}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem disabled>
                <Typography variant="caption" color="text.secondary">
                  {user?.email}
                </Typography>
              </MenuItem>
              <MenuItem onClick={handleProfile}>
                <AccountCircle sx={{ mr: 1 }} /> Profile
              </MenuItem>
              <MenuItem onClick={handleSettings}>
                <Settings sx={{ mr: 1 }} /> Settings
              </MenuItem>
              <MenuItem onClick={handleSwitchToEHR}>
                <LocalHospital sx={{ mr: 1 }} /> Switch to Clinical EHR
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <ExitToApp sx={{ mr: 1 }} /> Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Page Content */}
      <Box sx={{ flexGrow: 1 }}>
        {children}
      </Box>
    </Box>
  );
};

export default MainLayout;