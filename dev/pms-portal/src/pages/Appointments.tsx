import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Grid,
  Avatar,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Stack,
} from '@mui/material';
import {
  Add,
  Search,
  FilterList,
  Edit,
  Delete,
  MoreVert,
  CalendarToday,
  AccessTime,
  Person,
  Phone,
  Email,
  CheckCircle,
  Cancel,
  Schedule,
  EventAvailable,
  EventBusy,
} from '@mui/icons-material';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import dayjs, { Dayjs } from 'dayjs';

interface Appointment {
  id: string;
  patientName: string;
  patientId: string;
  patientEmail: string;
  patientPhone: string;
  provider: string;
  date: string;
  time: string;
  duration: number;
  type: 'consultation' | 'follow-up' | 'procedure' | 'emergency';
  status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  reason: string;
  notes?: string;
  insurance?: string;
}

const Appointments: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(dayjs());
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');

  // Mock data
  const appointments: Appointment[] = [
    {
      id: '1',
      patientName: 'John Smith',
      patientId: 'P001',
      patientEmail: 'john.smith@email.com',
      patientPhone: '(555) 123-4567',
      provider: 'Dr. Sarah Johnson',
      date: '2024-01-18',
      time: '09:00 AM',
      duration: 30,
      type: 'consultation',
      status: 'confirmed',
      reason: 'Annual checkup',
      insurance: 'Blue Cross Blue Shield',
    },
    {
      id: '2',
      patientName: 'Emma Wilson',
      patientId: 'P002',
      patientEmail: 'emma.wilson@email.com',
      patientPhone: '(555) 234-5678',
      provider: 'Dr. Michael Chen',
      date: '2024-01-18',
      time: '10:30 AM',
      duration: 45,
      type: 'follow-up',
      status: 'scheduled',
      reason: 'Post-surgery follow-up',
      insurance: 'Aetna',
    },
    {
      id: '3',
      patientName: 'Robert Davis',
      patientId: 'P003',
      patientEmail: 'robert.davis@email.com',
      patientPhone: '(555) 345-6789',
      provider: 'Dr. Sarah Johnson',
      date: '2024-01-18',
      time: '11:00 AM',
      duration: 30,
      type: 'consultation',
      status: 'in-progress',
      reason: 'Diabetes management',
      insurance: 'UnitedHealth',
    },
    {
      id: '4',
      patientName: 'Lisa Martinez',
      patientId: 'P004',
      patientEmail: 'lisa.martinez@email.com',
      patientPhone: '(555) 456-7890',
      provider: 'Dr. Emily Brown',
      date: '2024-01-18',
      time: '02:00 PM',
      duration: 60,
      type: 'procedure',
      status: 'scheduled',
      reason: 'Minor procedure',
      insurance: 'Cigna',
    },
    {
      id: '5',
      patientName: 'James Anderson',
      patientId: 'P005',
      patientEmail: 'james.anderson@email.com',
      patientPhone: '(555) 567-8901',
      provider: 'Dr. Michael Chen',
      date: '2024-01-18',
      time: '03:30 PM',
      duration: 30,
      type: 'consultation',
      status: 'cancelled',
      reason: 'Flu symptoms',
      notes: 'Patient cancelled due to emergency',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'success';
      case 'scheduled':
        return 'info';
      case 'in-progress':
        return 'warning';
      case 'completed':
        return 'default';
      case 'cancelled':
        return 'error';
      case 'no-show':
        return 'error';
      default:
        return 'default';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'consultation':
        return <Person fontSize="small" />;
      case 'follow-up':
        return <EventAvailable fontSize="small" />;
      case 'procedure':
        return <EventBusy fontSize="small" />;
      case 'emergency':
        return <Cancel fontSize="small" />;
      default:
        return <CalendarToday fontSize="small" />;
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, appointment: Appointment) => {
    setAnchorEl(event.currentTarget);
    setSelectedAppointment(appointment);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedAppointment(null);
  };

  const handleAddAppointment = () => {
    setDialogMode('add');
    setOpenDialog(true);
  };

  const handleEditAppointment = () => {
    setDialogMode('edit');
    setOpenDialog(true);
    handleMenuClose();
  };

  const handleDeleteAppointment = () => {
    // Handle delete
    console.log('Delete appointment:', selectedAppointment);
    handleMenuClose();
  };

  const filteredAppointments = appointments.filter(appointment => {
    const matchesSearch = appointment.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          appointment.provider.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || appointment.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: appointments.length,
    confirmed: appointments.filter(a => a.status === 'confirmed').length,
    scheduled: appointments.filter(a => a.status === 'scheduled').length,
    completed: appointments.filter(a => a.status === 'completed').length,
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Appointment Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Schedule and manage patient appointments
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Today's Total
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.total}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main' }}>
                  <CalendarToday />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Confirmed
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="success.main">
                    {stats.confirmed}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.light', color: 'success.main' }}>
                  <CheckCircle />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Scheduled
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="info.main">
                    {stats.scheduled}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'info.light', color: 'info.main' }}>
                  <Schedule />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Completed
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="grey.600">
                    {stats.completed}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'grey.300', color: 'grey.600' }}>
                  <EventAvailable />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters and Actions */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search patients or providers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <DatePicker
                label="Select Date"
                value={selectedDate}
                onChange={(newValue) => setSelectedDate(newValue)}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status Filter</InputLabel>
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  label="Status Filter"
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="scheduled">Scheduled</MenuItem>
                  <MenuItem value="confirmed">Confirmed</MenuItem>
                  <MenuItem value="in-progress">In Progress</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<Add />}
                onClick={handleAddAppointment}
              >
                New Appointment
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Appointments Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Time</TableCell>
              <TableCell>Patient</TableCell>
              <TableCell>Provider</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Insurance</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAppointments.map((appointment) => (
              <TableRow key={appointment.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AccessTime fontSize="small" color="action" />
                    <Typography variant="body2" fontWeight="500">
                      {appointment.time}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight="500">
                      {appointment.patientName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ID: {appointment.patientId}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>{appointment.provider}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {getTypeIcon(appointment.type)}
                    <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                      {appointment.type}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>{appointment.reason}</TableCell>
                <TableCell>{appointment.duration} min</TableCell>
                <TableCell>
                  <Chip
                    label={appointment.status}
                    color={getStatusColor(appointment.status) as any}
                    size="small"
                    sx={{ textTransform: 'capitalize' }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="caption">
                    {appointment.insurance || 'N/A'}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, appointment)}
                  >
                    <MoreVert />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEditAppointment}>
          <Edit fontSize="small" sx={{ mr: 1 }} /> Edit
        </MenuItem>
        <MenuItem onClick={() => console.log('Check in')}>
          <CheckCircle fontSize="small" sx={{ mr: 1 }} /> Check In
        </MenuItem>
        <MenuItem onClick={() => console.log('Reschedule')}>
          <Schedule fontSize="small" sx={{ mr: 1 }} /> Reschedule
        </MenuItem>
        <MenuItem onClick={handleDeleteAppointment} sx={{ color: 'error.main' }}>
          <Delete fontSize="small" sx={{ mr: 1 }} /> Cancel
        </MenuItem>
      </Menu>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogMode === 'add' ? 'Schedule New Appointment' : 'Edit Appointment'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Patient Name"
                defaultValue={selectedAppointment?.patientName}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Provider"
                defaultValue={selectedAppointment?.provider}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <DatePicker
                label="Date"
                value={selectedDate}
                onChange={(newValue) => setSelectedDate(newValue)}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TimePicker
                label="Time"
                value={null}
                onChange={() => {}}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Appointment Type</InputLabel>
                <Select
                  defaultValue={selectedAppointment?.type || 'consultation'}
                  label="Appointment Type"
                >
                  <MenuItem value="consultation">Consultation</MenuItem>
                  <MenuItem value="follow-up">Follow-up</MenuItem>
                  <MenuItem value="procedure">Procedure</MenuItem>
                  <MenuItem value="emergency">Emergency</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Duration (minutes)"
                type="number"
                defaultValue={selectedAppointment?.duration || 30}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Reason for Visit"
                multiline
                rows={2}
                defaultValue={selectedAppointment?.reason}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes (Optional)"
                multiline
                rows={2}
                defaultValue={selectedAppointment?.notes}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setOpenDialog(false)}>
            {dialogMode === 'add' ? 'Schedule' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Appointments;