import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Paper,
  Avatar,
  Chip,
  Stack,
  IconButton
} from '@mui/material';
import {
  Chat,
  Translate,
  TrendingUp,
  Psychology,
  SentimentSatisfied,
  Send
} from '@mui/icons-material';

const PatientEngagementCard: React.FC = () => {
  const satisfactionScore = 87;

  const chatMessages = [
    {
      id: 1,
      message: "Can my symptoms be managed through medication changes?",
      time: "9 sec ago",
      sender: 'patient'
    }
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
          bgcolor: 'secondary.main',
          borderRadius: '50%',
          p: 1,
          color: 'white'
        }}
      >
        <Chat sx={{ fontSize: 20 }} />
      </Box>

      <CardContent sx={{ flexGrow: 1 }}>
        <Typography
          variant="h6"
          gutterBottom
          fontWeight="bold"
          sx={{ color: 'text.primary', mb: 2 }}
        >
          Patient Communication Hub
        </Typography>

        <Stack spacing={1} sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Psychology sx={{ fontSize: 16, color: 'primary.main' }} />
            <Typography variant="body2" color="text.secondary">
              Secure messaging portal
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUp sx={{ fontSize: 16, color: 'success.main' }} />
            <Typography variant="body2" color="text.secondary">
              Engagement metrics
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Translate sx={{ fontSize: 16, color: 'info.main' }} />
            <Typography variant="body2" color="text.secondary">
              Multi-channel communication
            </Typography>
          </Box>
        </Stack>

        {/* Satisfaction Score */}
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Patient Satisfaction
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
              <Typography variant="h4" color="success.main" fontWeight="bold">
                {satisfactionScore}%
              </Typography>
              <Chip
                icon={<TrendingUp sx={{ fontSize: 14 }} />}
                label="+5%"
                size="small"
                color="success"
                variant="outlined"
                sx={{ fontSize: '0.7rem' }}
              />
            </Box>
          </Box>
          <SentimentSatisfied sx={{ fontSize: 48, color: 'success.main' }} />
        </Box>

        {/* Chat Interface */}
        <Paper
          sx={{
            p: 2,
            bgcolor: 'primary.main',
            color: 'white',
            borderRadius: 2,
            position: 'relative',
            mb: 2
          }}
        >
          <Typography variant="body2" sx={{ mb: 1 }}>
            {chatMessages[0].message}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            {chatMessages[0].time}
          </Typography>
          <Box
            sx={{
              position: 'absolute',
              bottom: -8,
              left: 20,
              width: 0,
              height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: '8px solid',
              borderTopColor: 'primary.main'
            }}
          />
        </Paper>

        {/* AI Response Input */}
        <Paper
          sx={{
            p: 1,
            display: 'flex',
            alignItems: 'center',
            bgcolor: 'grey.50',
            border: '1px solid',
            borderColor: 'grey.200'
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1, px: 1 }}>
            AI is typing...
          </Typography>
          <IconButton size="small" color="primary">
            <Send sx={{ fontSize: 18 }} />
          </IconButton>
        </Paper>

        {/* Feature Icons */}
        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Avatar sx={{ bgcolor: 'primary.light', width: 32, height: 32 }}>
            <Chat sx={{ fontSize: 16 }} />
          </Avatar>
          <Avatar sx={{ bgcolor: 'secondary.light', width: 32, height: 32 }}>
            <Translate sx={{ fontSize: 16 }} />
          </Avatar>
          <Avatar sx={{ bgcolor: 'success.light', width: 32, height: 32 }}>
            <Psychology sx={{ fontSize: 16 }} />
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );
};

export default PatientEngagementCard;