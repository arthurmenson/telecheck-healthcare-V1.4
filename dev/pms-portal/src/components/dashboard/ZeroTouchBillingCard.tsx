import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  LinearProgress,
  Stack
} from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis
} from 'recharts';
import { Payment, AutoFixHigh, CheckCircle } from '@mui/icons-material';

const ZeroTouchBillingCard: React.FC = () => {
  const billingData = [
    { name: 'Accepted', value: 60, color: '#4caf50' },
    { name: 'Pending', value: 25, color: '#ff9800' },
    { name: 'Denied', value: 15, color: '#f44336' }
  ];

  const processData = [
    { name: 'Jan', automated: 45 },
    { name: 'Feb', automated: 52 },
    { name: 'Mar', automated: 61 },
    { name: 'Apr', automated: 68 },
    { name: 'May', automated: 75 },
    { name: 'Jun', automated: 82 }
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
          bgcolor: 'success.main',
          borderRadius: '50%',
          p: 1,
          color: 'white'
        }}
      >
        <AutoFixHigh sx={{ fontSize: 20 }} />
      </Box>

      <CardContent sx={{ flexGrow: 1 }}>
        <Typography
          variant="h6"
          gutterBottom
          fontWeight="bold"
          sx={{ color: 'text.primary', mb: 2 }}
        >
          Revenue Cycle Management
        </Typography>

        <Stack spacing={1} sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
            <Typography variant="body2" color="text.secondary">
              Automated claims processing
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
            <Typography variant="body2" color="text.secondary">
              Electronic remittance
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
            <Typography variant="body2" color="text.secondary">
              Payment reconciliation
            </Typography>
          </Box>
        </Stack>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ position: 'relative', width: 100, height: 100 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={billingData}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={45}
                  dataKey="value"
                  startAngle={90}
                  endAngle={450}
                >
                  {billingData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <Typography
              variant="h3"
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                fontWeight: 'bold',
                color: 'primary.main',
                fontSize: '1.8rem'
              }}
            >
              56%
            </Typography>
          </Box>

          <Box sx={{ flexGrow: 1, ml: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Automation Progress
            </Typography>
            <Box sx={{ height: 60 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={processData}>
                  <XAxis dataKey="name" hide />
                  <YAxis hide />
                  <Area
                    type="monotone"
                    dataKey="automated"
                    stroke="#4caf50"
                    fill="#4caf50"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Box>
        </Box>

        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
          <Chip
            label="Pending 25%"
            size="small"
            sx={{ bgcolor: '#fff3e0', color: '#e65100' }}
          />
          <Chip
            label="Accepted 60%"
            size="small"
            sx={{ bgcolor: '#e8f5e8', color: '#2e7d32' }}
          />
          <Chip
            label="Denied 10%"
            size="small"
            sx={{ bgcolor: '#ffebee', color: '#c62828' }}
          />
        </Stack>

        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Today's Processing
          </Typography>
          <LinearProgress
            variant="determinate"
            value={75}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                bgcolor: 'success.main',
                borderRadius: 4
              }
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
            127 of 170 claims processed automatically
          </Typography>
        </Box>

        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Payment sx={{ fontSize: 16, color: 'primary.main' }} />
          <Typography variant="body2" color="primary.main" fontWeight="500">
            $42,850 processed today
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ZeroTouchBillingCard;