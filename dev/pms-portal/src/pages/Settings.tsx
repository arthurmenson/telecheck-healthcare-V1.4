import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
  Switch,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Divider,
  Alert,
  IconButton,
  Chip,
  Paper,
  Stack,
} from '@mui/material';
import {
  Business,
  Security,
  Notifications,
  Payment,
  Integration,
  People,
  LocalHospital,
  Email,
  Phone,
  LocationOn,
  Schedule,
  Language,
  Palette,
  Save,
  Cancel,
  Add,
  Edit,
  Delete,
  CloudUpload,
  CheckCircle,
  Warning,
  Key,
  Lock,
  Shield,
  CreditCard,
  Receipt,
  Api,
} from '@mui/icons-material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const Settings: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [hasChanges, setHasChanges] = useState(false);

  // Settings state
  const [practiceSettings, setPracticeSettings] = useState({
    practiceName: 'Springfield Medical Center',
    taxId: '12-3456789',
    npi: '1234567890',
    address: '123 Main St',
    city: 'Springfield',
    state: 'IL',
    zipCode: '62701',
    phone: '(555) 123-4567',
    fax: '(555) 123-4568',
    email: 'admin@springfieldmed.com',
    website: 'www.springfieldmed.com',
  });

  const [billingSettings, setBillingSettings] = useState({
    statementFrequency: 'monthly',
    paymentTerms: '30',
    lateFeePercentage: '1.5',
    acceptCreditCards: true,
    acceptACH: true,
    acceptCash: true,
    acceptChecks: true,
  });

  const [notificationSettings, setNotificationSettings] = useState({
    appointmentReminders: true,
    reminderTiming: '24',
    paymentReminders: true,
    labResults: true,
    marketingEmails: false,
    smsNotifications: true,
    emailNotifications: true,
  });

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: true,
    sessionTimeout: '30',
    passwordExpiry: '90',
    minPasswordLength: '8',
    requireSpecialChars: true,
    requireNumbers: true,
    loginAttempts: '5',
    ipWhitelist: false,
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleSave = () => {
    // Save settings
    console.log('Saving settings...');
    setHasChanges(false);
  };

  const handleCancel = () => {
    // Reset changes
    setHasChanges(false);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Configure practice settings and preferences
        </Typography>
      </Box>

      {/* Unsaved Changes Alert */}
      {hasChanges && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          You have unsaved changes. Please save or discard your changes before leaving this page.
        </Alert>
      )}

      {/* Settings Navigation */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2 }}>
            <List>
              <ListItem button selected={currentTab === 0} onClick={() => setCurrentTab(0)}>
                <ListItemIcon>
                  <Business />
                </ListItemIcon>
                <ListItemText primary="Practice Info" />
              </ListItem>
              <ListItem button selected={currentTab === 1} onClick={() => setCurrentTab(1)}>
                <ListItemIcon>
                  <Payment />
                </ListItemIcon>
                <ListItemText primary="Billing" />
              </ListItem>
              <ListItem button selected={currentTab === 2} onClick={() => setCurrentTab(2)}>
                <ListItemIcon>
                  <Notifications />
                </ListItemIcon>
                <ListItemText primary="Notifications" />
              </ListItem>
              <ListItem button selected={currentTab === 3} onClick={() => setCurrentTab(3)}>
                <ListItemIcon>
                  <Security />
                </ListItemIcon>
                <ListItemText primary="Security" />
              </ListItem>
              <ListItem button selected={currentTab === 4} onClick={() => setCurrentTab(4)}>
                <ListItemIcon>
                  <People />
                </ListItemIcon>
                <ListItemText primary="Users" />
              </ListItem>
              <ListItem button selected={currentTab === 5} onClick={() => setCurrentTab(5)}>
                <ListItemIcon>
                  <Integration />
                </ListItemIcon>
                <ListItemText primary="Integrations" />
              </ListItem>
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={9}>
          {/* Practice Information */}
          {currentTab === 0 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Practice Information
                </Typography>
                <Divider sx={{ mb: 3 }} />
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Practice Name"
                      value={practiceSettings.practiceName}
                      onChange={(e) => {
                        setPracticeSettings({ ...practiceSettings, practiceName: e.target.value });
                        setHasChanges(true);
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Tax ID"
                      value={practiceSettings.taxId}
                      onChange={(e) => {
                        setPracticeSettings({ ...practiceSettings, taxId: e.target.value });
                        setHasChanges(true);
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="NPI Number"
                      value={practiceSettings.npi}
                      onChange={(e) => {
                        setPracticeSettings({ ...practiceSettings, npi: e.target.value });
                        setHasChanges(true);
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Phone"
                      value={practiceSettings.phone}
                      onChange={(e) => {
                        setPracticeSettings({ ...practiceSettings, phone: e.target.value });
                        setHasChanges(true);
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Address"
                      value={practiceSettings.address}
                      onChange={(e) => {
                        setPracticeSettings({ ...practiceSettings, address: e.target.value });
                        setHasChanges(true);
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="City"
                      value={practiceSettings.city}
                      onChange={(e) => {
                        setPracticeSettings({ ...practiceSettings, city: e.target.value });
                        setHasChanges(true);
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="State"
                      value={practiceSettings.state}
                      onChange={(e) => {
                        setPracticeSettings({ ...practiceSettings, state: e.target.value });
                        setHasChanges(true);
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Zip Code"
                      value={practiceSettings.zipCode}
                      onChange={(e) => {
                        setPracticeSettings({ ...practiceSettings, zipCode: e.target.value });
                        setHasChanges(true);
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Email"
                      type="email"
                      value={practiceSettings.email}
                      onChange={(e) => {
                        setPracticeSettings({ ...practiceSettings, email: e.target.value });
                        setHasChanges(true);
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Website"
                      value={practiceSettings.website}
                      onChange={(e) => {
                        setPracticeSettings({ ...practiceSettings, website: e.target.value });
                        setHasChanges(true);
                      }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* Billing Settings */}
          {currentTab === 1 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Billing & Payment Settings
                </Typography>
                <Divider sx={{ mb: 3 }} />
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Statement Frequency</InputLabel>
                      <Select
                        value={billingSettings.statementFrequency}
                        onChange={(e) => {
                          setBillingSettings({ ...billingSettings, statementFrequency: e.target.value });
                          setHasChanges(true);
                        }}
                        label="Statement Frequency"
                      >
                        <MenuItem value="weekly">Weekly</MenuItem>
                        <MenuItem value="biweekly">Bi-weekly</MenuItem>
                        <MenuItem value="monthly">Monthly</MenuItem>
                        <MenuItem value="quarterly">Quarterly</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Payment Terms (days)"
                      value={billingSettings.paymentTerms}
                      onChange={(e) => {
                        setBillingSettings({ ...billingSettings, paymentTerms: e.target.value });
                        setHasChanges(true);
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Late Fee Percentage"
                      value={billingSettings.lateFeePercentage}
                      onChange={(e) => {
                        setBillingSettings({ ...billingSettings, lateFeePercentage: e.target.value });
                        setHasChanges(true);
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" gutterBottom>
                      Accepted Payment Methods
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6} md={3}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={billingSettings.acceptCreditCards}
                              onChange={(e) => {
                                setBillingSettings({ ...billingSettings, acceptCreditCards: e.target.checked });
                                setHasChanges(true);
                              }}
                            />
                          }
                          label="Credit Cards"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={billingSettings.acceptACH}
                              onChange={(e) => {
                                setBillingSettings({ ...billingSettings, acceptACH: e.target.checked });
                                setHasChanges(true);
                              }}
                            />
                          }
                          label="ACH Transfer"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={billingSettings.acceptCash}
                              onChange={(e) => {
                                setBillingSettings({ ...billingSettings, acceptCash: e.target.checked });
                                setHasChanges(true);
                              }}
                            />
                          }
                          label="Cash"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={billingSettings.acceptChecks}
                              onChange={(e) => {
                                setBillingSettings({ ...billingSettings, acceptChecks: e.target.checked });
                                setHasChanges(true);
                              }}
                            />
                          }
                          label="Checks"
                        />
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* Notification Settings */}
          {currentTab === 2 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Notification Preferences
                </Typography>
                <Divider sx={{ mb: 3 }} />
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={notificationSettings.appointmentReminders}
                          onChange={(e) => {
                            setNotificationSettings({ ...notificationSettings, appointmentReminders: e.target.checked });
                            setHasChanges(true);
                          }}
                        />
                      }
                      label="Send appointment reminders"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Reminder timing (hours before)"
                      value={notificationSettings.reminderTiming}
                      disabled={!notificationSettings.appointmentReminders}
                      onChange={(e) => {
                        setNotificationSettings({ ...notificationSettings, reminderTiming: e.target.value });
                        setHasChanges(true);
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={notificationSettings.paymentReminders}
                          onChange={(e) => {
                            setNotificationSettings({ ...notificationSettings, paymentReminders: e.target.checked });
                            setHasChanges(true);
                          }}
                        />
                      }
                      label="Send payment reminders"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={notificationSettings.labResults}
                          onChange={(e) => {
                            setNotificationSettings({ ...notificationSettings, labResults: e.target.checked });
                            setHasChanges(true);
                          }}
                        />
                      }
                      label="Lab result notifications"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={notificationSettings.marketingEmails}
                          onChange={(e) => {
                            setNotificationSettings({ ...notificationSettings, marketingEmails: e.target.checked });
                            setHasChanges(true);
                          }}
                        />
                      }
                      label="Marketing communications"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" gutterBottom>
                      Notification Channels
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={notificationSettings.emailNotifications}
                              onChange={(e) => {
                                setNotificationSettings({ ...notificationSettings, emailNotifications: e.target.checked });
                                setHasChanges(true);
                              }}
                            />
                          }
                          label="Email notifications"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={notificationSettings.smsNotifications}
                              onChange={(e) => {
                                setNotificationSettings({ ...notificationSettings, smsNotifications: e.target.checked });
                                setHasChanges(true);
                              }}
                            />
                          }
                          label="SMS notifications"
                        />
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* Security Settings */}
          {currentTab === 3 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Security Settings
                </Typography>
                <Divider sx={{ mb: 3 }} />
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={securitySettings.twoFactorAuth}
                          onChange={(e) => {
                            setSecuritySettings({ ...securitySettings, twoFactorAuth: e.target.checked });
                            setHasChanges(true);
                          }}
                        />
                      }
                      label="Require two-factor authentication"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Session timeout (minutes)"
                      value={securitySettings.sessionTimeout}
                      onChange={(e) => {
                        setSecuritySettings({ ...securitySettings, sessionTimeout: e.target.value });
                        setHasChanges(true);
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Password expiry (days)"
                      value={securitySettings.passwordExpiry}
                      onChange={(e) => {
                        setSecuritySettings({ ...securitySettings, passwordExpiry: e.target.value });
                        setHasChanges(true);
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Minimum password length"
                      value={securitySettings.minPasswordLength}
                      onChange={(e) => {
                        setSecuritySettings({ ...securitySettings, minPasswordLength: e.target.value });
                        setHasChanges(true);
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Max login attempts"
                      value={securitySettings.loginAttempts}
                      onChange={(e) => {
                        setSecuritySettings({ ...securitySettings, loginAttempts: e.target.value });
                        setHasChanges(true);
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" gutterBottom>
                      Password Requirements
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={securitySettings.requireSpecialChars}
                              onChange={(e) => {
                                setSecuritySettings({ ...securitySettings, requireSpecialChars: e.target.checked });
                                setHasChanges(true);
                              }}
                            />
                          }
                          label="Require special characters"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={securitySettings.requireNumbers}
                              onChange={(e) => {
                                setSecuritySettings({ ...securitySettings, requireNumbers: e.target.checked });
                                setHasChanges(true);
                              }}
                            />
                          }
                          label="Require numbers"
                        />
                      </Grid>
                    </Grid>
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={securitySettings.ipWhitelist}
                          onChange={(e) => {
                            setSecuritySettings({ ...securitySettings, ipWhitelist: e.target.checked });
                            setHasChanges(true);
                          }}
                        />
                      }
                      label="Enable IP whitelist"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* User Management */}
          {currentTab === 4 && (
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6">User Management</Typography>
                  <Button variant="contained" startIcon={<Add />}>
                    Add User
                  </Button>
                </Box>
                <Divider sx={{ mb: 3 }} />
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <Shield color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Admin User"
                      secondary="admin@springfieldmed.com • Full Access"
                    />
                    <ListItemSecondaryAction>
                      <Chip label="Admin" color="primary" size="small" sx={{ mr: 1 }} />
                      <IconButton edge="end" size="small">
                        <Edit />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider variant="inset" component="li" />
                  <ListItem>
                    <ListItemIcon>
                      <LocalHospital color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Dr. Sarah Johnson"
                      secondary="sarah.johnson@springfieldmed.com • Provider Access"
                    />
                    <ListItemSecondaryAction>
                      <Chip label="Provider" color="success" size="small" sx={{ mr: 1 }} />
                      <IconButton edge="end" size="small">
                        <Edit />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider variant="inset" component="li" />
                  <ListItem>
                    <ListItemIcon>
                      <People />
                    </ListItemIcon>
                    <ListItemText
                      primary="Jane Smith"
                      secondary="jane.smith@springfieldmed.com • Staff Access"
                    />
                    <ListItemSecondaryAction>
                      <Chip label="Staff" color="default" size="small" sx={{ mr: 1 }} />
                      <IconButton edge="end" size="small">
                        <Edit />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          )}

          {/* Integrations */}
          {currentTab === 5 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Integrations
                </Typography>
                <Divider sx={{ mb: 3 }} />
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Api color="primary" sx={{ mr: 2 }} />
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="subtitle1">EHR Integration</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Epic MyChart
                          </Typography>
                        </Box>
                        <Chip label="Connected" color="success" size="small" />
                      </Box>
                      <Button variant="outlined" size="small">
                        Configure
                      </Button>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Receipt color="primary" sx={{ mr: 2 }} />
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="subtitle1">Billing System</Typography>
                          <Typography variant="body2" color="text.secondary">
                            QuickBooks
                          </Typography>
                        </Box>
                        <Chip label="Connected" color="success" size="small" />
                      </Box>
                      <Button variant="outlined" size="small">
                        Configure
                      </Button>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <CreditCard color="primary" sx={{ mr: 2 }} />
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="subtitle1">Payment Gateway</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Stripe
                          </Typography>
                        </Box>
                        <Chip label="Connected" color="success" size="small" />
                      </Box>
                      <Button variant="outlined" size="small">
                        Configure
                      </Button>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Email color="action" sx={{ mr: 2 }} />
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="subtitle1">Email Service</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Not configured
                          </Typography>
                        </Box>
                        <Chip label="Disconnected" color="default" size="small" />
                      </Box>
                      <Button variant="contained" size="small">
                        Connect
                      </Button>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* Save/Cancel Buttons */}
          {hasChanges && (
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button variant="outlined" startIcon={<Cancel />} onClick={handleCancel}>
                Cancel
              </Button>
              <Button variant="contained" startIcon={<Save />} onClick={handleSave}>
                Save Changes
              </Button>
            </Box>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default Settings;