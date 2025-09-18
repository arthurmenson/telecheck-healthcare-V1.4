# PMS Portal UI Specification - Material-UI Implementation

## Dashboard Design Based on Provided Interface

### Main Dashboard Layout
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ PMS    Appointments    Billing    Patients    Analytics         🔍 🔔 👤        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│ ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────────────┐ │
│ │ AI Patient Flow     │ │ Zero-Touch Billing  │ │ Ambient Clinical Docs       │ │
│ │ Engine              │ │ & Claims            │ │                             │ │
│ │                     │ │                     │ │ Progress Note               │ │
│ │ • Predicting volume │ │ • Auto-generated    │ │ John Doe                    │ │
│ │ • Auto booking      │ │   claims            │ │ Subjects: Les on Mo...      │ │
│ │ • Handle alerts     │ │ • Auto-sent to      │ │ Assessment: Multiple...      │ │
│ │                     │ │   insurers          │ │ * Sentiment analysis        │ │
│ │ [Bar Chart]         │ │ • Auto-payment      │ │                             │ │
│ │     56%             │ │   posting           │ │ [Clinical Note Display]     │ │
│ └─────────────────────┘ └─────────────────────┘ └─────────────────────────────┘ │
│                                                                                 │
│ ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────────────┐ │
│ │ Dynamic Compliance  │ │ Patient Engagement  │ │ 360° Practice Analytics     │ │
│ │ & Risk Shield       │ │ AI                  │ │                             │ │
│ │                     │ │                     │ │ • Predictive analytics      │ │
│ │ • Post time rule    │ │ • Conversational    │ │ • Declining patient         │ │
│ │   monitoring        │ │   assistant         │ │   trends                    │ │
│ │ • Compliance alerts │ │ • Patient selection │ │ • Scenario modeling         │ │
│ │ • Auto-generated    │ │   trending          │ │                             │ │
│ │   audit tags        │ │ • Multi-language    │ │ [Analytics Charts]          │ │
│ │                     │ │   support           │ │                             │ │
│ │ ⚠️ Privacy training │ │                     │ │                             │ │
│ │ ⚠️ Incomplete EM    │ │ [Chat Interface]    │ │                             │ │
│ └─────────────────────┘ └─────────────────────┘ └─────────────────────────────┘ │
│                                                                                 │
│ ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────────────┐ │
│ │ Revenue Growth      │ │ AI-First Scheduling │ │ Seamless Multi-Integration  │ │
│ │ Automations         │ │                     │ │                             │ │
│ │                     │ │ Patient self-booking│ │ • Native labs, pharmacy     │ │
│ │ • Native text       │ │ • Inventory         │ │ • Clearinghouse connectors  │ │
│ │   building          │ │ • Urgent           │ │ • Modular design            │ │
│ │ • Patient retention │ │ • Adaptive         │ │                             │ │
│ │ • Revenue ROI       │ │                     │ │ Lab, Pharmacy, Clear...     │ │
│ │                     │ │ [Schedule Grid]     │ │ Patient, Invoicing...       │ │
│ │ [Revenue Chart]     │ │                     │ │                             │ │
│ └─────────────────────┘ └─────────────────────┘ └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Material-UI Component Implementation

### 1. Dashboard Framework
```typescript
// Dashboard Layout Component
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  Badge,
  Avatar,
  Tab,
  Tabs
} from '@mui/material';
import {
  Search,
  Notifications,
  AccountCircle,
  Dashboard,
  Event,
  Payment,
  People,
  Analytics
} from '@mui/icons-material';

const PMSDashboard = () => {
  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Top Navigation Bar */}
      <AppBar position="static" sx={{ bgcolor: 'white', color: 'black', boxShadow: 1 }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            PMS
          </Typography>
          <Tabs value={0} sx={{ flexGrow: 1 }}>
            <Tab label="Appointments" />
            <Tab label="Billing" />
            <Tab label="Patients" />
            <Tab label="Analytics" />
          </Tabs>
          <IconButton><Search /></IconButton>
          <IconButton><Badge badgeContent={4}><Notifications /></Badge></IconButton>
          <IconButton><Avatar sx={{ width: 32, height: 32 }} /></IconButton>
        </Toolbar>
      </AppBar>

      {/* Dashboard Grid */}
      <Box sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {/* Row 1 */}
          <Grid item xs={12} md={4}>
            <AIPatientFlowCard />
          </Grid>
          <Grid item xs={12} md={4}>
            <ZeroTouchBillingCard />
          </Grid>
          <Grid item xs={12} md={4}>
            <AmbientClinicalDocsCard />
          </Grid>

          {/* Row 2 */}
          <Grid item xs={12} md={4}>
            <DynamicComplianceCard />
          </Grid>
          <Grid item xs={12} md={4}>
            <PatientEngagementCard />
          </Grid>
          <Grid item xs={12} md={4}>
            <PracticeAnalyticsCard />
          </Grid>

          {/* Row 3 */}
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
      </Box>
    </Box>
  );
};
```

