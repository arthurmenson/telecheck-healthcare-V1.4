import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { TrendingUp, Schedule, AutoAwesome } from '@mui/icons-material';

const AIPatientFlowCard: React.FC = () => {
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

  const statusData = [
    { name: 'Pending', value: 25, color: '#ff9800' },
    { name: 'Accepted', value: 60, color: '#4caf50' },
    { name: 'Denied', value: 15, color: '#f44336' }
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
          bgcolor: 'primary.main',
          borderRadius: '50%',
          p: 1,
          color: 'white'
        }}
      >
        <AutoAwesome sx={{ fontSize: 20 }} />
      </Box>

      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        <Typography
          variant="h6"
          gutterBottom
          fontWeight="bold"
          sx={{ color: 'text.primary', mb: 2 }}
        >
          AI Patient Flow Engine
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            • Predicting patient volume throughout
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            • Auto booking scheduling slots
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            • Handle overbooking alerts
          </Typography>
        </Box>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 1, fontWeight: 500 }}
        >
          Scheduled hours
        </Typography>

        <Box sx={{ height: 100, mb: 2 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={flowData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <XAxis
                dataKey="time"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
              />
              <YAxis hide />
              <Bar
                dataKey="volume"
                fill="#2196f3"
                radius={[4, 4, 0, 0]}
                opacity={0.8}
              />
            </BarChart>
          </ResponsiveContainer>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ position: 'relative', width: 80, height: 80 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={25}
                  outerRadius={35}
                  dataKey="value"
                  startAngle={90}
                  endAngle={450}
                >
                  {statusData.map((entry, index) => (
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
                fontWeight: 'bold',
                color: 'primary.main'
              }}
            >
              56%
            </Typography>
          </Box>

          <Box sx={{ flexGrow: 1 }}>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
              <Chip
                label="Pending 25%"
                size="small"
                sx={{ bgcolor: '#fff3e0', color: '#e65100', fontSize: '0.7rem' }}
              />
              <Chip
                label="Accepted 60%"
                size="small"
                sx={{ bgcolor: '#e8f5e8', color: '#2e7d32', fontSize: '0.7rem' }}
              />
            </Box>
            <Chip
              label="Denied 10%"
              size="small"
              sx={{ bgcolor: '#ffebee', color: '#c62828', fontSize: '0.7rem' }}
            />
          </Box>
        </Box>

        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingUp sx={{ fontSize: 16, color: 'success.main' }} />
          <Typography variant="body2" color="success.main" fontWeight="500">
            +12% efficiency this week
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default AIPatientFlowCard;