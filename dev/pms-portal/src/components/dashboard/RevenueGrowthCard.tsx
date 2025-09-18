import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Stack,
  LinearProgress
} from '@mui/material';
import {
  TrendingUp,
  AttachMoney,
  AutoGraph,
  Campaign,
  Loyalty
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell
} from 'recharts';

const RevenueGrowthCard: React.FC = () => {
  const revenueData = [
    { month: 'Jan', revenue: 85000, growth: 5 },
    { month: 'Feb', revenue: 88000, growth: 3.5 },
    { month: 'Mar', revenue: 91000, growth: 3.4 },
    { month: 'Apr', revenue: 93000, growth: 2.2 },
    { month: 'May', revenue: 96000, growth: 3.2 },
    { month: 'Jun', revenue: 99000, growth: 3.1 },
    { month: 'Jul', revenue: 102000, growth: 3.0 },
    { month: 'Aug', revenue: 105000, growth: 2.9 },
  ];

  const automations = [
    { label: 'Native text building', status: 'active', impact: '+$12K/mo' },
    { label: 'Patient retention', status: 'active', impact: '+$8K/mo' },
    { label: 'Revenue ROI', status: 'pending', impact: '+$15K/mo' },
  ];

  const colors = ['#e3f2fd', '#bbdefb', '#90caf9', '#64b5f6', '#42a5f5', '#2196f3', '#1e88e5', '#1976d2'];

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
          bgcolor: 'success.main',
          borderRadius: '50%',
          p: 1,
          color: 'white'
        }}
      >
        <AutoGraph sx={{ fontSize: 20 }} />
      </Box>

      <CardContent sx={{ flexGrow: 1 }}>
        <Typography
          variant="h6"
          gutterBottom
          fontWeight="bold"
          sx={{ color: 'text.primary', mb: 2 }}
        >
          Financial Management Suite
        </Typography>

        <Stack spacing={1} sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Campaign sx={{ fontSize: 16, color: 'primary.main' }} />
            <Typography variant="body2" color="text.secondary">
              Automated billing workflows
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Loyalty sx={{ fontSize: 16, color: 'success.main' }} />
            <Typography variant="body2" color="text.secondary">
              Revenue optimization
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AttachMoney sx={{ fontSize: 16, color: 'warning.main' }} />
            <Typography variant="body2" color="text.secondary">
              Financial analytics
            </Typography>
          </Box>
        </Stack>

        {/* Revenue Growth Chart */}
        <Box sx={{ height: 100, mb: 2 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <XAxis dataKey="month" hide />
              <YAxis hide />
              <Bar dataKey="growth" radius={[4, 4, 0, 0]}>
                {revenueData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>

        {/* Automation Status */}
        <Stack spacing={1} sx={{ mb: 2 }}>
          {automations.map((automation) => (
            <Box
              key={automation.label}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 1,
                bgcolor: 'grey.50',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'grey.200'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: automation.status === 'active' ? 'success.main' : 'warning.main'
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  {automation.label}
                </Typography>
              </Box>
              <Chip
                label={automation.impact}
                size="small"
                color="success"
                variant="outlined"
                sx={{ fontSize: '0.7rem', height: 20 }}
              />
            </Box>
          ))}
        </Stack>

        {/* Total Impact */}
        <Box sx={{ p: 1.5, bgcolor: 'success.light', borderRadius: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="white" fontWeight="bold">
              Total Revenue Impact
            </Typography>
            <Typography variant="h6" color="white" fontWeight="bold">
              +$35K/mo
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={75}
            sx={{
              mt: 1,
              height: 6,
              borderRadius: 3,
              bgcolor: 'rgba(255,255,255,0.3)',
              '& .MuiLinearProgress-bar': {
                bgcolor: 'white',
                borderRadius: 3
              }
            }}
          />
        </Box>

        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingUp sx={{ fontSize: 16, color: 'success.main' }} />
          <Typography variant="body2" color="success.main" fontWeight="500">
            +18.2% YoY growth
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default RevenueGrowthCard;