### 2. AI Patient Flow Engine Card
```typescript
import { Card, CardContent, Typography, Box, LinearProgress } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';

const AIPatientFlowCard = () => {
  const flowData = [
    { time: '9', volume: 30 },
    { time: '10', volume: 45 },
    { time: '11', volume: 60 },
    { time: '12', volume: 75 },
    { time: '1', volume: 85 },
    { time: '2', volume: 70 },
    { time: '3', volume: 55 },
    { time: '4', volume: 40 }
  ];

  return (
    <Card sx={{ height: 320, display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="h6" gutterBottom fontWeight="bold">
          AI Patient Flow Engine
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            • Predicting patient volume throughout
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Auto-book scheduling slots
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Handle scheduling conflicts
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Scheduled hours
        </Typography>

        <Box sx={{ height: 120, mb: 2 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={flowData}>
              <XAxis dataKey="time" axisLine={false} tickLine={false} />
              <YAxis hide />
              <Bar dataKey="volume" fill="#2196f3" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h3" fontWeight="bold" color="primary">
            56%
          </Typography>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="body2" color="text.secondary">Pending 25%</Typography>
            <Typography variant="body2" color="text.secondary">Accepted 60%</Typography>
            <Typography variant="body2" color="text.secondary">Denied 10%</Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};
```

### 3. Zero-Touch Billing & Claims Card
```typescript
import { Card, CardContent, Typography, Box, Chip } from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const ZeroTouchBillingCard = () => {
  const billingData = [
    { name: 'Accepted', value: 60, color: '#4caf50' },
    { name: 'Pending', value: 25, color: '#ff9800' },
    { name: 'Denied', value: 15, color: '#f44336' }
  ];

  return (
    <Card sx={{ height: 320 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom fontWeight="bold">
          Zero-Touch Billing & Claims
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            • Auto-generated claims
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Auto-sent to insurers
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Auto-payment posting
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
          <Box sx={{ position: 'relative', width: 120, height: 120 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={billingData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={55}
                  dataKey="value"
                >
                  {billingData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <Typography
              variant="h4"
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                fontWeight: 'bold'
              }}
            >
              56%
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip label="Pending 25%" size="small" color="warning" />
          <Chip label="Accepted 60%" size="small" color="success" />
          <Chip label="Denied 10%" size="small" color="error" />
        </Box>
      </CardContent>
    </Card>
  );
};
```

### 4. Ambient Clinical Documentation Card
```typescript
import { Card, CardContent, Typography, Box, Paper, Chip } from '@mui/material';

const AmbientClinicalDocsCard = () => {
  return (
    <Card sx={{ height: 320 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom fontWeight="bold">
          Ambient Clinical Documentation
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            • Auto-generated SOAP notes
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Natural language processing
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Sentiment analysis (new)
          </Typography>
        </Box>

        <Typography variant="h6" sx={{ mb: 1 }}>
          Progress Note
        </Typography>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          John Doe
        </Typography>

        <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Subjects:</strong> Les on Mo, prescription, behavioral...
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Assessment:</strong> Multiple lab work
          </Typography>
          <Chip
            label="★ Sentiment analysis"
            size="small"
            color="primary"
            variant="outlined"
          />
        </Paper>

        <Paper sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
          <Typography variant="body2">
            May I harmonize my medication preferences?
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            3 min
          </Typography>
        </Paper>
      </CardContent>
    </Card>
  );
};
```

