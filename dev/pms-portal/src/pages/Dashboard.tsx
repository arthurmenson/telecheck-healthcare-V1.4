import React from 'react';
import {
  Box,
  Grid,
  Container,
  Typography,
  Breadcrumbs,
  Link,
  Paper,
} from '@mui/material';

import AIPatientFlowCard from '../components/dashboard/AIPatientFlowCard';
import ZeroTouchBillingCard from '../components/dashboard/ZeroTouchBillingCard';
import AmbientClinicalDocsCard from '../components/dashboard/AmbientClinicalDocsCard';
import DynamicComplianceCard from '../components/dashboard/DynamicComplianceCard';
import PatientEngagementCard from '../components/dashboard/PatientEngagementCard';
import PracticeAnalyticsCard from '../components/dashboard/PracticeAnalyticsCard';
import RevenueGrowthCard from '../components/dashboard/RevenueGrowthCard';
import AISchedulingCard from '../components/dashboard/AISchedulingCard';
import MultiIntegrationCard from '../components/dashboard/MultiIntegrationCard';

const Dashboard: React.FC = () => {
  return (
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
  );
};

export default Dashboard;