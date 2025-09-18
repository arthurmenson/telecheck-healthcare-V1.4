import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Paper,
  Chip,
  Avatar,
  Stack,
  Divider
} from '@mui/material';
import {
  Description,
  Psychology,
  Star,
  ChatBubble,
  AccessTime
} from '@mui/icons-material';

const AmbientClinicalDocsCard: React.FC = () => {
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
        <Psychology sx={{ fontSize: 20 }} />
      </Box>

      <CardContent sx={{ flexGrow: 1 }}>
        <Typography
          variant="h6"
          gutterBottom
          fontWeight="bold"
          sx={{ color: 'text.primary', mb: 2 }}
        >
          Clinical Documentation System
        </Typography>

        <Stack spacing={1} sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Description sx={{ fontSize: 16, color: 'primary.main' }} />
            <Typography variant="body2" color="text.secondary">
              Automated clinical notes
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Psychology sx={{ fontSize: 16, color: 'primary.main' }} />
            <Typography variant="body2" color="text.secondary">
              Voice-to-text transcription
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Star sx={{ fontSize: 16, color: 'warning.main' }} />
            <Typography variant="body2" color="text.secondary">
              Template management
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
            Progress Note
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
              JD
            </Avatar>
            <Box>
              <Typography variant="subtitle2" fontWeight="bold">
                John Doe
              </Typography>
              <Typography variant="caption" color="text.secondary">
                ID: 12345 • Age: 45
              </Typography>
            </Box>
          </Box>
        </Box>

        <Paper
          sx={{
            p: 2,
            mb: 2,
            bgcolor: 'grey.50',
            border: '1px solid',
            borderColor: 'grey.200'
          }}
        >
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Subjects:</strong> Les on Mo, prescription, behavioral...
          </Typography>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            <strong>Assessment:</strong> Multiple lab work, trending...
          </Typography>
          <Chip
            icon={<Star sx={{ fontSize: 14 }} />}
            label="Sentiment analysis"
            size="small"
            color="warning"
            variant="outlined"
            sx={{ fontSize: '0.75rem' }}
          />
        </Paper>

        <Paper
          sx={{
            p: 2,
            bgcolor: 'primary.main',
            color: 'white',
            borderRadius: 2,
            position: 'relative'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'start', gap: 1, mb: 1 }}>
            <ChatBubble sx={{ fontSize: 16, mt: 0.5 }} />
            <Typography variant="body2" sx={{ flexGrow: 1 }}>
              May I harmonize my medication preferences?
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <AccessTime sx={{ fontSize: 12 }} />
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              3 min ago
            </Typography>
          </Box>
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

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip label="AI Generated" size="small" color="success" variant="outlined" />
            <Chip label="Reviewed" size="small" color="primary" variant="outlined" />
          </Box>
          <Typography variant="caption" color="text.secondary">
            Confidence: 94%
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default AmbientClinicalDocsCard;