### 5. Dynamic Compliance & Risk Shield Card
```typescript
import { Card, CardContent, Typography, Box, Alert, Chip } from '@mui/material';
import { Warning, CheckCircle } from '@mui/icons-material';

const DynamicComplianceCard = () => {
  return (
    <Card sx={{ height: 320 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom fontWeight="bold">
          Dynamic Compliance & Risk Shield
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            • Post time rule monitoring
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Compliance alerts
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Auto-generated audit tags
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 3 }}>
          <Alert
            severity="warning"
            icon={<Warning />}
            sx={{ fontSize: '0.875rem' }}
          >
            Privacy training overdue
          </Alert>

          <Alert
            severity="warning"
            icon={<Warning />}
            sx={{ fontSize: '0.875rem' }}
          >
            Incomplete SMS consent policy
          </Alert>

          <Alert
            severity="warning"
            icon={<Warning />}
            sx={{ fontSize: '0.875rem' }}
          >
            Incomplete EM documentation
          </Alert>
        </Box>

        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip label="HIPAA" size="small" color="success" />
          <Chip label="SOC 2" size="small" color="success" />
          <Chip label="ONC" size="small" color="warning" />
        </Box>
      </CardContent>
    </Card>
  );
};
```

### 6. Patient Engagement AI Card
```typescript
import { Card, CardContent, Typography, Box, Paper, Avatar } from '@mui/material';
import { Chat, Translate, TrendingUp } from '@mui/icons-material';

const PatientEngagementCard = () => {
  return (
    <Card sx={{ height: 320 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom fontWeight="bold">
          Patient Engagement AI
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            • Conversational assistant
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Patient satisfaction trending
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Multiple language support
          </Typography>
        </Box>

        <Paper sx={{ p: 2, bgcolor: 'primary.main', color: 'white', borderRadius: 2 }}>
          <Typography variant="body2">
            Can my symptoms be managed through medication changes?
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            9 sec
          </Typography>
        </Paper>

        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
            <Chat sx={{ fontSize: 18 }} />
          </Avatar>
          <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
            <Translate sx={{ fontSize: 18 }} />
          </Avatar>
          <Avatar sx={{ bgcolor: 'success.main', width: 32, height: 32 }}>
            <TrendingUp sx={{ fontSize: 18 }} />
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );
};
```

### 7. AI-First Scheduling Card
```typescript
import { Card, CardContent, Typography, Box, Chip, Grid } from '@mui/material';
import { CalendarToday, Schedule, Assignment } from '@mui/icons-material';

const AISchedulingCard = () => {
  const scheduleItems = [
    { id: 1, time: 'Apr 8', day: 'Monday', status: 'available' },
    { id: 2, time: 'Apr 8', patient: 'Noah', status: 'booked' },
    { id: 3, time: 'Apr 8', patient: 'Jaeger', status: 'urgent' }
  ];

  return (
    <Card sx={{ height: 320 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom fontWeight="bold">
          AI-First Scheduling
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            • Patient self-booking
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Inventory management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Adaptive scheduling
          </Typography>
        </Box>

        <Box sx={{ mb: 2 }}>
          {scheduleItems.map((item) => (
            <Box
              key={item.id}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                py: 1,
                borderBottom: '1px solid',
                borderColor: 'grey.200'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarToday sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2">{item.time}</Typography>
                {item.patient && (
                  <Typography variant="body2" fontWeight="bold">
                    {item.patient}
                  </Typography>
                )}
              </Box>
              <Chip
                label={item.status}
                size="small"
                color={
                  item.status === 'urgent'
                    ? 'error'
                    : item.status === 'booked'
                    ? 'primary'
                    : 'default'
                }
              />
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};
```

---

## Current EHR UI Modifications

