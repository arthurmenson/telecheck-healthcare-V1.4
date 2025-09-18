import React from 'react';
import {
  Box,
  Grid,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Badge,
  Avatar,
  Tab,
  Tabs,
  Container,
  Menu,
  MenuItem,
  Tooltip,
  Breadcrumbs,
  Link,
  Paper
} from '@mui/material';
import {
  Search,
  Notifications,
  AccountCircle,
  BusinessCenter,
  LocalHospital,
  Settings,
  ExitToApp,
  Dashboard
} from '@mui/icons-material';

import AIPatientFlowCard from './AIPatientFlowCard';
import ZeroTouchBillingCard from './ZeroTouchBillingCard';
import AmbientClinicalDocsCard from './AmbientClinicalDocsCard';
import DynamicComplianceCard from './DynamicComplianceCard';
import PatientEngagementCard from './PatientEngagementCard';
import PracticeAnalyticsCard from './PracticeAnalyticsCard';
import RevenueGrowthCard from './RevenueGrowthCard';
import AISchedulingCard from './AISchedulingCard';
import MultiIntegrationCard from './MultiIntegrationCard';

const PMSDashboard: React.FC = () => {
  const [currentTab, setCurrentTab] = React.useState(0);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSwitchToEHR = () => {
    // Navigate to EHR portal
    window.location.href = 'http://localhost:5173';
  };

  const handleLogout = () => {
    // Clear authentication and redirect to login
    localStorage.removeItem('token');
    window.location.href = 'http://localhost:5173/login';
  };

  return (
    <Box sx={{ flexGrow: 1, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Top Navigation Bar */}
      <AppBar
        position="static"
        sx={{
          bgcolor: 'white',
          color: 'black',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          borderBottom: '1px solid #e0e0e0'
        }}
      >
        <Toolbar>
          <BusinessCenter sx={{ mr: 2, color: '#1976d2' }} />
          <Typography
            variant="h6"
            sx={{
              fontWeight: 'bold',
              color: '#1976d2',
              mr: 4
            }}
          >
            Practice Management Portal
          </Typography>

          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            sx={{
              flexGrow: 1,
              '& .MuiTab-root': {
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 500
              }
            }}
          >
            <Tab label="Dashboard" />
            <Tab label="Appointments" />
            <Tab label="Billing" />
            <Tab label="Patients" />
            <Tab label="Analytics" />
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

            <IconButton color="inherit">
              <Settings />
            </IconButton>

            {/* User Menu */}
            <IconButton onClick={handleMenu} color="inherit">
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: '#1976d2'
                }}
              >
                AD
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem onClick={handleClose}>Profile</MenuItem>
              <MenuItem onClick={handleClose}>Settings</MenuItem>
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

      {/* Dashboard Content */}
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Breadcrumbs */}
        <Breadcrumbs sx={{ mb: 3 }}>
          <Link color="inherit" href="/" sx={{ textDecoration: 'none' }}>
            PMS
          </Link>
          <Typography color="text.primary">Dashboard</Typography>
        </Breadcrumbs>

        {/* Page Title */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Practice Management Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Monitor your practice performance, billing, and operational metrics
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* Row 1: AI & Automation */}
          <Grid item xs={12} md={4}>
            <AIPatientFlowCard />
          </Grid>
          <Grid item xs={12} md={4}>
            <ZeroTouchBillingCard />
          </Grid>
          <Grid item xs={12} md={4}>
            <AmbientClinicalDocsCard />
          </Grid>

          {/* Row 2: Compliance & Engagement */}
          <Grid item xs={12} md={4}>
            <DynamicComplianceCard />
          </Grid>
          <Grid item xs={12} md={4}>
            <PatientEngagementCard />
          </Grid>
          <Grid item xs={12} md={4}>
            <PracticeAnalyticsCard />
          </Grid>

          {/* Row 3: Growth & Integration */}
          <Grid item xs={12} md={4}>
            <RevenueGrowthCard />
          </Grid>
          <Grid item xs={12} md={4}>
            <AISchedulingCard />
          </Grid>
          <Grid item xs={12} md={4}>
            <MultiIntegrationCard />
          </Grid>
        </Grid>

        {/* Quick Stats Bar */}
        <Paper sx={{ mt: 4, p: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Today's Revenue
                </Typography>
                <Typography variant="h6" fontWeight="bold">
                  $12,450
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Pending Claims
                </Typography>
                <Typography variant="h6" fontWeight="bold">
                  24
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Active Patients
                </Typography>
                <Typography variant="h6" fontWeight="bold">
                  1,234
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Appointments Today
                </Typography>
                <Typography variant="h6" fontWeight="bold">
                  18
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Container>
    </Box>
  );
};

export default PMSDashboard;