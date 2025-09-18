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
  LinearProgress,
} from '@mui/material';
import {
  Add,
  Search,
  FilterList,
  Edit,
  Delete,
  MoreVert,
  Receipt,
  AttachMoney,
  TrendingUp,
  Warning,
  CheckCircle,
  Cancel,
  Schedule,
  Send,
  Download,
  Print,
  Assessment,
  AccountBalance,
  CreditCard,
  LocalAtm,
  PendingActions,
  ErrorOutline,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs, { Dayjs } from 'dayjs';

interface Claim {
  id: string;
  claimNumber: string;
  patientName: string;
  patientId: string;
  provider: string;
  dateOfService: string;
  dateSubmitted: string;
  amount: number;
  insurance: string;
  status: 'pending' | 'submitted' | 'approved' | 'rejected' | 'paid' | 'appealing';
  type: 'professional' | 'institutional' | 'dental' | 'vision';
  diagnosis: string;
  procedures: string[];
  notes?: string;
  denialReason?: string;
}

interface Payment {
  id: string;
  paymentNumber: string;
  patientName: string;
  date: string;
  amount: number;
  method: 'credit' | 'debit' | 'cash' | 'check' | 'insurance';
  status: 'completed' | 'pending' | 'failed';
  reference: string;
}

const Billing: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDateRange, setSelectedDateRange] = useState<[Dayjs | null, Dayjs | null]>([
    dayjs().startOf('month'),
    dayjs(),
  ]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'claim' | 'payment'>('claim');

  // Mock data
  const claims: Claim[] = [
    {
      id: '1',
      claimNumber: 'CLM-2024-001',
      patientName: 'John Smith',
      patientId: 'P001',
      provider: 'Dr. Sarah Johnson',
      dateOfService: '2024-01-10',
      dateSubmitted: '2024-01-12',
      amount: 1250.00,
      insurance: 'Blue Cross Blue Shield',
      status: 'approved',
      type: 'professional',
      diagnosis: 'Hypertension',
      procedures: ['99213', '80053'],
    },
    {
      id: '2',
      claimNumber: 'CLM-2024-002',
      patientName: 'Emma Wilson',
      patientId: 'P002',
      provider: 'Dr. Michael Chen',
      dateOfService: '2024-01-11',
      dateSubmitted: '2024-01-13',
      amount: 2500.00,
      insurance: 'Aetna',
      status: 'pending',
      type: 'professional',
      diagnosis: 'Post-surgical follow-up',
      procedures: ['99214', '97110'],
    },
    {
      id: '3',
      claimNumber: 'CLM-2024-003',
      patientName: 'Robert Davis',
      patientId: 'P003',
      provider: 'Dr. Sarah Johnson',
      dateOfService: '2024-01-12',
      dateSubmitted: '2024-01-14',
      amount: 850.00,
      insurance: 'UnitedHealth',
      status: 'rejected',
      type: 'professional',
      diagnosis: 'Diabetes Type 2',
      procedures: ['99213', '82947'],
      denialReason: 'Prior authorization required',
    },
    {
      id: '4',
      claimNumber: 'CLM-2024-004',
      patientName: 'Lisa Martinez',
      patientId: 'P004',
      provider: 'Dr. Emily Brown',
      dateOfService: '2024-01-14',
      dateSubmitted: '2024-01-15',
      amount: 3200.00,
      insurance: 'Cigna',
      status: 'paid',
      type: 'institutional',
      diagnosis: 'Minor procedure',
      procedures: ['10060', '99203'],
    },
  ];

  const payments: Payment[] = [
    {
      id: '1',
      paymentNumber: 'PAY-2024-001',
      patientName: 'John Smith',
      date: '2024-01-18',
      amount: 250.00,
      method: 'credit',
      status: 'completed',
      reference: 'stripe_ch_1234567890',
    },
    {
      id: '2',
      paymentNumber: 'PAY-2024-002',
      patientName: 'Emma Wilson',
      date: '2024-01-18',
      amount: 150.00,
      method: 'insurance',
      status: 'pending',
      reference: 'BCBS-2024-001',
    },
    {
      id: '3',
      paymentNumber: 'PAY-2024-003',
      patientName: 'Robert Davis',
      date: '2024-01-17',
      amount: 75.00,
      method: 'cash',
      status: 'completed',
      reference: 'CASH-001',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'paid':
      case 'completed':
        return 'success';
      case 'submitted':
      case 'pending':
        return 'warning';
      case 'rejected':
      case 'failed':
        return 'error';
      case 'appealing':
        return 'info';
      default:
        return 'default';
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'credit':
      case 'debit':
        return <CreditCard fontSize="small" />;
      case 'cash':
        return <LocalAtm fontSize="small" />;
      case 'check':
        return <AccountBalance fontSize="small" />;
      case 'insurance':
        return <Receipt fontSize="small" />;
      default:
        return <AttachMoney fontSize="small" />;
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, claim: Claim) => {
    setAnchorEl(event.currentTarget);
    setSelectedClaim(claim);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedClaim(null);
  };

  const handleNewClaim = () => {
    setDialogMode('claim');
    setOpenDialog(true);
  };

  const handleNewPayment = () => {
    setDialogMode('payment');
    setOpenDialog(true);
  };

  const stats = {
    totalClaims: claims.length,
    pendingClaims: claims.filter(c => c.status === 'pending').length,
    approvedClaims: claims.filter(c => c.status === 'approved').length,
    rejectedClaims: claims.filter(c => c.status === 'rejected').length,
    totalRevenue: payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0),
    pendingRevenue: claims.filter(c => c.status === 'pending' || c.status === 'submitted').reduce((sum, c) => sum + c.amount, 0),
    collectionRate: 0.92, // 92%
    avgDaysToPayment: 28,
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Billing & Claims Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage claims, payments, and revenue cycle
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
                    Total Revenue
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="success.main">
                    ${stats.totalRevenue.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    This month
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.light', color: 'success.main' }}>
                  <TrendingUp />
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
                    Pending Claims
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="warning.main">
                    {stats.pendingClaims}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ${stats.pendingRevenue.toLocaleString()} pending
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.light', color: 'warning.main' }}>
                  <PendingActions />
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
                    Collection Rate
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="info.main">
                    {(stats.collectionRate * 100).toFixed(0)}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Above industry avg
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'info.light', color: 'info.main' }}>
                  <Assessment />
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
                    Avg Days to Payment
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.avgDaysToPayment}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Industry: 45 days
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'grey.300', color: 'grey.700' }}>
                  <Schedule />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs for Claims and Payments */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={currentTab} onChange={(e, v) => setCurrentTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label={`Claims (${claims.length})`} />
          <Tab label={`Payments (${payments.length})`} />
          <Tab label="Reports" />
          <Tab label="Denials" />
        </Tabs>
      </Paper>

      {/* Claims Tab */}
      {currentTab === 0 && (
        <>
          {/* Filters and Actions */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    placeholder="Search claims..."
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
                      <MenuItem value="pending">Pending</MenuItem>
                      <MenuItem value="submitted">Submitted</MenuItem>
                      <MenuItem value="approved">Approved</MenuItem>
                      <MenuItem value="rejected">Rejected</MenuItem>
                      <MenuItem value="paid">Paid</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <DatePicker
                    label="Date Range"
                    value={selectedDateRange[0]}
                    onChange={(newValue) => setSelectedDateRange([newValue, selectedDateRange[1]])}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<Add />}
                    onClick={handleNewClaim}
                  >
                    New Claim
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Claims Table */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Claim #</TableCell>
                  <TableCell>Patient</TableCell>
                  <TableCell>Provider</TableCell>
                  <TableCell>Service Date</TableCell>
                  <TableCell>Insurance</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Diagnosis</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {claims.map((claim) => (
                  <TableRow key={claim.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="500">
                        {claim.claimNumber}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="500">
                          {claim.patientName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ID: {claim.patientId}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{claim.provider}</TableCell>
                    <TableCell>{claim.dateOfService}</TableCell>
                    <TableCell>{claim.insurance}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="500">
                        ${claim.amount.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={claim.status}
                        color={getStatusColor(claim.status) as any}
                        size="small"
                        sx={{ textTransform: 'capitalize' }}
                        icon={claim.status === 'rejected' ? <ErrorOutline /> : undefined}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {claim.diagnosis}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <IconButton size="small">
                          <Edit />
                        </IconButton>
                        <IconButton size="small">
                          <Send />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, claim)}
                        >
                          <MoreVert />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* Payments Tab */}
      {currentTab === 1 && (
        <>
          {/* Payment Actions */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    placeholder="Search payments..."
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
                <Grid item xs={12} md={4}>
                  <DatePicker
                    label="Payment Date"
                    value={selectedDateRange[0]}
                    onChange={(newValue) => setSelectedDateRange([newValue, selectedDateRange[1]])}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<Add />}
                    onClick={handleNewPayment}
                  >
                    Record Payment
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Payments Table */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Payment #</TableCell>
                  <TableCell>Patient</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Method</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Reference</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="500">
                        {payment.paymentNumber}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="500">
                        {payment.patientName}
                      </Typography>
                    </TableCell>
                    <TableCell>{payment.date}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="500" color="success.main">
                        ${payment.amount.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getPaymentMethodIcon(payment.method)}
                        <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                          {payment.method}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={payment.status}
                        color={getStatusColor(payment.status) as any}
                        size="small"
                        sx={{ textTransform: 'capitalize' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {payment.reference}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <IconButton size="small">
                          <Print />
                        </IconButton>
                        <IconButton size="small">
                          <Download />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* Reports Tab */}
      {currentTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Revenue Trends
                </Typography>
                <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography color="text.secondary">Chart placeholder</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Claims by Status
                </Typography>
                <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography color="text.secondary">Chart placeholder</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Denials Tab */}
      {currentTab === 3 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Denial Management
            </Typography>
            <Typography color="text.secondary">
              Track and manage claim denials, appeals, and resubmissions
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleMenuClose}>
          <Edit fontSize="small" sx={{ mr: 1 }} /> Edit Claim
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <Send fontSize="small" sx={{ mr: 1 }} /> Submit
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <Print fontSize="small" sx={{ mr: 1 }} /> Print
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <Download fontSize="small" sx={{ mr: 1 }} /> Download
        </MenuItem>
        {selectedClaim?.status === 'rejected' && (
          <MenuItem onClick={handleMenuClose}>
            <Schedule fontSize="small" sx={{ mr: 1 }} /> Appeal
          </MenuItem>
        )}
        <MenuItem onClick={handleMenuClose} sx={{ color: 'error.main' }}>
          <Delete fontSize="small" sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default Billing;