import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Stack,
  Avatar,
  AvatarGroup,
  LinearProgress
} from '@mui/material';
import {
  Hub,
  Science,
  LocalPharmacy,
  Receipt,
  Api,
  CheckCircle,
  Sync
} from '@mui/icons-material';

const MultiIntegrationCard: React.FC = () => {
  const integrations = [
    {
      category: 'Healthcare',
      items: [
        { name: 'Labs', icon: <Science />, status: 'connected', count: 3 },
        { name: 'Pharmacy', icon: <LocalPharmacy />, status: 'connected', count: 5 },
        { name: 'Clearinghouse', icon: <Receipt />, status: 'connected', count: 2 },
      ]
    },
    {
      category: 'Business',
      items: [
        { name: 'Patient Portal', status: 'connected' },
        { name: 'Invoicing', status: 'connected' },
        { name: 'Analytics', status: 'syncing' },
      ]
    }
  ];

  const stats = {
    total: 11,
    connected: 10,
    syncing: 1,
    percentage: 91
  };

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
          bgcolor: 'secondary.main',
          borderRadius: '50%',
          p: 1,
          color: 'white'
        }}
      >
        <Hub sx={{ fontSize: 20 }} />
      </Box>

      <CardContent sx={{ flexGrow: 1 }}>
        <Typography
          variant="h6"
          gutterBottom
          fontWeight="bold"
          sx={{ color: 'text.primary', mb: 2 }}
        >
          Integration Management Center
        </Typography>

        <Stack spacing={1} sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
            <Typography variant="body2" color="text.secondary">
              Healthcare system integrations
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Api sx={{ fontSize: 16, color: 'primary.main' }} />
            <Typography variant="body2" color="text.secondary">
              Third-party connectors
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Hub sx={{ fontSize: 16, color: 'secondary.main' }} />
            <Typography variant="body2" color="text.secondary">
              API management platform
            </Typography>
          </Box>
        </Stack>

        {/* Integration Status */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Integration Health
            </Typography>
            <Typography variant="body2" fontWeight="bold" color="success.main">
              {stats.percentage}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={stats.percentage}
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
          <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {stats.connected} Connected
            </Typography>
            <Typography variant="caption" color="warning.main">
              {stats.syncing} Syncing
            </Typography>
          </Box>
        </Box>

        {/* Integration Categories */}
        {integrations.map((category) => (
          <Box key={category.category} sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ mb: 1 }}>
              {category.category.toUpperCase()}
            </Typography>
            <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
              {category.items.map((item) => (
                <Chip
                  key={item.name}
                  icon={item.icon || <Api sx={{ fontSize: 14 }} />}
                  label={`${item.name}${item.count ? ` (${item.count})` : ''}`}
                  size="small"
                  color={item.status === 'syncing' ? 'warning' : 'success'}
                  variant="outlined"
                  sx={{
                    fontSize: '0.7rem',
                    '& .MuiChip-icon': {
                      fontSize: 14
                    }
                  }}
                />
              ))}
            </Stack>
          </Box>
        ))}

        {/* Integration Logos */}
        <Box sx={{ mt: 2 }}>
          <AvatarGroup max={6} sx={{ justifyContent: 'flex-start' }}>
            <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.main', fontSize: '0.65rem' }}>LC</Avatar>
            <Avatar sx={{ width: 28, height: 28, bgcolor: 'secondary.main', fontSize: '0.65rem' }}>QD</Avatar>
            <Avatar sx={{ width: 28, height: 28, bgcolor: 'warning.main', fontSize: '0.65rem' }}>CH</Avatar>
            <Avatar sx={{ width: 28, height: 28, bgcolor: 'info.main', fontSize: '0.65rem' }}>EP</Avatar>
            <Avatar sx={{ width: 28, height: 28, bgcolor: 'success.main', fontSize: '0.65rem' }}>CR</Avatar>
            <Avatar sx={{ width: 28, height: 28, bgcolor: 'grey.500', fontSize: '0.65rem' }}>+6</Avatar>
          </AvatarGroup>
        </Box>

        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Sync
            sx={{
              fontSize: 16,
              color: 'primary.main',
              '@keyframes spin': {
                from: {
                  transform: 'rotate(0deg)',
                },
                to: {
                  transform: 'rotate(360deg)',
                },
              },
              animation: 'spin 2s linear infinite',
            }}
          />
          <Typography variant="body2" color="primary.main" fontWeight="500">
            Real-time sync active
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default MultiIntegrationCard;