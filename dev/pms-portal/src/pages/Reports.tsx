import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  Download,
  Print,
  Schedule,
  TrendingUp,
  TrendingDown,
  Assessment,
  PieChart,
  BarChart,
  Timeline,
  AttachMoney,
  People,
  LocalHospital,
  Receipt,
  CheckCircle,
  Warning,
  Error,
  Info,
  Share,
  CalendarMonth,
  FileDownload,
  PictureAsPdf,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs, { Dayjs } from 'dayjs';

interface Report {
  id: string;
  name: string;
  category: string;
  description: string;
  lastRun: string;
  frequency: string;
  status: 'ready' | 'processing' | 'scheduled';
  icon: React.ReactNode;
}

const Reports: React.FC = () => {
  const [selectedDateRange, setSelectedDateRange] = useState<[Dayjs | null, Dayjs | null]>([
    dayjs().startOf('month'),
    dayjs(),
  ]);
  const [selectedReport, setSelectedReport] = useState<string>('financial');

  // Mock reports
  const availableReports: Report[] = [
    {
      id: '1',
      name: 'Financial Summary',
      category: 'Financial',
      description: 'Revenue, collections, and outstanding balances',
      lastRun: '2024-01-18 09:00 AM',
      frequency: 'Daily',
      status: 'ready',
      icon: <AttachMoney />,
    },
    {
      id: '2',
      name: 'Patient Demographics',
      category: 'Clinical',
      description: 'Patient population breakdown by age, gender, and conditions',
      lastRun: '2024-01-17 06:00 PM',
      frequency: 'Weekly',
      status: 'ready',
      icon: <People />,
    },
    {
      id: '3',
      name: 'Claims Analysis',
      category: 'Billing',
      description: 'Claims submission, approval rates, and denials',
      lastRun: '2024-01-18 08:30 AM',
      frequency: 'Daily',
      status: 'processing',
      icon: <Receipt />,
    },
    {
      id: '4',
      name: 'Provider Productivity',
      category: 'Operations',
      description: 'Provider schedules, patient volume, and efficiency metrics',
      lastRun: '2024-01-15 12:00 PM',
      frequency: 'Weekly',
      status: 'ready',
      icon: <LocalHospital />,
    },
  ];

  // Mock KPI data
  const kpis = {
    revenue: {
      current: 156780,
      previous: 145230,
      change: 7.9,
      trend: 'up',
    },
    patients: {
      current: 1234,
      previous: 1189,
      change: 3.8,
      trend: 'up',
    },
    appointments: {
      current: 452,
      previous: 478,
      change: -5.4,
      trend: 'down',
    },
    claims: {
      current: 92,
      previous: 87,
      change: 5.7,
      trend: 'up',
    },
  };

  // Mock trending data
  const trendingMetrics = [
    { name: 'Average Wait Time', value: '12 min', change: -15, status: 'good' },
    { name: 'Patient Satisfaction', value: '4.6/5', change: 8, status: 'good' },
    { name: 'No-Show Rate', value: '8%', change: -12, status: 'good' },
    { name: 'Collection Rate', value: '92%', change: 3, status: 'good' },
    { name: 'Days in A/R', value: '28', change: -10, status: 'good' },
  ];

  const handleExportReport = (format: 'pdf' | 'excel' | 'csv') => {
    console.log(`Exporting report as ${format}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'success';
      case 'processing':
        return 'warning';
      case 'scheduled':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Reports & Analytics
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Practice performance insights and data analytics
        </Typography>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Monthly Revenue
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    ${(kpis.revenue.current / 1000).toFixed(1)}k
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    {kpis.revenue.trend === 'up' ? (
                      <TrendingUp color="success" fontSize="small" />
                    ) : (
                      <TrendingDown color="error" fontSize="small" />
                    )}
                    <Typography
                      variant="caption"
                      color={kpis.revenue.trend === 'up' ? 'success.main' : 'error.main'}
                      sx={{ ml: 0.5 }}
                    >
                      {kpis.revenue.change}% vs last month
                    </Typography>
                  </Box>
                </Box>
                <AttachMoney color="primary" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Active Patients
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {kpis.patients.current.toLocaleString()}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    {kpis.patients.trend === 'up' ? (
                      <TrendingUp color="success" fontSize="small" />
                    ) : (
                      <TrendingDown color="error" fontSize="small" />
                    )}
                    <Typography
                      variant="caption"
                      color={kpis.patients.trend === 'up' ? 'success.main' : 'error.main'}
                      sx={{ ml: 0.5 }}
                    >
                      {kpis.patients.change}% growth
                    </Typography>
                  </Box>
                </Box>
                <People color="info" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Appointments
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {kpis.appointments.current}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    {kpis.appointments.trend === 'up' ? (
                      <TrendingUp color="success" fontSize="small" />
                    ) : (
                      <TrendingDown color="error" fontSize="small" />
                    )}
                    <Typography
                      variant="caption"
                      color={kpis.appointments.trend === 'up' ? 'success.main' : 'error.main'}
                      sx={{ ml: 0.5 }}
                    >
                      {Math.abs(kpis.appointments.change)}% this month
                    </Typography>
                  </Box>
                </Box>
                <CalendarMonth color="warning" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Claim Approval
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {kpis.claims.current}%
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    {kpis.claims.trend === 'up' ? (
                      <TrendingUp color="success" fontSize="small" />
                    ) : (
                      <TrendingDown color="error" fontSize="small" />
                    )}
                    <Typography
                      variant="caption"
                      color={kpis.claims.trend === 'up' ? 'success.main' : 'error.main'}
                      sx={{ ml: 0.5 }}
                    >
                      {kpis.claims.change}% improvement
                    </Typography>
                  </Box>
                </Box>
                <CheckCircle color="success" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content Grid */}
      <Grid container spacing={3}>
        {/* Available Reports */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Available Reports</Typography>
                <Stack direction="row" spacing={1}>
                  <Button size="small" startIcon={<Schedule />}>
                    Schedule
                  </Button>
                  <Button size="small" startIcon={<Share />}>
                    Share
                  </Button>
                </Stack>
              </Box>

              <Grid container spacing={2}>
                {availableReports.map((report) => (
                  <Grid item xs={12} sm={6} key={report.id}>
                    <Paper
                      sx={{
                        p: 2,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' },
                        border: selectedReport === report.id ? 2 : 0,
                        borderColor: 'primary.main',
                      }}
                      onClick={() => setSelectedReport(report.id)}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                        <Box sx={{ color: 'primary.main' }}>{report.icon}</Box>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="subtitle2" fontWeight="500">
                            {report.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {report.description}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                            <Chip
                              label={report.status}
                              color={getStatusColor(report.status) as any}
                              size="small"
                            />
                            <Typography variant="caption" color="text.secondary">
                              Last: {report.lastRun}
                            </Typography>
                          </Box>
                        </Box>
                        <Stack direction="row" spacing={0.5}>
                          <IconButton size="small">
                            <FileDownload fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>

              {/* Report Controls */}
              <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={4}>
                    <DatePicker
                      label="Start Date"
                      value={selectedDateRange[0]}
                      onChange={(newValue) => setSelectedDateRange([newValue, selectedDateRange[1]])}
                      slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <DatePicker
                      label="End Date"
                      value={selectedDateRange[1]}
                      onChange={(newValue) => setSelectedDateRange([selectedDateRange[0], newValue])}
                      slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="contained"
                        size="small"
                        fullWidth
                        startIcon={<Assessment />}
                      >
                        Generate
                      </Button>
                      <IconButton color="primary" onClick={() => handleExportReport('pdf')}>
                        <PictureAsPdf />
                      </IconButton>
                      <IconButton color="primary" onClick={() => handleExportReport('excel')}>
                        <Download />
                      </IconButton>
                    </Stack>
                  </Grid>
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Trending Metrics */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Trending Metrics
              </Typography>
              <List dense>
                {trendingMetrics.map((metric, index) => (
                  <React.Fragment key={index}>
                    <ListItem>
                      <ListItemIcon>
                        {metric.change > 0 ? (
                          <TrendingUp color="success" fontSize="small" />
                        ) : (
                          <TrendingDown color="error" fontSize="small" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={metric.name}
                        secondary={metric.value}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                      <Typography
                        variant="caption"
                        color={metric.change > 0 ? 'success.main' : 'error.main'}
                      >
                        {Math.abs(metric.change)}%
                      </Typography>
                    </ListItem>
                    {index < trendingMetrics.length - 1 && <Divider variant="inset" component="li" />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Stack spacing={1}>
                <Button
                  fullWidth
                  variant="outlined"
                  size="small"
                  startIcon={<Timeline />}
                  sx={{ justifyContent: 'flex-start' }}
                >
                  Revenue Forecast
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  size="small"
                  startIcon={<PieChart />}
                  sx={{ justifyContent: 'flex-start' }}
                >
                  Payer Mix Analysis
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  size="small"
                  startIcon={<BarChart />}
                  sx={{ justifyContent: 'flex-start' }}
                >
                  Provider Comparison
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  size="small"
                  startIcon={<Warning />}
                  sx={{ justifyContent: 'flex-start' }}
                >
                  Denial Patterns
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Performance Table */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Provider Performance Summary
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Provider</TableCell>
                      <TableCell align="right">Patients Seen</TableCell>
                      <TableCell align="right">Revenue</TableCell>
                      <TableCell align="right">Avg Wait Time</TableCell>
                      <TableCell align="right">Satisfaction</TableCell>
                      <TableCell align="right">Efficiency</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Dr. Sarah Johnson</TableCell>
                      <TableCell align="right">142</TableCell>
                      <TableCell align="right">$45,280</TableCell>
                      <TableCell align="right">8 min</TableCell>
                      <TableCell align="right">4.8/5</TableCell>
                      <TableCell align="right">
                        <LinearProgress variant="determinate" value={94} sx={{ width: 100 }} />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Dr. Michael Chen</TableCell>
                      <TableCell align="right">128</TableCell>
                      <TableCell align="right">$41,920</TableCell>
                      <TableCell align="right">12 min</TableCell>
                      <TableCell align="right">4.6/5</TableCell>
                      <TableCell align="right">
                        <LinearProgress variant="determinate" value={88} sx={{ width: 100 }} />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Dr. Emily Brown</TableCell>
                      <TableCell align="right">156</TableCell>
                      <TableCell align="right">$48,360</TableCell>
                      <TableCell align="right">10 min</TableCell>
                      <TableCell align="right">4.7/5</TableCell>
                      <TableCell align="right">
                        <LinearProgress variant="determinate" value={91} sx={{ width: 100 }} />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Reports;