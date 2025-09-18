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
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Divider,
  Alert,
} from '@mui/material';
import {
  Add,
  Search,
  FilterList,
  Edit,
  Delete,
  MoreVert,
  Person,
  Email,
  Phone,
  LocationOn,
  CalendarToday,
  LocalHospital,
  Assignment,
  Favorite,
  Groups,
  PersonAdd,
  Download,
  Upload,
  Print,
  History,
  Warning,
  CheckCircle,
  MedicalServices,
  HealthAndSafety,
  Medication,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs, { Dayjs } from 'dayjs';

interface Patient {
  id: string;
  mrn: string; // Medical Record Number
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  insurance: {
    provider: string;
    policyNumber: string;
    groupNumber: string;
  };
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  status: 'active' | 'inactive' | 'deceased';
  lastVisit: string;
  nextAppointment?: string;
  conditions: string[];
  medications: string[];
  allergies: string[];
  registrationDate: string;
}

const Patients: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit' | 'view'>('add');

  // Mock data
  const patients: Patient[] = [
    {
      id: '1',
      mrn: 'MRN001',
      firstName: 'John',
      lastName: 'Smith',
      dateOfBirth: '1965-03-15',
      gender: 'male',
      email: 'john.smith@email.com',
      phone: '(555) 123-4567',
      address: '123 Main St',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62701',
      insurance: {
        provider: 'Blue Cross Blue Shield',
        policyNumber: 'BCBS123456',
        groupNumber: 'GRP001',
      },
      emergencyContact: {
        name: 'Jane Smith',
        relationship: 'Spouse',
        phone: '(555) 123-4568',
      },
      status: 'active',
      lastVisit: '2024-01-10',
      nextAppointment: '2024-02-15',
      conditions: ['Hypertension', 'Type 2 Diabetes'],
      medications: ['Metformin', 'Lisinopril'],
      allergies: ['Penicillin'],
      registrationDate: '2020-01-15',
    },
    {
      id: '2',
      mrn: 'MRN002',
      firstName: 'Emma',
      lastName: 'Wilson',
      dateOfBirth: '1978-07-22',
      gender: 'female',
      email: 'emma.wilson@email.com',
      phone: '(555) 234-5678',
      address: '456 Oak Ave',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60601',
      insurance: {
        provider: 'Aetna',
        policyNumber: 'AET789012',
        groupNumber: 'GRP002',
      },
      emergencyContact: {
        name: 'Michael Wilson',
        relationship: 'Spouse',
        phone: '(555) 234-5679',
      },
      status: 'active',
      lastVisit: '2024-01-12',
      conditions: ['Asthma', 'Seasonal Allergies'],
      medications: ['Albuterol', 'Cetirizine'],
      allergies: ['Shellfish'],
      registrationDate: '2019-05-20',
    },
    {
      id: '3',
      mrn: 'MRN003',
      firstName: 'Robert',
      lastName: 'Davis',
      dateOfBirth: '1952-11-30',
      gender: 'male',
      email: 'robert.davis@email.com',
      phone: '(555) 345-6789',
      address: '789 Pine St',
      city: 'Peoria',
      state: 'IL',
      zipCode: '61602',
      insurance: {
        provider: 'UnitedHealth',
        policyNumber: 'UHC345678',
        groupNumber: 'GRP003',
      },
      emergencyContact: {
        name: 'Sarah Davis',
        relationship: 'Daughter',
        phone: '(555) 345-6790',
      },
      status: 'active',
      lastVisit: '2024-01-08',
      nextAppointment: '2024-01-25',
      conditions: ['Coronary Artery Disease', 'Hypertension', 'High Cholesterol'],
      medications: ['Atorvastatin', 'Metoprolol', 'Aspirin'],
      allergies: [],
      registrationDate: '2018-03-10',
    },
  ];

  const calculateAge = (dateOfBirth: string) => {
    const birthDate = dayjs(dateOfBirth);
    const today = dayjs();
    return today.diff(birthDate, 'year');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'warning';
      case 'deceased':
        return 'error';
      default:
        return 'default';
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, patient: Patient) => {
    setAnchorEl(event.currentTarget);
    setSelectedPatient(patient);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleAddPatient = () => {
    setDialogMode('add');
    setSelectedPatient(null);
    setOpenDialog(true);
  };

  const handleEditPatient = () => {
    setDialogMode('edit');
    setOpenDialog(true);
    handleMenuClose();
  };

  const handleViewPatient = () => {
    setDialogMode('view');
    setOpenDialog(true);
    handleMenuClose();
  };

  const filteredPatients = patients.filter(patient => {
    const matchesSearch =
      patient.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.mrn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || patient.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    totalPatients: patients.length,
    activePatients: patients.filter(p => p.status === 'active').length,
    newThisMonth: 12,
    appointmentsToday: patients.filter(p => p.nextAppointment === dayjs().format('YYYY-MM-DD')).length,
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Patient Registry
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage patient records and demographics
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
                    Total Patients
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.totalPatients}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main' }}>
                  <Groups />
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
                    Active Patients
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="success.main">
                    {stats.activePatients}
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
                    New This Month
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="info.main">
                    {stats.newThisMonth}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'info.light', color: 'info.main' }}>
                  <PersonAdd />
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
                    Appointments Today
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.appointmentsToday}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.light', color: 'warning.main' }}>
                  <CalendarToday />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={currentTab} onChange={(e, v) => setCurrentTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="All Patients" />
          <Tab label="Recent Visits" />
          <Tab label="Upcoming Appointments" />
          <Tab label="High Risk" />
        </Tabs>
      </Paper>

      {/* All Patients Tab */}
      {currentTab === 0 && (
        <>
          {/* Filters and Actions */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={5}>
                  <TextField
                    fullWidth
                    placeholder="Search by name, MRN, or email..."
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
                  <FormControl fullWidth>
                    <InputLabel>Status Filter</InputLabel>
                    <Select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      label="Status Filter"
                    >
                      <MenuItem value="all">All Status</MenuItem>
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="inactive">Inactive</MenuItem>
                      <MenuItem value="deceased">Deceased</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={2}>
                  <Button fullWidth variant="outlined" startIcon={<Upload />}>
                    Import
                  </Button>
                </Grid>
                <Grid item xs={12} md={2}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<Add />}
                    onClick={handleAddPatient}
                  >
                    New Patient
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Patients Table */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Patient</TableCell>
                  <TableCell>MRN</TableCell>
                  <TableCell>Age/DOB</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Insurance</TableCell>
                  <TableCell>Last Visit</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Conditions</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPatients.map((patient) => (
                  <TableRow key={patient.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'primary.light', width: 32, height: 32 }}>
                          {patient.firstName[0]}{patient.lastName[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="500">
                            {patient.firstName} {patient.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {patient.gender === 'male' ? 'M' : patient.gender === 'female' ? 'F' : 'O'}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="500">
                        {patient.mrn}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {calculateAge(patient.dateOfBirth)} yrs
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {patient.dateOfBirth}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Email fontSize="small" color="action" />
                          <Typography variant="caption">{patient.email}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Phone fontSize="small" color="action" />
                          <Typography variant="caption">{patient.phone}</Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {patient.insurance.provider}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        #{patient.insurance.policyNumber}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {patient.lastVisit}
                      </Typography>
                      {patient.nextAppointment && (
                        <Typography variant="caption" color="primary">
                          Next: {patient.nextAppointment}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={patient.status}
                        color={getStatusColor(patient.status) as any}
                        size="small"
                        sx={{ textTransform: 'capitalize' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ maxWidth: 200 }}>
                        {patient.conditions.slice(0, 2).map((condition, index) => (
                          <Chip
                            key={index}
                            label={condition}
                            size="small"
                            variant="outlined"
                            sx={{ m: 0.25, fontSize: '0.75rem' }}
                          />
                        ))}
                        {patient.conditions.length > 2 && (
                          <Typography variant="caption" color="text.secondary">
                            +{patient.conditions.length - 2} more
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, patient)}
                      >
                        <MoreVert />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* Recent Visits Tab */}
      {currentTab === 1 && (
        <List>
          {patients.map((patient) => (
            <React.Fragment key={patient.id}>
              <ListItem>
                <ListItemAvatar>
                  <Avatar>{patient.firstName[0]}{patient.lastName[0]}</Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={`${patient.firstName} ${patient.lastName}`}
                  secondary={`Last visit: ${patient.lastVisit} - ${patient.conditions[0] || 'General checkup'}`}
                />
                <ListItemSecondaryAction>
                  <Button size="small">View Details</Button>
                </ListItemSecondaryAction>
              </ListItem>
              <Divider variant="inset" component="li" />
            </React.Fragment>
          ))}
        </List>
      )}

      {/* Upcoming Appointments Tab */}
      {currentTab === 2 && (
        <List>
          {patients.filter(p => p.nextAppointment).map((patient) => (
            <React.Fragment key={patient.id}>
              <ListItem>
                <ListItemAvatar>
                  <Avatar>{patient.firstName[0]}{patient.lastName[0]}</Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={`${patient.firstName} ${patient.lastName}`}
                  secondary={`Appointment: ${patient.nextAppointment}`}
                />
                <ListItemSecondaryAction>
                  <Button size="small">Confirm</Button>
                </ListItemSecondaryAction>
              </ListItem>
              <Divider variant="inset" component="li" />
            </React.Fragment>
          ))}
        </List>
      )}

      {/* High Risk Tab */}
      {currentTab === 3 && (
        <Box>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Patients with multiple chronic conditions or requiring immediate attention
          </Alert>
          <List>
            {patients.filter(p => p.conditions.length > 2).map((patient) => (
              <React.Fragment key={patient.id}>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'warning.light' }}>
                      <Warning color="warning" />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={`${patient.firstName} ${patient.lastName}`}
                    secondary={
                      <Box>
                        <Typography variant="caption">
                          Conditions: {patient.conditions.join(', ')}
                        </Typography>
                        <br />
                        <Typography variant="caption" color="error">
                          Requires monitoring
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Button size="small" color="warning">Review</Button>
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider variant="inset" component="li" />
              </React.Fragment>
            ))}
          </List>
        </Box>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleViewPatient}>
          <Assignment fontSize="small" sx={{ mr: 1 }} /> View Details
        </MenuItem>
        <MenuItem onClick={handleEditPatient}>
          <Edit fontSize="small" sx={{ mr: 1 }} /> Edit Patient
        </MenuItem>
        <MenuItem onClick={() => console.log('Medical History')}>
          <History fontSize="small" sx={{ mr: 1 }} /> Medical History
        </MenuItem>
        <MenuItem onClick={() => console.log('Appointments')}>
          <CalendarToday fontSize="small" sx={{ mr: 1 }} /> Appointments
        </MenuItem>
        <MenuItem onClick={() => console.log('Print')}>
          <Print fontSize="small" sx={{ mr: 1 }} /> Print Record
        </MenuItem>
        <MenuItem onClick={() => console.log('Delete')} sx={{ color: 'error.main' }}>
          <Delete fontSize="small" sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>

      {/* Add/Edit/View Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogMode === 'add' ? 'Add New Patient' : dialogMode === 'edit' ? 'Edit Patient' : 'Patient Details'}
        </DialogTitle>
        <DialogContent>
          {dialogMode === 'view' && selectedPatient ? (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="h6">
                    {selectedPatient.firstName} {selectedPatient.lastName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    MRN: {selectedPatient.mrn}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Demographics</Typography>
                  <Typography variant="body2">DOB: {selectedPatient.dateOfBirth}</Typography>
                  <Typography variant="body2">Gender: {selectedPatient.gender}</Typography>
                  <Typography variant="body2">Email: {selectedPatient.email}</Typography>
                  <Typography variant="body2">Phone: {selectedPatient.phone}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Insurance</Typography>
                  <Typography variant="body2">{selectedPatient.insurance.provider}</Typography>
                  <Typography variant="body2">Policy: {selectedPatient.insurance.policyNumber}</Typography>
                  <Typography variant="body2">Group: {selectedPatient.insurance.groupNumber}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>Medical Information</Typography>
                  <Typography variant="body2">Conditions: {selectedPatient.conditions.join(', ')}</Typography>
                  <Typography variant="body2">Medications: {selectedPatient.medications.join(', ')}</Typography>
                  <Typography variant="body2">Allergies: {selectedPatient.allergies.join(', ') || 'None'}</Typography>
                </Grid>
              </Grid>
            </Box>
          ) : (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  defaultValue={selectedPatient?.firstName}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  defaultValue={selectedPatient?.lastName}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <DatePicker
                  label="Date of Birth"
                  value={selectedPatient?.dateOfBirth ? dayjs(selectedPatient.dateOfBirth) : null}
                  onChange={() => {}}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Gender</InputLabel>
                  <Select
                    defaultValue={selectedPatient?.gender || 'male'}
                    label="Gender"
                  >
                    <MenuItem value="male">Male</MenuItem>
                    <MenuItem value="female">Female</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  defaultValue={selectedPatient?.email}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  defaultValue={selectedPatient?.phone}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address"
                  defaultValue={selectedPatient?.address}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="City"
                  defaultValue={selectedPatient?.city}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="State"
                  defaultValue={selectedPatient?.state}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Zip Code"
                  defaultValue={selectedPatient?.zipCode}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          {dialogMode !== 'view' && (
            <Button variant="contained" onClick={() => setOpenDialog(false)}>
              {dialogMode === 'add' ? 'Add Patient' : 'Update'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Patients;