import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Alert,
  Chip,
  Stack,
  LinearProgress
} from '@mui/material';
import {
  Warning,
  CheckCircle,
  Shield,
  ReportProblem,
  Security
} from '@mui/icons-material';

const DynamicComplianceCard: React.FC = () => {
  const complianceScore = 78; // Overall compliance score

  const complianceAlerts = [
    { id: 1, severity: 'warning', message: 'Privacy training overdue', icon: <Warning /> },
    { id: 2, severity: 'warning', message: 'Incomplete SMS consent policy', icon: <Warning /> },
    { id: 3, severity: 'warning', message: 'Incomplete EM documentation', icon: <Warning /> },
  ];

  const complianceMetrics = [
    { label: 'HIPAA', status: 'compliant', score: 92 },
    { label: 'SOC 2', status: 'compliant', score: 88 },
    { label: 'ONC', status: 'pending', score: 65 },
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
          bgcolor: 'warning.main',
          borderRadius: '50%',
          p: 1,
          color: 'white'
        }}
      >
        <Shield sx={{ fontSize: 20 }} />
      </Box>

      <CardContent sx={{ flexGrow: 1 }}>
        <Typography
          variant="h6"
          gutterBottom
          fontWeight="bold"
          sx={{ color: 'text.primary', mb: 2 }}
        >
          Regulatory Compliance Monitor
        </Typography>

        <Stack spacing={1} sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Security sx={{ fontSize: 16, color: 'primary.main' }} />
            <Typography variant="body2" color="text.secondary">
              Post time rule monitoring
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
            <Typography variant="body2" color="text.secondary">
              Compliance alerts
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
            <Typography variant="body2" color="text.secondary">
              Auto-generated audit tags
            </Typography>
          </Box>
        </Stack>

        {/* Compliance Score */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Overall Compliance Score
            </Typography>
            <Typography variant="body2" fontWeight="bold" color="warning.main">
              {complianceScore}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={complianceScore}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                bgcolor: complianceScore >= 80 ? 'success.main' : 'warning.main',
                borderRadius: 4
              }
            }}
          />
        </Box>

        {/* Compliance Alerts */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
          {complianceAlerts.map((alert) => (
            <Alert
              key={alert.id}
              severity={alert.severity as any}
              icon={alert.icon}
              sx={{
                fontSize: '0.75rem',
                py: 0.5,
                '& .MuiAlert-icon': {
                  fontSize: '1rem',
                  mr: 0.5
                }
              }}
            >
              {alert.message}
            </Alert>
          ))}
        </Box>

        {/* Compliance Status Chips */}
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {complianceMetrics.map((metric) => (
            <Chip
              key={metric.label}
              label={`${metric.label}: ${metric.score}%`}
              size="small"
              color={
                metric.status === 'compliant'
                  ? 'success'
                  : metric.status === 'pending'
                  ? 'warning'
                  : 'error'
              }
              variant="outlined"
              sx={{ fontSize: '0.7rem' }}
            />
          ))}
        </Box>

        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReportProblem sx={{ fontSize: 16, color: 'warning.main' }} />
          <Typography variant="body2" color="warning.main" fontWeight="500">
            3 items require attention
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default DynamicComplianceCard;