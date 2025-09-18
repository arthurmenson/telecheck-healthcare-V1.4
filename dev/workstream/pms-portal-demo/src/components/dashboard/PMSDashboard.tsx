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
  Container
} from '@mui/material';
import {
  Search,
  Notifications,
  AccountCircle
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

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
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
          <Typography
            variant="h5"
            sx={{
              fontWeight: 'bold',
              color: '#1976d2',
              mr: 4
            }}
          >
            PMS
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
            <Tab label="Appointments" />
            <Tab label="Billing" />
            <Tab label="Patients" />
            <Tab label="Analytics" />
          </Tabs>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton size="large" color="inherit">
              <Search />
            </IconButton>
            <IconButton size="large" color="inherit">
              <Badge badgeContent={4} color="error">
                <Notifications />
              </Badge>
            </IconButton>
            <IconButton size="large" color="inherit">
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: '#1976d2'
                }}
              >
                <AccountCircle />
              </Avatar>
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Dashboard Content */}
      <Container maxWidth="xl" sx={{ py: 4 }}>
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
      </Container>
    </Box>
  );
};

export default PMSDashboard;