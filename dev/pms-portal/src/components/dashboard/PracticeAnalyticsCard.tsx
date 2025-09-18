import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Stack,
  Paper
} from '@mui/material';
import {
  Analytics,
  TrendingDown,
  TrendingUp,
  Assessment,
  ShowChart
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

const PracticeAnalyticsCard: React.FC = () => {
  const analyticsData = [
    { month: 'Jan', patients: 450, revenue: 85000, satisfaction: 82 },
    { month: 'Feb', patients: 470, revenue: 88000, satisfaction: 84 },
    { month: 'Mar', patients: 460, revenue: 86000, satisfaction: 83 },
    { month: 'Apr', patients: 480, revenue: 91000, satisfaction: 85 },
    { month: 'May', patients: 475, revenue: 89000, satisfaction: 86 },
    { month: 'Jun', patients: 465, revenue: 87000, satisfaction: 84 },
  ];

  const metrics = [
    { label: 'Patient Volume', value: '-2.1%', trend: 'down' },
    { label: 'Revenue', value: '+3.5%', trend: 'up' },
    { label: 'Satisfaction', value: '+1.2%', trend: 'up' },
  ];

  return (
    <Card
      sx={{
        height: 380,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        '&:hover': {
          boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
          transform: 'translateY(-2px)'
        },
        transition: 'all 0.3s ease-in-out'
      }}
    >
      {/* Header with Icon */}
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          bgcolor: 'info.main',
          borderRadius: '50%',
          p: 1,
          color: 'white'
        }}
      >
        <Analytics sx={{ fontSize: 20 }} />
      </Box>

      <CardContent sx={{ flexGrow: 1 }}>
        <Typography
          variant="h6"
          gutterBottom
          fontWeight="bold"
          sx={{ color: 'text.primary', mb: 2 }}
        >
          Practice Performance Dashboard
        </Typography>

        <Stack spacing={1} sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Assessment sx={{ fontSize: 16, color: 'primary.main' }} />
            <Typography variant="body2" color="text.secondary">
              Key performance indicators
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShowChart sx={{ fontSize: 16, color: 'warning.main' }} />
            <Typography variant="body2" color="text.secondary">
              Trend analysis
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Analytics sx={{ fontSize: 16, color: 'success.main' }} />
            <Typography variant="body2" color="text.secondary">
              Financial forecasting
            </Typography>
          </Box>
        </Stack>

        {/* Analytics Chart */}
        <Box sx={{ height: 140, mb: 2 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={analyticsData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <defs>
                <linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2196f3" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#2196f3" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4caf50" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#4caf50" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10 }}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e0e0e0',
                  borderRadius: 8,
                  fontSize: 12
                }}
              />
              <Area
                type="monotone"
                dataKey="patients"
                stroke="#2196f3"
                fill="url(#colorPatients)"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="satisfaction"
                stroke="#ff9800"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Box>

        {/* Key Metrics */}
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
          {metrics.map((metric) => (
            <Chip
              key={metric.label}
              icon={
                metric.trend === 'up' ? (
                  <TrendingUp sx={{ fontSize: 14 }} />
                ) : (
                  <TrendingDown sx={{ fontSize: 14 }} />
                )
              }
              label={`${metric.label}: ${metric.value}`}
              size="small"
              color={metric.trend === 'up' ? 'success' : 'warning'}
              variant="outlined"
              sx={{ fontSize: '0.7rem' }}
            />
          ))}
        </Box>

        {/* Insights */}
        <Paper
          sx={{
            p: 1.5,
            bgcolor: 'info.light',
            color: 'white',
            borderRadius: 1
          }}
        >
          <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Assessment sx={{ fontSize: 14 }} />
            Predictive model suggests 8% revenue increase with optimized scheduling
          </Typography>
        </Paper>
      </CardContent>
    </Card>
  );
};

export default PracticeAnalyticsCard;