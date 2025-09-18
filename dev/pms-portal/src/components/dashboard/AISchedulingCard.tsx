import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Stack,
  Avatar,
  Divider,
  IconButton
} from '@mui/material';
import {
  CalendarToday,
  Schedule,
  Person,
  MoreVert,
  AutoAwesome,
  EventAvailable
} from '@mui/icons-material';

const AISchedulingCard: React.FC = () => {
  const scheduleItems = [
    { id: 1, date: 'Apr 8', day: 'Monday', time: '9:00 AM', patient: null, status: 'available' },
    { id: 2, date: 'Apr 8', day: 'Monday', time: '10:00 AM', patient: 'Noah Johnson', status: 'booked', type: 'Follow-up' },
    { id: 3, date: 'Apr 8', day: 'Monday', time: '11:00 AM', patient: 'Emma Wilson', status: 'urgent', type: 'Urgent' },
    { id: 4, date: 'Apr 8', day: 'Monday', time: '2:00 PM', patient: 'Oliver Brown', status: 'booked', type: 'New Patient' },
    { id: 5, date: 'Apr 8', day: 'Monday', time: '3:00 PM', patient: null, status: 'adaptive', type: 'AI Suggested' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'urgent': return 'error';
      case 'booked': return 'primary';
      case 'available': return 'success';
      case 'adaptive': return 'warning';
      default: return 'default';
    }
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
          bgcolor: 'primary.main',
          borderRadius: '50%',
          p: 1,
          color: 'white'
        }}
      >
        <AutoAwesome sx={{ fontSize: 20 }} />
      </Box>

      <CardContent sx={{ flexGrow: 1, p: 2 }}>
        <Typography
          variant="h6"
          gutterBottom
          fontWeight="bold"
          sx={{ color: 'text.primary', mb: 2 }}
        >
          Intelligent Scheduling System
        </Typography>

        <Stack spacing={1} sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EventAvailable sx={{ fontSize: 16, color: 'primary.main' }} />
            <Typography variant="body2" color="text.secondary">
              Online appointment booking
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Schedule sx={{ fontSize: 16, color: 'success.main' }} />
            <Typography variant="body2" color="text.secondary">
              Resource management
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoAwesome sx={{ fontSize: 16, color: 'warning.main' }} />
            <Typography variant="body2" color="text.secondary">
              Smart scheduling optimization
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ my: 1.5 }} />

        {/* Schedule List */}
        <Stack spacing={0.5} sx={{ maxHeight: 180, overflowY: 'auto' }}>
          {scheduleItems.map((item) => (
            <Box
              key={item.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 0.75,
                borderRadius: 1,
                bgcolor: item.patient ? 'grey.50' : 'transparent',
                border: '1px solid',
                borderColor: item.patient ? 'grey.200' : 'transparent',
                '&:hover': {
                  bgcolor: 'grey.50',
                  borderColor: 'grey.300'
                },
                transition: 'all 0.2s'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
                <Avatar
                  sx={{
                    width: 28,
                    height: 28,
                    bgcolor: item.patient ? 'primary.light' : 'grey.300',
                    fontSize: '0.75rem'
                  }}
                >
                  {item.patient ? item.patient.split(' ').map(n => n[0]).join('') : <Person sx={{ fontSize: 16 }} />}
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" fontWeight={item.patient ? 500 : 400}>
                    {item.patient || 'Available Slot'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.time} {item.type && `• ${item.type}`}
                  </Typography>
                </Box>
              </Box>
              <Chip
                label={item.status}
                size="small"
                color={getStatusColor(item.status)}
                variant={item.status === 'available' ? 'outlined' : 'filled'}
                sx={{
                  fontSize: '0.65rem',
                  height: 20,
                  textTransform: 'capitalize'
                }}
              />
            </Box>
          ))}
        </Stack>

        <Box sx={{ mt: 2, p: 1, bgcolor: 'primary.light', borderRadius: 1 }}>
          <Typography variant="caption" color="white" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <AutoAwesome sx={{ fontSize: 14 }} />
            AI suggests opening 3:00 PM slot based on demand patterns
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default AISchedulingCard;