### Elements to Remove from EHR Interface
```typescript
// Remove PMS-specific elements from Clinical EHR
const ElementsToRemove = {
  billing: [
    'Revenue cycle management',
    'Claims processing',
    'Payment posting',
    'Denial management',
    'Financial reporting',
    'Insurance verification'
  ],

  scheduling: [
    'Practice-wide scheduling optimization',
    'Multi-provider resource management',
    'Business scheduling analytics',
    'Appointment revenue tracking'
  ],

  administration: [
    'Practice management dashboard',
    'Staff productivity metrics',
    'Financial performance analytics',
    'Business intelligence tools',
    'Vendor management',
    'Contract administration'
  ],

  analytics: [
    'Revenue analytics',
    'Payer performance metrics',
    'Business forecasting',
    'Practice benchmarking',
    'Financial dashboards'
  ]
};

// Keep in Clinical EHR
const ClinicalElementsToKeep = {
  clinical: [
    'Patient clinical records',
    'Clinical documentation',
    'Order management',
    'Lab/imaging results',
    'Medication management',
    'Clinical decision support',
    'Care coordination',
    'Clinical quality metrics',
    'Patient safety alerts',
    'Clinical workflow automation'
  ],

  patientCare: [
    'Telehealth consultations',
    'Clinical communication',
    'Care plan management',
    'Clinical assessments',
    'Progress note tracking',
    'Clinical alerts and reminders'
  ]
};
```

### Updated Clinical EHR Navigation
```typescript
const ClinicalNavigation = {
  primary: [
    { label: 'Clinical Dashboard', icon: 'Dashboard', path: '/clinical' },
    { label: 'Patients', icon: 'People', path: '/clinical/patients' },
    { label: 'Clinical Documentation', icon: 'Description', path: '/clinical/docs' },
    { label: 'Orders & Results', icon: 'Assignment', path: '/clinical/orders' },
    { label: 'Medications', icon: 'LocalPharmacy', path: '/clinical/medications' },
    { label: 'Care Plans', icon: 'Timeline', path: '/clinical/care-plans' },
    { label: 'Telehealth', icon: 'VideoCall', path: '/clinical/telehealth' }
  ],

  secondary: [
    { label: 'Clinical Alerts', icon: 'Notifications' },
    { label: 'Decision Support', icon: 'Psychology' },
    { label: 'Quality Metrics', icon: 'Assessment' },
    { label: 'Clinical Reports', icon: 'BarChart' }
  ]
};
```

---

## Technology Stack for PMS Portal

### Frontend Dependencies
```json
{
  "dependencies": {
    "@mui/material": "^5.14.0",
    "@mui/icons-material": "^5.14.0",
    "@mui/x-data-grid": "^6.10.0",
    "@mui/x-date-pickers": "^6.10.0",
    "@mui/x-charts": "^6.0.0",
    "recharts": "^2.8.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.15.0",
    "@reduxjs/toolkit": "^1.9.5",
    "react-redux": "^8.1.2",
    "@tanstack/react-query": "^4.32.0",
    "react-hook-form": "^7.45.0",
    "@hookform/resolvers": "^3.1.1",
    "yup": "^1.2.0",
    "dayjs": "^1.11.9",
    "axios": "^1.4.0"
  }
}
```

### Component Architecture
```
src/
├── components/
│   ├── dashboard/
│   │   ├── AIPatientFlowCard.tsx
│   │   ├── ZeroTouchBillingCard.tsx
│   │   ├── AmbientClinicalDocsCard.tsx
│   │   ├── DynamicComplianceCard.tsx
│   │   ├── PatientEngagementCard.tsx
│   │   ├── PracticeAnalyticsCard.tsx
│   │   ├── RevenueGrowthCard.tsx
│   │   ├── AISchedulingCard.tsx
│   │   └── MultiIntegrationCard.tsx
│   ├── scheduling/
│   │   ├── AdvancedScheduler.tsx
│   │   ├── ProviderCalendar.tsx
│   │   ├── ResourceManager.tsx
│   │   └── AppointmentOptimizer.tsx
│   ├── billing/
│   │   ├── ClaimsManager.tsx
│   │   ├── PaymentProcessor.tsx
│   │   ├── RevenueCycle.tsx
│   │   └── FinancialReports.tsx
│   └── analytics/
│       ├── BusinessIntelligence.tsx
│       ├── PredictiveAnalytics.tsx
│       ├── PerformanceMetrics.tsx
│       └── CustomReports.tsx
```

This Material-UI implementation provides the modern, professional interface shown in your image while maintaining the existing EHR functionality and separating business operations into the dedicated PMS portal.